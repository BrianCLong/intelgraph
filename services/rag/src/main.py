"""
IntelGraph RAG (Retrieval-Augmented Generation) Service
AI Copilot backend with context retrieval and citation

MIT License
Copyright (c) 2025 IntelGraph
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union, Tuple
import numpy as np
import pandas as pd
from datetime import datetime
import logging
import asyncio
import redis.asyncio as redis
import asyncpg
import openai
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import tiktoken
import re
import json
import os
from contextlib import asynccontextmanager
import hashlib
import uuid
from neo4j import AsyncGraphDatabase
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global models and connections
embedding_model = None
redis_client = None
postgres_pool = None
chroma_client = None
collection = None
openai_client = None
neo4j_driver = None

DANGEROUS_KEYWORDS = {"DELETE", "REMOVE", "SET", "CREATE", "MERGE", "DROP"}
MAX_SAFE_ROWS = 10000
MAX_SAFE_COST = 100000.0


def contains_dangerous_keyword(query: str) -> Optional[str]:
    """Return the first dangerous keyword found in the query, if any."""
    upper_cypher = query.upper()
    for keyword in DANGEROUS_KEYWORDS:
        if keyword in upper_cypher:
            return keyword
    return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global embedding_model, redis_client, postgres_pool, chroma_client, collection, openai_client, neo4j_driver
    
    # Startup
    logger.info("Starting RAG Service...")
    
    # Initialize OpenAI
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if openai.api_key:
        openai_client = openai.OpenAI(api_key=openai.api_key)
        logger.info("Initialized OpenAI client")
    else:
        logger.warning("OpenAI API key not provided")
    
    # Initialize sentence transformer
    try:
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Loaded sentence transformer model")
    except Exception as e:
        logger.error(f"Failed to load sentence transformer: {e}")
    
    # Initialize ChromaDB
    try:
        chroma_client = chromadb.PersistentClient(
            path=os.getenv("CHROMA_DB_PATH", "./chroma_db"),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Create or get collection
        collection = chroma_client.get_or_create_collection(
            name="intelgraph_knowledge",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Initialized ChromaDB with {collection.count()} documents")
        
    except Exception as e:
        logger.error(f"Failed to initialize ChromaDB: {e}")
    
    # Initialize Redis
    try:
        redis_client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
    
    # Initialize PostgreSQL
    try:
        postgres_pool = await asyncpg.create_pool(
            os.getenv("POSTGRES_URL", "postgresql://intelgraph:password@localhost/intelgraph"),
            min_size=5,
            max_size=20
        )
        logger.info("Connected to PostgreSQL")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")

    # Initialize Neo4j
    try:
        neo4j_driver = AsyncGraphDatabase.driver(
            os.getenv("NEO4J_URL", "neo4j://localhost:7687"),
            auth=(
                os.getenv("NEO4J_USER", "neo4j"),
                os.getenv("NEO4J_PASSWORD", "password"),
            ),
        )
        await neo4j_driver.verify_connectivity()
        logger.info("Connected to Neo4j")
    except Exception as e:
        logger.error(f"Failed to connect to Neo4j: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG Service...")
    if redis_client:
        await redis_client.close()
    if postgres_pool:
        await postgres_pool.close()
    if neo4j_driver:
        await neo4j_driver.close()

app = FastAPI(
    title="IntelGraph RAG Service",
    description="Retrieval-Augmented Generation for AI Copilot",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Document(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    source: str
    tenant_id: str
    created_at: datetime = Field(default_factory=datetime.now)

class Citation(BaseModel):
    document_id: str
    content: str
    relevance_score: float = Field(ge=0, le=1)
    source: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    tenant_id: str
    context_ids: List[str] = Field(default_factory=list)
    max_tokens: int = Field(default=150, ge=1, le=500)
    temperature: float = Field(default=0.7, ge=0, le=2)
    include_citations: bool = True
    max_citations: int = Field(default=5, ge=1, le=10)

class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    processing_time: float
    tokens_used: int
    model_used: str

class IndexRequest(BaseModel):
    documents: List[Document]
    batch_size: int = Field(default=100, ge=1, le=1000)

class IndexResponse(BaseModel):
    indexed_count: int
    failed_count: int
    processing_time: float
    errors: List[str] = Field(default_factory=list)

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    tenant_id: str
    limit: int = Field(default=10, ge=1, le=50)
    min_relevance: float = Field(default=0.3, ge=0, le=1)

class SearchResponse(BaseModel):
    results: List[Citation]
    query_processed: str
    processing_time: float

class AuthorityLevel(str, Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"


class CypherRequest(BaseModel):
    natural_language: str = Field(min_length=1, max_length=500)
    tenant_id: str
    authority: AuthorityLevel
    schema_context: Optional[Dict[str, Any]] = None
    sandbox: bool = False
    manual_cypher: Optional[str] = None

class CypherResponse(BaseModel):
    cypher_query: str
    explanation: str
    confidence: float = Field(ge=0, le=1)
    warnings: List[str] = Field(default_factory=list)
    estimated_rows: Optional[float] = None
    estimated_cost: Optional[float] = None
    sandbox_results: Optional[List[Dict[str, Any]]] = None
    diff_vs_manual: Optional[Dict[str, Any]] = None

# Utility functions
def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens in text using tiktoken"""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except Exception:
        # Fallback: approximate token count
        return len(text.split()) * 1.3

def chunk_text(text: str, max_chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks"""
    if len(text) <= max_chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + max_chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            sentence_end = text.rfind('.', start, end)
            if sentence_end > start:
                end = sentence_end + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

def extract_entities_from_text(text: str) -> List[str]:
    """Extract potential entity names from text"""
    # Simple regex-based entity extraction
    patterns = [
        r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Person names
        r'\b[A-Z][A-Z\s&]{2,}\b',        # Organizations
        r'\b(?:IP|ip):\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',  # IP addresses
        r'\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'  # Domains
    ]
    
    entities = set()
    for pattern in patterns:
        matches = re.findall(pattern, text)
        entities.update(matches)
    
    return list(entities)

async def get_document_embeddings(documents: List[str]) -> np.ndarray:
    """Generate embeddings for documents"""
    if not embedding_model:
        raise HTTPException(status_code=503, detail="Embedding model not available")
    
    try:
        embeddings = embedding_model.encode(documents)
        return embeddings
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate embeddings")

async def retrieve_relevant_documents(
    query: str, 
    tenant_id: str, 
    limit: int = 10,
    min_relevance: float = 0.3
) -> List[Citation]:
    """Retrieve relevant documents from vector database"""
    if not collection:
        return []
    
    try:
        # Generate query embedding
        query_embedding = embedding_model.encode([query])[0]
        
        # Search in ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=limit,
            where={"tenant_id": tenant_id},
            include=["documents", "metadatas", "distances"]
        )
        
        citations = []
        for i, (doc, metadata, distance) in enumerate(zip(
            results['documents'][0],
            results['metadatas'][0], 
            results['distances'][0]
        )):
            relevance = 1 - distance  # Convert distance to similarity
            
            if relevance >= min_relevance:
                citations.append(Citation(
                    document_id=metadata.get('document_id', f'doc_{i}'),
                    content=doc,
                    relevance_score=relevance,
                    source=metadata.get('source', 'unknown'),
                    metadata=metadata
                ))
        
        return citations
        
    except Exception as e:
        logger.error(f"Failed to retrieve documents: {e}")
        return []

async def generate_answer_with_context(
    query: str,
    citations: List[Citation],
    max_tokens: int = 150,
    temperature: float = 0.7
) -> tuple[str, int]:
    """Generate answer using OpenAI with retrieved context"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI client not available")
    
    # Build context from citations
    context_parts = []
    for i, citation in enumerate(citations[:5]):  # Use top 5 citations
        context_parts.append(f"[{i+1}] {citation.content[:500]}...")
    
    context = "\n\n".join(context_parts)
    
    # Build prompt
    system_prompt = """You are an intelligent assistant for IntelGraph, a graph-based intelligence analysis platform.
Answer questions based on the provided context. Always cite your sources using [number] format.
Be precise, factual, and acknowledge when information is uncertain or incomplete.
If the context doesn't contain relevant information, say so clearly."""
    
    user_prompt = f"""Context:
{context}

Question: {query}

Please provide a comprehensive answer based on the context above. Include citations [1], [2], etc. for specific facts."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=0.9
        )
        
        answer = response.choices[0].message.content.strip()
        tokens_used = response.usage.total_tokens
        
        return answer, tokens_used
        
    except Exception as e:
        logger.error(f"Failed to generate answer: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate answer")

async def generate_cypher_from_nl(
    natural_language: str,
    schema_context: Optional[Dict[str, Any]] = None
) -> tuple[str, str, float, List[str]]:
    """Generate Cypher query from natural language"""
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI client not available")
    
    warnings = []
    
    # Default Neo4j schema for IntelGraph
    default_schema = {
        "node_types": ["Entity", "Investigation", "User", "Source"],
        "relationship_types": ["RELATES_TO", "BELONGS_TO", "CREATED_BY", "SOURCES_FROM"],
        "entity_types": ["PERSON", "ORGANIZATION", "LOCATION", "EVENT", "DOCUMENT", "IP_ADDRESS", "DOMAIN"],
        "common_properties": ["id", "name", "type", "confidence", "tenantId", "createdAt"]
    }
    
    schema = schema_context or default_schema
    
    system_prompt = f"""You are an expert in converting natural language to Cypher queries for Neo4j.
The database schema includes:
- Node types: {schema.get('node_types', [])}
- Relationship types: {schema.get('relationship_types', [])}
- Entity types: {schema.get('entity_types', [])}
- Common properties: {schema.get('common_properties', [])}

Generate safe, read-only Cypher queries. Always include tenant isolation using tenantId.
Provide clear explanations and warn about potential performance issues."""

    user_prompt = f"""Convert this natural language query to Cypher:
"{natural_language}"

Requirements:
1. Generate a valid Cypher query
2. Include proper tenant isolation (WHERE tenantId = $tenantId)
3. Use appropriate LIMIT clauses for performance
4. Explain what the query does
5. Note any assumptions or limitations

Format your response as JSON:
{{
    "cypher": "MATCH ... RETURN ...",
    "explanation": "This query finds...",
    "confidence": 0.8,
    "warnings": ["Warning about..."]
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.1  # Low temperature for more consistent code generation
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Try to parse JSON response
        try:
            result_json = json.loads(result_text)
            cypher = result_json.get("cypher", "")
            explanation = result_json.get("explanation", "")
            confidence = result_json.get("confidence", 0.5)
            warnings = result_json.get("warnings", [])
        except json.JSONDecodeError:
            # Fallback: extract Cypher from text
            cypher_match = re.search(r'```cypher\n(.*?)\n```', result_text, re.DOTALL)
            if cypher_match:
                cypher = cypher_match.group(1).strip()
                explanation = "Generated from natural language query"
                confidence = 0.6
            else:
                cypher = result_text
                explanation = "Raw generated query"
                confidence = 0.4
            warnings.append("Could not parse structured response")
        
        # Validate Cypher query safety
        keyword = contains_dangerous_keyword(cypher)
        if keyword:
            warnings.append(f"Query contains potentially dangerous keyword: {keyword}")
            confidence = min(confidence, 0.3)
        
        return cypher, explanation, confidence, warnings
        
    except Exception as e:
        logger.error(f"Failed to generate Cypher: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate Cypher query")


async def estimate_cypher_cost(query: str, params: Dict[str, Any]) -> Tuple[Optional[float], Optional[float]]:
    """Estimate rows and cost for a Cypher query using Neo4j EXPLAIN"""
    if not neo4j_driver:
        return None, None
    try:
        async with neo4j_driver.session() as session:
            result = await session.run("EXPLAIN " + query, params)
            summary = await result.consume()
            plan = summary.plan
            if plan and hasattr(plan, "arguments"):
                rows = plan.arguments.get("EstimatedRows")
                cost = plan.arguments.get("EstimatedCost")
                return rows, cost
    except Exception as e:
        logger.warning(f"Cost estimation failed: {e}")
    return None, None


async def run_cypher_sandbox(query: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Execute a Cypher query in read-only mode and return results."""
    if not neo4j_driver:
        return []
    try:
        async with neo4j_driver.session(default_access_mode="READ") as session:
            result = await session.run(query, params)
            records = [record.data() for record in await result.to_list()]
            return records
    except Exception as e:
        logger.warning(f"Sandbox execution failed: {e}")
        return []


def diff_cypher_results(a: List[Dict[str, Any]], b: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute differences between two Cypher result sets."""
    set_a = {json.dumps(row, sort_keys=True) for row in a}
    set_b = {json.dumps(row, sort_keys=True) for row in b}
    extra = [json.loads(row) for row in sorted(set_a - set_b)]
    missing = [json.loads(row) for row in sorted(set_b - set_a)]
    return {"extra": extra, "missing": missing}

# Dependencies
async def get_db():
    if not postgres_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    return postgres_pool

async def get_redis():
    if not redis_client:
        raise HTTPException(status_code=503, detail="Cache not available")
    return redis_client

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "rag",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "services_available": {
            "embedding_model": embedding_model is not None,
            "openai": openai_client is not None,
            "chroma_db": collection is not None,
            "redis": redis_client is not None,
            "postgres": postgres_pool is not None
        },
        "collection_size": collection.count() if collection else 0
    }

@app.post("/index", response_model=IndexResponse)
async def index_documents(request: IndexRequest):
    """Index documents into the vector database"""
    if not collection or not embedding_model:
        raise HTTPException(status_code=503, detail="Indexing services not available")
    
    start_time = datetime.now()
    indexed_count = 0
    failed_count = 0
    errors = []
    
    # Process documents in batches
    for i in range(0, len(request.documents), request.batch_size):
        batch = request.documents[i:i + request.batch_size]
        
        try:
            # Prepare data for ChromaDB
            documents = []
            metadatas = []
            ids = []
            
            for doc in batch:
                # Chunk large documents
                chunks = chunk_text(doc.content, max_chunk_size=1000)
                
                for j, chunk in enumerate(chunks):
                    chunk_id = f"{doc.id}_chunk_{j}" if len(chunks) > 1 else doc.id
                    
                    documents.append(chunk)
                    metadatas.append({
                        **doc.metadata,
                        "document_id": doc.id,
                        "source": doc.source,
                        "tenant_id": doc.tenant_id,
                        "created_at": doc.created_at.isoformat(),
                        "chunk_index": j,
                        "total_chunks": len(chunks)
                    })
                    ids.append(chunk_id)
            
            # Add to ChromaDB (embeddings generated automatically)
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            indexed_count += len(documents)
            
        except Exception as e:
            error_msg = f"Batch {i//request.batch_size + 1} failed: {str(e)}"
            errors.append(error_msg)
            failed_count += len(batch)
            logger.error(error_msg)
    
    processing_time = (datetime.now() - start_time).total_seconds()
    
    return IndexResponse(
        indexed_count=indexed_count,
        failed_count=failed_count,
        processing_time=processing_time,
        errors=errors
    )

@app.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Search for relevant documents"""
    start_time = datetime.now()
    
    citations = await retrieve_relevant_documents(
        query=request.query,
        tenant_id=request.tenant_id,
        limit=request.limit,
        min_relevance=request.min_relevance
    )
    
    processing_time = (datetime.now() - start_time).total_seconds()
    
    return SearchResponse(
        results=citations,
        query_processed=request.query,
        processing_time=processing_time
    )

@app.post("/query", response_model=QueryResponse)
async def query_knowledge(request: QueryRequest):
    """Query the knowledge base with RAG"""
    start_time = datetime.now()
    
    try:
        # Retrieve relevant documents
        citations = await retrieve_relevant_documents(
            query=request.query,
            tenant_id=request.tenant_id,
            limit=request.max_citations * 2,  # Get more to filter later
            min_relevance=0.2
        )
        
        # Filter and limit citations
        top_citations = citations[:request.max_citations] if request.include_citations else []
        
        # Generate answer with context
        answer, tokens_used = await generate_answer_with_context(
            query=request.query,
            citations=top_citations,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        # Calculate confidence based on citation relevance
        avg_relevance = np.mean([c.relevance_score for c in top_citations]) if top_citations else 0.0
        confidence = min(avg_relevance * 1.2, 1.0)  # Scale up slightly
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return QueryResponse(
            answer=answer,
            citations=top_citations if request.include_citations else [],
            confidence=confidence,
            processing_time=processing_time,
            tokens_used=tokens_used,
            model_used="gpt-3.5-turbo"
        )
        
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cypher", response_model=CypherResponse)
async def generate_cypher(request: CypherRequest):
    """Generate Cypher query from natural language"""
    try:
        cypher, explanation, confidence, warnings = await generate_cypher_from_nl(
            natural_language=request.natural_language,
            schema_context=request.schema_context
        )
        keyword = contains_dangerous_keyword(cypher)
        if keyword and request.authority != AuthorityLevel.ADMIN:
            raise HTTPException(status_code=403, detail=f"{keyword} operations require admin authority")

        rows, cost = await estimate_cypher_cost(
            cypher, {"tenantId": request.tenant_id}
        )
        if rows is None or cost is None:
            warnings.append("Cost estimation unavailable")
        else:
            if rows > MAX_SAFE_ROWS:
                warnings.append("Estimated rows exceed safe threshold")
                if request.authority != AuthorityLevel.ADMIN:
                    raise HTTPException(status_code=403, detail="Row estimate exceeds limit for current authority")
            if cost > MAX_SAFE_COST:
                warnings.append("Estimated cost exceeds safe threshold")
                if request.authority != AuthorityLevel.ADMIN:
                    raise HTTPException(status_code=403, detail="Cost estimate exceeds limit for current authority")

        sandbox_results = None
        diff_vs_manual = None
        if request.sandbox:
            sandbox_results = await run_cypher_sandbox(cypher, {"tenantId": request.tenant_id})
            if request.manual_cypher:
                manual_results = await run_cypher_sandbox(request.manual_cypher, {"tenantId": request.tenant_id})
                diff_vs_manual = diff_cypher_results(sandbox_results, manual_results)

        logger.info("Generated Cypher", extra={"authority": request.authority})

        return CypherResponse(
            cypher_query=cypher,
            explanation=explanation,
            confidence=confidence,
            warnings=warnings,
            estimated_rows=rows,
            estimated_cost=cost,
            sandbox_results=sandbox_results,
            diff_vs_manual=diff_vs_manual,
        )

    except Exception as e:
        logger.error(f"Cypher generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/collection")
async def reset_collection():
    """Reset the document collection (admin endpoint)"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not available")
    
    try:
        collection.delete()
        return {"message": "Collection reset successfully"}
    except Exception as e:
        logger.error(f"Failed to reset collection: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset collection")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
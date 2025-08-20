"""
IntelGraph Entity Resolution Service
FastAPI-based ML service for entity matching and deduplication

MIT License
Copyright (c) 2025 IntelGraph
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import numpy as np
import pandas as pd
from datetime import datetime
import logging
import asyncio
import redis.asyncio as redis
import asyncpg
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import IsolationForest
import spacy
from sentence_transformers import SentenceTransformer
import Levenshtein
import phonetics
import hashlib
import json
import os
from contextlib import asynccontextmanager
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.calibration import CalibratedClassifierCV
from sklearn.cluster import HDBSCAN
import re
from phonenumbers import parse as parse_phone, format_number, PhoneNumberFormat
from phonenumbers.phonenumberutil import NumberParseException
import geocoder
from geopy.distance import geodesic

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global models and connections
nlp = None
sentence_model = None
redis_client = None
postgres_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global nlp, sentence_model, redis_client, postgres_pool
    
    # Startup
    logger.info("Starting Entity Resolution Service...")
    
    # Initialize spaCy model
    try:
        nlp = spacy.load("en_core_web_sm")
        logger.info("Loaded spaCy model: en_core_web_sm")
    except IOError:
        logger.warning("Could not load en_core_web_sm, using blank model")
        nlp = spacy.blank("en")
    
    # Initialize sentence transformer
    try:
        sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Loaded sentence transformer model")
    except Exception as e:
        logger.error(f"Failed to load sentence transformer: {e}")
    
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
    
    yield
    
    # Shutdown
    logger.info("Shutting down Entity Resolution Service...")
    if redis_client:
        await redis_client.close()
    if postgres_pool:
        await postgres_pool.close()

app = FastAPI(
    title="IntelGraph Entity Resolution Service",
    description="ML-powered entity matching and deduplication service",
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
class Entity(BaseModel):
    id: str
    type: str
    name: str
    properties: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=1.0, ge=0, le=1)
    tenant_id: str

class EntityPair(BaseModel):
    entity_a: Entity
    entity_b: Entity

class ScoringFeatures(BaseModel):
    name_similarity: float
    type_match: bool
    property_overlap: float
    semantic_similarity: float
    phonetic_similarity: float
    edit_distance_normalized: float

class EntityResolutionScore(BaseModel):
    entity_a_id: str
    entity_b_id: str
    overall_score: float = Field(ge=0, le=1)
    features: ScoringFeatures
    algorithm: str
    explanation: Dict[str, Any]
    confidence: float = Field(ge=0, le=1)
    created_at: datetime = Field(default_factory=datetime.now)

class ResolutionRequest(BaseModel):
    entities: List[Entity]
    algorithm: str = Field(default="hybrid", pattern="^(deterministic|probabilistic|hybrid|ml)$")
    threshold: float = Field(default=0.8, ge=0, le=1)
    tenant_id: str
    include_explanations: bool = True
    use_blocking: bool = True
    entity_type_specific_thresholds: bool = True

class ResolutionResponse(BaseModel):
    matches: List[EntityResolutionScore]
    execution_time: float
    algorithm_used: str
    entities_processed: int
    matches_found: int

class DeduplicationRequest(BaseModel):
    entities: List[Entity]
    threshold: float = Field(default=0.85, ge=0, le=1)
    tenant_id: str

class DeduplicationResponse(BaseModel):
    duplicates: List[List[str]]  # Groups of duplicate entity IDs
    unique_entities: List[str]
    execution_time: float
    duplicates_found: int

class ExplainabilityRequest(BaseModel):
    entity_a_id: str
    entity_b_id: str
    tenant_id: str

class ExplainabilityResponse(BaseModel):
    match_score: float
    features: ScoringFeatures
    explanation: Dict[str, Any]
    recommendations: List[str]

# Dependencies
async def get_db():
    """Get database connection"""
    if not postgres_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    return postgres_pool

async def get_redis():
    """Get Redis connection"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Cache not available")
    return redis_client

# Enhanced normalization and blocking functions
def normalize_name(name: str) -> str:
    """Normalize name for better matching"""
    if not name:
        return ""
    
    # Convert to lowercase and strip
    normalized = name.lower().strip()
    
    # Remove common prefixes/suffixes
    prefixes = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'dame']
    suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'esq']
    
    words = normalized.split()
    words = [w for w in words if w not in prefixes and w not in suffixes]
    
    # Remove special characters but keep spaces
    normalized = re.sub(r'[^a-z0-9\s]', '', ' '.join(words))
    
    return normalized.strip()

def normalize_email(email: str) -> str:
    """Normalize email for canonical comparison"""
    if not email or '@' not in email:
        return ""
    
    try:
        local, domain = email.lower().split('@', 1)
        
        # Handle Gmail dots and plus addressing
        if 'gmail.com' in domain:
            local = local.replace('.', '').split('+')[0]
        
        return f"{local}@{domain}"
    except:
        return email.lower()

def normalize_phone(phone: str) -> str:
    """Normalize phone to E.164 format"""
    if not phone:
        return ""
    
    try:
        parsed = parse_phone(phone, 'US')  # Default to US, could be smarter
        return format_number(parsed, PhoneNumberFormat.E164)
    except NumberParseException:
        # Fallback: just digits
        digits_only = re.sub(r'\D', '', phone)
        return digits_only if len(digits_only) >= 10 else ""

def generate_blocking_keys(entity: Entity) -> List[str]:
    """Generate blocking keys to reduce candidate set size"""
    keys = []
    
    # Name-based blocking
    if entity.name:
        normalized_name = normalize_name(entity.name)
        words = normalized_name.split()
        if words:
            # First word + last word
            if len(words) >= 2:
                keys.append(f"name:{words[0]}_{words[-1]}")
            # First 3 characters + last 3 characters
            if len(normalized_name) >= 6:
                keys.append(f"name_prefix:{normalized_name[:3]}_{normalized_name[-3:]}")
    
    # Email domain blocking
    if 'email' in entity.properties:
        email = normalize_email(entity.properties['email'])
        if '@' in email:
            domain = email.split('@')[1]
            keys.append(f"email_domain:{domain}")
    
    # Phone area code blocking
    if 'phone' in entity.properties:
        phone = normalize_phone(entity.properties['phone'])
        if len(phone) >= 4:
            keys.append(f"phone_area:{phone[:4]}")
    
    # Geographic blocking (if location available)
    if 'latitude' in entity.properties and 'longitude' in entity.properties:
        try:
            lat = float(entity.properties['latitude'])
            lng = float(entity.properties['longitude'])
            # Grid-based geo blocking (10km squares)
            geo_key = f"geo:{int(lat*100)}_{int(lng*100)}"
            keys.append(geo_key)
        except (ValueError, TypeError):
            pass
    
    # Entity type blocking
    keys.append(f"type:{entity.type}")
    
    return keys

# Feature extraction functions
def extract_name_features(name1: str, name2: str) -> Dict[str, float]:
    """Extract name-based similarity features"""
    if not name1 or not name2:
        return {"exact_match": 0.0, "normalized_similarity": 0.0, "token_overlap": 0.0}
    
    name1_lower = name1.lower().strip()
    name2_lower = name2.lower().strip()
    
    # Exact match
    exact_match = 1.0 if name1_lower == name2_lower else 0.0
    
    # Normalized Levenshtein similarity
    max_len = max(len(name1_lower), len(name2_lower))
    if max_len == 0:
        normalized_similarity = 1.0
    else:
        edit_distance = Levenshtein.distance(name1_lower, name2_lower)
        normalized_similarity = 1.0 - (edit_distance / max_len)
    
    # Token overlap (Jaccard similarity)
    tokens1 = set(name1_lower.split())
    tokens2 = set(name2_lower.split())
    if not tokens1 and not tokens2:
        token_overlap = 1.0
    elif not tokens1 or not tokens2:
        token_overlap = 0.0
    else:
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        token_overlap = intersection / union
    
    return {
        "exact_match": exact_match,
        "normalized_similarity": normalized_similarity,
        "token_overlap": token_overlap
    }

def extract_semantic_features(name1: str, name2: str) -> float:
    """Extract semantic similarity using sentence transformers"""
    if not sentence_model or not name1 or not name2:
        return 0.0
    
    try:
        embeddings = sentence_model.encode([name1, name2])
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)
    except Exception as e:
        logger.warning(f"Semantic similarity calculation failed: {e}")
        return 0.0

def extract_phonetic_features(name1: str, name2: str) -> float:
    """Extract phonetic similarity features"""
    if not name1 or not name2:
        return 0.0
    
    try:
        # Use Soundex algorithm
        soundex1 = phonetics.soundex(name1)
        soundex2 = phonetics.soundex(name2)
        
        if soundex1 == soundex2:
            return 1.0
        
        # Use metaphone as backup
        metaphone1 = phonetics.metaphone(name1)
        metaphone2 = phonetics.metaphone(name2)
        
        if metaphone1 == metaphone2:
            return 0.8
        
        return 0.0
        
    except Exception:
        return 0.0

def extract_property_features(props1: Dict[str, Any], props2: Dict[str, Any]) -> Dict[str, float]:
    """Extract property-based similarity features"""
    if not props1 and not props2:
        return {"overlap_ratio": 1.0, "common_values": 1.0}
    
    if not props1 or not props2:
        return {"overlap_ratio": 0.0, "common_values": 0.0}
    
    # Property key overlap
    keys1 = set(props1.keys())
    keys2 = set(props2.keys())
    common_keys = keys1.intersection(keys2)
    all_keys = keys1.union(keys2)
    
    overlap_ratio = len(common_keys) / len(all_keys) if all_keys else 1.0
    
    # Common property values
    common_value_matches = 0
    for key in common_keys:
        val1 = str(props1[key]).lower() if props1[key] is not None else ""
        val2 = str(props2[key]).lower() if props2[key] is not None else ""
        
        if val1 == val2:
            common_value_matches += 1
    
    common_values = common_value_matches / len(common_keys) if common_keys else 0.0
    
    return {
        "overlap_ratio": overlap_ratio,
        "common_values": common_values
    }

def compute_entity_similarity(entity1: Entity, entity2: Entity) -> ScoringFeatures:
    """Compute comprehensive similarity features between two entities"""
    
    # Name similarity
    name_features = extract_name_features(entity1.name, entity2.name)
    name_similarity = (
        name_features["exact_match"] * 0.5 +
        name_features["normalized_similarity"] * 0.3 +
        name_features["token_overlap"] * 0.2
    )
    
    # Type match
    type_match = entity1.type == entity2.type
    
    # Property overlap
    prop_features = extract_property_features(entity1.properties, entity2.properties)
    property_overlap = (
        prop_features["overlap_ratio"] * 0.4 +
        prop_features["common_values"] * 0.6
    )
    
    # Semantic similarity
    semantic_similarity = extract_semantic_features(entity1.name, entity2.name)
    
    # Phonetic similarity
    phonetic_similarity = extract_phonetic_features(entity1.name, entity2.name)
    
    # Edit distance (normalized)
    max_len = max(len(entity1.name), len(entity2.name))
    if max_len == 0:
        edit_distance_normalized = 1.0
    else:
        edit_distance = Levenshtein.distance(entity1.name, entity2.name)
        edit_distance_normalized = 1.0 - (edit_distance / max_len)
    
    return ScoringFeatures(
        name_similarity=name_similarity,
        type_match=type_match,
        property_overlap=property_overlap,
        semantic_similarity=semantic_similarity,
        phonetic_similarity=phonetic_similarity,
        edit_distance_normalized=edit_distance_normalized
    )

def deterministic_matching(entity1: Entity, entity2: Entity, threshold: float = 0.9) -> EntityResolutionScore:
    """Deterministic rule-based entity matching"""
    features = compute_entity_similarity(entity1, entity2)
    
    # Rule-based scoring
    score = 0.0
    explanation = {
        "method": "deterministic",
        "rules_applied": []
    }
    
    # Rule 1: Exact name match + same type
    if features.name_similarity > 0.99 and features.type_match:
        score = 1.0
        explanation["rules_applied"].append("exact_name_and_type_match")
    
    # Rule 2: High name similarity + property overlap
    elif features.name_similarity > 0.8 and features.property_overlap > 0.7:
        score = 0.9
        explanation["rules_applied"].append("high_name_similarity_with_properties")
    
    # Rule 3: Phonetic match + type match
    elif features.phonetic_similarity > 0.9 and features.type_match:
        score = 0.85
        explanation["rules_applied"].append("phonetic_match_with_type")
    
    # Rule 4: Semantic similarity for organization names
    elif entity1.type == "ORGANIZATION" and features.semantic_similarity > 0.9:
        score = 0.8
        explanation["rules_applied"].append("organization_semantic_match")
    
    else:
        # Weighted combination for partial matches
        weights = {
            "name": 0.4,
            "type": 0.2,
            "properties": 0.25,
            "semantic": 0.1,
            "phonetic": 0.05
        }
        
        score = (
            features.name_similarity * weights["name"] +
            (1.0 if features.type_match else 0.0) * weights["type"] +
            features.property_overlap * weights["properties"] +
            features.semantic_similarity * weights["semantic"] +
            features.phonetic_similarity * weights["phonetic"]
        )
        explanation["rules_applied"].append("weighted_combination")
    
    return EntityResolutionScore(
        entity_a_id=entity1.id,
        entity_b_id=entity2.id,
        overall_score=min(score, 1.0),
        features=features,
        algorithm="deterministic",
        explanation=explanation,
        confidence=0.9 if score > threshold else 0.7
    )

def probabilistic_matching(entity1: Entity, entity2: Entity) -> EntityResolutionScore:
    """Probabilistic entity matching with uncertainty quantification"""
    features = compute_entity_similarity(entity1, entity2)
    
    # Convert features to array for ML processing
    feature_vector = np.array([
        features.name_similarity,
        1.0 if features.type_match else 0.0,
        features.property_overlap,
        features.semantic_similarity,
        features.phonetic_similarity,
        features.edit_distance_normalized
    ])
    
    # Simple logistic-like probability calculation
    # In production, this would use a trained ML model
    weights = np.array([0.35, 0.25, 0.20, 0.10, 0.05, 0.05])
    bias = -0.3
    
    logit = np.dot(feature_vector, weights) + bias
    probability = 1 / (1 + np.exp(-logit * 5))  # Scale for sensitivity
    
    # Calculate confidence based on feature consistency
    feature_variance = np.var(feature_vector)
    confidence = 1.0 - min(feature_variance, 0.5)  # Higher variance = lower confidence
    
    explanation = {
        "method": "probabilistic",
        "feature_weights": dict(zip([
            "name_similarity", "type_match", "property_overlap",
            "semantic_similarity", "phonetic_similarity", "edit_distance"
        ], weights.tolist())),
        "probability_calculation": f"sigmoid({logit:.3f}) = {probability:.3f}",
        "confidence_factors": {
            "feature_variance": feature_variance,
            "consistency_score": confidence
        }
    }
    
    return EntityResolutionScore(
        entity_a_id=entity1.id,
        entity_b_id=entity2.id,
        overall_score=probability,
        features=features,
        algorithm="probabilistic",
        explanation=explanation,
        confidence=confidence
    )

async def cache_score(score: EntityResolutionScore, redis_conn) -> None:
    """Cache entity resolution score in Redis"""
    try:
        cache_key = f"er_score:{score.entity_a_id}:{score.entity_b_id}"
        cache_data = score.json()
        await redis_conn.setex(cache_key, 3600, cache_data)  # 1 hour TTL
    except Exception as e:
        logger.warning(f"Failed to cache score: {e}")

async def get_cached_score(entity_a_id: str, entity_b_id: str, redis_conn) -> Optional[EntityResolutionScore]:
    """Retrieve cached entity resolution score"""
    try:
        cache_key = f"er_score:{entity_a_id}:{entity_b_id}"
        cached_data = await redis_conn.get(cache_key)
        if cached_data:
            return EntityResolutionScore.parse_raw(cached_data)
    except Exception as e:
        logger.warning(f"Failed to retrieve cached score: {e}")
    return None

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "entity-resolution",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": {
            "spacy": nlp is not None,
            "sentence_transformer": sentence_model is not None
        }
    }

@app.post("/resolve", response_model=ResolutionResponse)
async def resolve_entities(
    request: ResolutionRequest,
    background_tasks: BackgroundTasks,
    redis_conn=Depends(get_redis)
):
    """Resolve entities and find potential matches"""
    start_time = datetime.now()
    
    if len(request.entities) < 2:
        raise HTTPException(status_code=400, detail="At least 2 entities required for resolution")
    
    matches = []
    total_comparisons = 0
    
    # Compare all entity pairs
    for i in range(len(request.entities)):
        for j in range(i + 1, len(request.entities)):
            entity_a = request.entities[i]
            entity_b = request.entities[j]
            
            # Check cache first
            cached_score = await get_cached_score(entity_a.id, entity_b.id, redis_conn)
            if cached_score:
                if cached_score.overall_score >= request.threshold:
                    matches.append(cached_score)
                total_comparisons += 1
                continue
            
            # Compute new score
            if request.algorithm == "deterministic":
                score = deterministic_matching(entity_a, entity_b, request.threshold)
            elif request.algorithm == "probabilistic":
                score = probabilistic_matching(entity_a, entity_b)
            else:  # hybrid
                det_score = deterministic_matching(entity_a, entity_b, request.threshold)
                prob_score = probabilistic_matching(entity_a, entity_b)
                
                # Combine scores with weighted average
                combined_score = (det_score.overall_score * 0.6 + prob_score.overall_score * 0.4)
                
                score = EntityResolutionScore(
                    entity_a_id=entity_a.id,
                    entity_b_id=entity_b.id,
                    overall_score=combined_score,
                    features=det_score.features,  # Use deterministic features
                    algorithm="hybrid",
                    explanation={
                        "method": "hybrid",
                        "deterministic_score": det_score.overall_score,
                        "probabilistic_score": prob_score.overall_score,
                        "combined_weight": "60% deterministic + 40% probabilistic"
                    },
                    confidence=(det_score.confidence + prob_score.confidence) / 2
                )
            
            if score.overall_score >= request.threshold:
                matches.append(score)
            
            # Cache the score for future use
            background_tasks.add_task(cache_score, score, redis_conn)
            total_comparisons += 1
    
    execution_time = (datetime.now() - start_time).total_seconds()
    
    return ResolutionResponse(
        matches=matches,
        execution_time=execution_time,
        algorithm_used=request.algorithm,
        entities_processed=len(request.entities),
        matches_found=len(matches)
    )

@app.post("/deduplicate", response_model=DeduplicationResponse)
async def deduplicate_entities(request: DeduplicationRequest):
    """Find and group duplicate entities"""
    start_time = datetime.now()
    
    if len(request.entities) < 2:
        raise HTTPException(status_code=400, detail="At least 2 entities required for deduplication")
    
    # Create adjacency matrix for clustering
    n = len(request.entities)
    similarity_matrix = np.zeros((n, n))
    
    # Compute pairwise similarities
    for i in range(n):
        for j in range(i + 1, n):
            score = deterministic_matching(request.entities[i], request.entities[j])
            similarity_matrix[i][j] = score.overall_score
            similarity_matrix[j][i] = score.overall_score
    
    # Find connected components (duplicates) using threshold
    visited = [False] * n
    duplicate_groups = []
    unique_entities = []
    
    def dfs(node, group, threshold):
        visited[node] = True
        group.append(request.entities[node].id)
        
        for neighbor in range(n):
            if not visited[neighbor] and similarity_matrix[node][neighbor] >= threshold:
                dfs(neighbor, group, threshold)
    
    for i in range(n):
        if not visited[i]:
            group = []
            dfs(i, group, request.threshold)
            
            if len(group) > 1:
                duplicate_groups.append(group)
            else:
                unique_entities.extend(group)
    
    execution_time = (datetime.now() - start_time).total_seconds()
    
    return DeduplicationResponse(
        duplicates=duplicate_groups,
        unique_entities=unique_entities,
        execution_time=execution_time,
        duplicates_found=len(duplicate_groups)
    )

@app.post("/explain", response_model=ExplainabilityResponse)
async def explain_match(
    request: ExplainabilityRequest,
    db_pool=Depends(get_db)
):
    """Provide explainable AI analysis for entity matching"""
    # In a real implementation, this would fetch entities from the database
    # For now, we'll return a mock explanation structure
    
    mock_features = ScoringFeatures(
        name_similarity=0.85,
        type_match=True,
        property_overlap=0.75,
        semantic_similarity=0.80,
        phonetic_similarity=0.90,
        edit_distance_normalized=0.88
    )
    
    explanation = {
        "summary": "High confidence match based on multiple strong signals",
        "contributing_factors": [
            {"factor": "Name similarity", "score": 0.85, "weight": 0.4, "contribution": 0.34},
            {"factor": "Type match", "score": 1.0, "weight": 0.2, "contribution": 0.2},
            {"factor": "Property overlap", "score": 0.75, "weight": 0.25, "contribution": 0.1875},
            {"factor": "Semantic similarity", "score": 0.80, "weight": 0.1, "contribution": 0.08},
            {"factor": "Phonetic similarity", "score": 0.90, "weight": 0.05, "contribution": 0.045}
        ],
        "decision_tree": {
            "root": "name_similarity > 0.8",
            "branches": [
                {"condition": "type_match == True", "outcome": "Strong match candidate"},
                {"condition": "property_overlap > 0.7", "outcome": "Additional confirmation"}
            ]
        }
    }
    
    recommendations = [
        "Consider manual review for final confirmation",
        "Monitor for additional data that could strengthen the match",
        "Check for potential data quality issues in source systems"
    ]
    
    return ExplainabilityResponse(
        match_score=0.87,
        features=mock_features,
        explanation=explanation,
        recommendations=recommendations
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
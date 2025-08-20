#!/usr/bin/env python3
"""
🔱 IntelGraph MVP-1+ Copilot Service
FastAPI microservice for AI-powered NER and link suggestions with 90% precision target
"""

import asyncio
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import httpx
import spacy
import en_core_web_lg
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import redis
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# OpenTelemetry setup
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=14268,
)

span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

# Prometheus metrics
ner_requests_total = Counter('copilot_ner_requests_total', 'Total NER requests', ['status'])
ner_processing_duration = Histogram('copilot_ner_processing_seconds', 'NER processing time')
link_suggestions_total = Counter('copilot_link_suggestions_total', 'Total link suggestion requests', ['status'])
link_processing_duration = Histogram('copilot_link_processing_seconds', 'Link suggestion processing time')
precision_score = Histogram('copilot_precision_score', 'Precision score for extractions')

# Initialize FastAPI app
app = FastAPI(
    title="IntelGraph Copilot Service",
    description="AI-powered NER and link suggestions for intelligence analysis",
    version="1.0.0",
    docs_url="/docs" if __name__ == "__main__" else None
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Instrument with OpenTelemetry
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()

# Redis client for caching
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
    logger.info("✅ Connected to Redis for caching")
except Exception as e:
    logger.warning(f"❌ Redis not available: {e}")
    redis_client = None

# Load spaCy model
try:
    nlp = en_core_web_lg.load()
    logger.info("✅ Loaded spaCy large English model")
except Exception as e:
    logger.error(f"❌ Failed to load spaCy model: {e}")
    # Fallback to smaller model
    try:
        nlp = spacy.load("en_core_web_sm")
        logger.info("✅ Fallback: Loaded spaCy small English model")
    except Exception as e2:
        logger.error(f"❌ No spaCy model available: {e2}")
        nlp = None

# Pydantic models
class EntityExtraction(BaseModel):
    type: str = Field(..., description="Entity type (PERSON, ORG, LOCATION, etc.)")
    label: str = Field(..., description="Entity text")
    start_index: int = Field(..., description="Start character position")
    end_index: int = Field(..., description="End character position")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    context: str = Field(..., description="Surrounding text context")
    suggested_properties: Optional[Dict[str, Any]] = Field(None, description="Suggested entity properties")

class NERRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Text to analyze")
    tenant_id: str = Field(..., description="Tenant ID for isolation")
    investigation_id: Optional[str] = Field(None, description="Investigation context")
    precision_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum confidence threshold")
    enable_caching: bool = Field(True, description="Enable result caching")

class NERResponse(BaseModel):
    entities: List[EntityExtraction] = Field(..., description="Extracted entities")
    confidence: float = Field(..., description="Overall extraction confidence")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    cached: bool = Field(False, description="Whether result was cached")
    model_version: str = Field(..., description="NLP model version used")

class LinkSuggestion(BaseModel):
    source_entity: str = Field(..., description="Source entity label")
    target_entity: str = Field(..., description="Target entity label")
    relationship_type: str = Field(..., description="Suggested relationship type")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    reasoning: str = Field(..., description="Explanation for the suggestion")
    evidence: List[str] = Field(..., description="Supporting evidence")

class LinkSuggestionRequest(BaseModel):
    entities: List[EntityExtraction] = Field(..., description="Entities to analyze for links")
    investigation_id: str = Field(..., description="Investigation context for graph analysis")
    tenant_id: str = Field(..., description="Tenant ID for isolation")
    max_suggestions: int = Field(10, ge=1, le=50, description="Maximum number of suggestions")
    confidence_threshold: float = Field(0.7, ge=0.0, le=1.0, description="Minimum confidence threshold")

class LinkSuggestionResponse(BaseModel):
    suggestions: List[LinkSuggestion] = Field(..., description="Relationship suggestions")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    graph_entities_analyzed: int = Field(..., description="Number of existing graph entities analyzed")

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    models_loaded: Dict[str, bool]
    dependencies: Dict[str, bool]

# Enhanced NER service
class CopilotNERService:
    def __init__(self):
        self.entity_patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b',
            'ip': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
            'url': r'https?://(?:[-\w.])+(?:\:[0-9]+)?(?:/(?:[\w\/_.])*(?:\?(?:[\w&=%.]*))?(?:\#(?:[\w.]*))?)?',
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'credit_card': r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
        }

    @tracer.start_as_current_span("ner_extract_entities")
    def extract_entities(self, text: str, threshold: float = 0.7) -> List[EntityExtraction]:
        """Extract entities using spaCy NLP + regex patterns for high precision"""
        entities = []
        
        if not nlp:
            logger.error("spaCy model not available")
            return entities

        # spaCy NER extraction
        doc = nlp(text)
        
        for ent in doc.ents:
            confidence = self._calculate_entity_confidence(ent, doc)
            
            if confidence >= threshold:
                entity_type = self._map_spacy_label(ent.label_)
                
                entities.append(EntityExtraction(
                    type=entity_type,
                    label=ent.text.strip(),
                    start_index=ent.start_char,
                    end_index=ent.end_char,
                    confidence=confidence,
                    context=self._extract_context(text, ent.start_char, ent.end_char),
                    suggested_properties=self._suggest_properties(ent, entity_type)
                ))

        # Regex pattern extraction for high-precision entities
        regex_entities = self._extract_regex_entities(text)
        entities.extend(regex_entities)

        # Remove duplicates and overlaps
        entities = self._deduplicate_entities(entities)
        
        return entities

    def _calculate_entity_confidence(self, ent, doc) -> float:
        """Calculate confidence based on multiple factors"""
        base_confidence = 0.7  # Base confidence for spaCy entities
        
        # Boost confidence for entities with common patterns
        if ent.label_ in ['PERSON', 'ORG', 'GPE']:
            if ent.text.istitle():
                base_confidence += 0.1
        
        # Boost for entities with context clues
        context_window = 10
        start_token = max(0, ent.start - context_window)
        end_token = min(len(doc), ent.end + context_window)
        context_tokens = [token.text.lower() for token in doc[start_token:end_token]]
        
        # Context indicators
        person_indicators = ['mr', 'mrs', 'dr', 'prof', 'ceo', 'director']
        org_indicators = ['inc', 'corp', 'ltd', 'company', 'organization']
        location_indicators = ['city', 'country', 'state', 'street', 'avenue']
        
        if ent.label_ == 'PERSON' and any(ind in context_tokens for ind in person_indicators):
            base_confidence += 0.15
        elif ent.label_ == 'ORG' and any(ind in context_tokens for ind in org_indicators):
            base_confidence += 0.15
        elif ent.label_ == 'GPE' and any(ind in context_tokens for ind in location_indicators):
            base_confidence += 0.15
        
        return min(base_confidence, 1.0)

    def _map_spacy_label(self, spacy_label: str) -> str:
        """Map spaCy labels to IntelGraph entity types"""
        mapping = {
            'PERSON': 'PERSON',
            'ORG': 'ORGANIZATION',
            'GPE': 'LOCATION',  # Geopolitical entity
            'LOC': 'LOCATION',
            'DATE': 'DATE',
            'TIME': 'DATE',
            'MONEY': 'MONEY',
            'CARDINAL': 'NUMBER',
            'ORDINAL': 'NUMBER'
        }
        return mapping.get(spacy_label, 'MISC')

    def _extract_regex_entities(self, text: str) -> List[EntityExtraction]:
        """Extract high-precision entities using regex patterns"""
        import re
        entities = []
        
        pattern_mappings = {
            'email': 'EMAIL',
            'phone': 'PHONE',
            'ip': 'IP_ADDRESS',
            'url': 'URL',
            'ssn': 'SSN',
            'credit_card': 'CREDIT_CARD'
        }
        
        for pattern_name, entity_type in pattern_mappings.items():
            pattern = self.entity_patterns[pattern_name]
            matches = re.finditer(pattern, text, re.IGNORECASE)
            
            for match in matches:
                entities.append(EntityExtraction(
                    type=entity_type,
                    label=match.group(),
                    start_index=match.start(),
                    end_index=match.end(),
                    confidence=0.95,  # High confidence for regex patterns
                    context=self._extract_context(text, match.start(), match.end()),
                    suggested_properties=self._get_regex_properties(entity_type, match.group())
                ))
        
        return entities

    def _extract_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        """Extract surrounding context for an entity"""
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        return text[context_start:context_end].strip()

    def _suggest_properties(self, ent, entity_type: str) -> Dict[str, Any]:
        """Suggest properties based on entity type and context"""
        if entity_type == 'PERSON':
            name_parts = ent.text.split()
            return {
                'first_name': name_parts[0] if name_parts else None,
                'last_name': ' '.join(name_parts[1:]) if len(name_parts) > 1 else None,
                'full_name': ent.text
            }
        elif entity_type == 'ORGANIZATION':
            return {
                'name': ent.text,
                'type': self._classify_organization(ent.text)
            }
        elif entity_type == 'LOCATION':
            return {
                'name': ent.text,
                'type': self._classify_location(ent.text)
            }
        
        return {}

    def _get_regex_properties(self, entity_type: str, text: str) -> Dict[str, Any]:
        """Get properties for regex-extracted entities"""
        if entity_type == 'EMAIL':
            parts = text.split('@')
            return {
                'local': parts[0],
                'domain': parts[1] if len(parts) > 1 else None
            }
        elif entity_type == 'PHONE':
            digits = ''.join(filter(str.isdigit, text))
            return {
                'digits': digits,
                'formatted': text,
                'country_code': '+1' if len(digits) == 11 and digits.startswith('1') else None
            }
        elif entity_type == 'URL':
            from urllib.parse import urlparse
            parsed = urlparse(text)
            return {
                'domain': parsed.netloc,
                'scheme': parsed.scheme,
                'path': parsed.path
            }
        
        return {}

    def _classify_organization(self, org_name: str) -> str:
        """Classify organization type"""
        name_lower = org_name.lower()
        if any(word in name_lower for word in ['bank', 'financial', 'credit']):
            return 'financial'
        elif any(word in name_lower for word in ['tech', 'software', 'systems']):
            return 'technology'
        elif any(word in name_lower for word in ['university', 'college', 'school']):
            return 'educational'
        elif any(word in name_lower for word in ['gov', 'government', 'agency']):
            return 'government'
        return 'commercial'

    def _classify_location(self, location: str) -> str:
        """Classify location type"""
        location_lower = location.lower()
        if any(word in location_lower for word in ['street', 'avenue', 'road', 'drive']):
            return 'address'
        elif any(word in location_lower for word in ['city', 'town']):
            return 'city'
        elif any(word in location_lower for word in ['state', 'province']):
            return 'state'
        elif any(word in location_lower for word in ['country']):
            return 'country'
        return 'general'

    def _deduplicate_entities(self, entities: List[EntityExtraction]) -> List[EntityExtraction]:
        """Remove duplicate and overlapping entities, keeping highest confidence"""
        if not entities:
            return entities
        
        # Sort by confidence (highest first)
        entities.sort(key=lambda x: x.confidence, reverse=True)
        
        deduplicated = []
        used_spans = set()
        
        for entity in entities:
            # Check for overlap with already selected entities
            overlap = False
            for start, end in used_spans:
                if not (entity.end_index <= start or entity.start_index >= end):
                    overlap = True
                    break
            
            if not overlap:
                deduplicated.append(entity)
                used_spans.add((entity.start_index, entity.end_index))
        
        # Sort by position in text
        deduplicated.sort(key=lambda x: x.start_index)
        return deduplicated

# Initialize services
ner_service = CopilotNERService()

# API endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint with dependency status"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        version="1.0.0",
        models_loaded={
            "spacy": nlp is not None,
        },
        dependencies={
            "redis": redis_client is not None,
        }
    )

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

@app.post("/ner/extract", response_model=NERResponse)
async def extract_entities(request: NERRequest):
    """Extract named entities from text with high precision targeting 90%+"""
    
    with tracer.start_as_current_span("ner_request") as span:
        span.set_attribute("tenant_id", request.tenant_id)
        span.set_attribute("text_length", len(request.text))
        
        start_time = time.time()
        cached = False
        
        try:
            # Check cache first
            cache_key = None
            if request.enable_caching and redis_client:
                import hashlib
                text_hash = hashlib.sha256(request.text.encode()).hexdigest()
                cache_key = f"ner:{request.tenant_id}:{text_hash}:{request.precision_threshold}"
                
                cached_result = redis_client.get(cache_key)
                if cached_result:
                    cached = True
                    result = json.loads(cached_result)
                    result['cached'] = True
                    result['processing_time_ms'] = int((time.time() - start_time) * 1000)
                    ner_requests_total.labels(status='cached').inc()
                    return NERResponse(**result)
            
            # Extract entities
            entities = ner_service.extract_entities(request.text, request.precision_threshold)
            
            # Calculate overall confidence
            overall_confidence = sum(e.confidence for e in entities) / len(entities) if entities else 0.0
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Record metrics
            precision_score.observe(overall_confidence)
            ner_processing_duration.observe(time.time() - start_time)
            ner_requests_total.labels(status='success').inc()
            
            result = {
                "entities": [e.dict() for e in entities],
                "confidence": overall_confidence,
                "processing_time_ms": processing_time,
                "cached": cached,
                "model_version": "spacy_en_core_web_lg_3.7.0"
            }
            
            # Cache result
            if cache_key and redis_client:
                redis_client.setex(cache_key, 300, json.dumps(result))  # 5-minute cache
            
            return NERResponse(**result)
            
        except Exception as e:
            ner_requests_total.labels(status='error').inc()
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logger.error(f"NER extraction failed: {e}")
            raise HTTPException(status_code=500, detail=f"NER extraction failed: {str(e)}")

@app.post("/links/suggest", response_model=LinkSuggestionResponse)
async def suggest_links(request: LinkSuggestionRequest):
    """Generate relationship suggestions between entities"""
    
    with tracer.start_as_current_span("link_suggestion_request") as span:
        span.set_attribute("tenant_id", request.tenant_id)
        span.set_attribute("entity_count", len(request.entities))
        
        start_time = time.time()
        
        try:
            suggestions = []
            graph_entities_analyzed = 0
            
            # Rule-based relationship inference
            for i, entity1 in enumerate(request.entities):
                for j, entity2 in enumerate(request.entities[i+1:], i+1):
                    suggestion = _infer_relationship(entity1, entity2)
                    if suggestion and suggestion.confidence >= request.confidence_threshold:
                        suggestions.append(suggestion)
            
            # Sort by confidence and limit
            suggestions.sort(key=lambda x: x.confidence, reverse=True)
            suggestions = suggestions[:request.max_suggestions]
            
            processing_time = int((time.time() - start_time) * 1000)
            
            # Record metrics
            link_processing_duration.observe(time.time() - start_time)
            link_suggestions_total.labels(status='success').inc()
            
            return LinkSuggestionResponse(
                suggestions=suggestions,
                processing_time_ms=processing_time,
                graph_entities_analyzed=graph_entities_analyzed
            )
            
        except Exception as e:
            link_suggestions_total.labels(status='error').inc()
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            logger.error(f"Link suggestion failed: {e}")
            raise HTTPException(status_code=500, detail=f"Link suggestion failed: {str(e)}")

def _infer_relationship(entity1: EntityExtraction, entity2: EntityExtraction) -> Optional[LinkSuggestion]:
    """Infer relationships between two entities using rules"""
    
    # Email -> Person relationship
    if entity1.type == 'EMAIL' and entity2.type == 'PERSON':
        if _email_belongs_to_person(entity1.label, entity2.label):
            return LinkSuggestion(
                source_entity=entity2.label,
                target_entity=entity1.label,
                relationship_type='OWNS',
                confidence=0.9,
                reasoning='Email address likely belongs to person based on name matching',
                evidence=[entity1.context, entity2.context]
            )
    
    # Person -> Organization relationship
    if entity1.type == 'PERSON' and entity2.type == 'ORGANIZATION':
        if _person_works_for_org(entity1, entity2):
            return LinkSuggestion(
                source_entity=entity1.label,
                target_entity=entity2.label,
                relationship_type='WORKS_FOR',
                confidence=0.8,
                reasoning='Context suggests employment relationship',
                evidence=[entity1.context, entity2.context]
            )
    
    # Phone -> Entity relationship
    if entity1.type == 'PHONE' and entity2.type in ['PERSON', 'ORGANIZATION']:
        if _entities_nearby(entity1, entity2):
            return LinkSuggestion(
                source_entity=entity2.label,
                target_entity=entity1.label,
                relationship_type='HAS_CONTACT',
                confidence=0.75,
                reasoning='Phone number appears near entity in text',
                evidence=[entity1.context, entity2.context]
            )
    
    return None

def _email_belongs_to_person(email: str, person_name: str) -> bool:
    """Check if email likely belongs to person"""
    email_local = email.split('@')[0].lower()
    name_words = person_name.lower().replace('.', '').split()
    
    # Check if any name word is in email local part
    for word in name_words:
        if len(word) > 2 and word in email_local:
            return True
    
    # Check initials
    if len(name_words) >= 2:
        initials = ''.join(word[0] for word in name_words[:2])
        if initials in email_local:
            return True
    
    return False

def _person_works_for_org(person: EntityExtraction, org: EntityExtraction) -> bool:
    """Check if context suggests person works for organization"""
    work_indicators = ['works at', 'employed by', 'employee of', 'manager at', 'director of', 'ceo of', 'president of']
    combined_context = (person.context + ' ' + org.context).lower()
    
    return any(indicator in combined_context for indicator in work_indicators)

def _entities_nearby(entity1: EntityExtraction, entity2: EntityExtraction, max_distance: int = 100) -> bool:
    """Check if entities appear near each other in text"""
    distance = abs(entity1.start_index - entity2.start_index)
    return distance <= max_distance

if __name__ == "__main__":
    logger.info("🚀 Starting IntelGraph Copilot Service")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=True,
        log_level="info"
    )
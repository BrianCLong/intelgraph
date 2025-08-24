from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
from pathlib import Path
from jsonschema import Draft7Validator

app = FastAPI(title="Ingest Sandbox")

SCHEMA_PATH = Path(__file__).resolve().parents[2] / 'packages' / 'mapping-dsl' / 'src' / 'schema.json'
with open(SCHEMA_PATH) as f:
    MAPPING_SCHEMA = json.load(f)

validator = Draft7Validator(MAPPING_SCHEMA)

class MappingRequest(BaseModel):
    mapping: dict

@app.post('/ingest-sandbox/validate-mapping')
def validate_mapping(req: MappingRequest):
    errors = [
        {
            'message': e.message,
            'path': list(e.path)
        }
        for e in validator.iter_errors(req.mapping)
    ]
    return { 'valid': len(errors) == 0, 'errors': errors }

@app.get('/ingest-sandbox/schemas')
def get_schemas():
    return {
        'entities': MAPPING_SCHEMA.get('entities', []),
        'relationships': MAPPING_SCHEMA.get('relationships', [])
    }

@app.post('/ingest-sandbox/run')
async def run():
    async def iterator():
        sample = { 'type': 'Person', 'id': '1', 'name': 'Alice' }
        yield json.dumps(sample) + '\n'
    return StreamingResponse(iterator(), media_type='application/jsonl')

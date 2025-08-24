from typing import Any, Tuple
from datetime import datetime

STUB_DATA = {
  'gql.run': {'risk': {'risk': 5}},
  'cypher.run': {'neighbors': {'nodes': ['a', 'b']}},
  'sql.run': {'docs': {'count': 10}},
}


def run_tool(tool: str, inputs: dict) -> Tuple[Any, dict]:
  data = STUB_DATA.get(tool, {}).get(inputs.get('persisted_id') or inputs.get('template_key'))
  citation = {
    'sourceType': tool.split('.')[0].upper(),
    'ref': inputs.get('persisted_id') or inputs.get('template_key'),
    'timestamp': datetime.utcnow().isoformat(),
    'variables': inputs,
  }
  return data, citation

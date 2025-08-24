import json
from typing import List, Dict
from uuid import uuid4


def export_conversation(messages: List[Dict]) -> Dict:
  export_id = str(uuid4())
  with open(f"export_{export_id}.json", 'w') as f:
    json.dump(messages, f)
  return {'exportId': export_id}

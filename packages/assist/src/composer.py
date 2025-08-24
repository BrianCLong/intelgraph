from jinja2 import Template
from typing import Any, List, Dict

def compose(data: List[Dict[str, Any]], citations: List[dict]) -> Dict[str, Any]:
  if not citations:
    return {'text': 'I do not have enough information to answer.', 'citations': []}
  parts = []
  for item in data:
    parts.append(str(item))
  tmpl = Template("{{ parts|join('; ') }}")
  text = tmpl.render(parts=parts)
  return {'text': text, 'citations': citations}

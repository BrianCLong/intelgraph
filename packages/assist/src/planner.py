from dataclasses import dataclass
from intents import Intent, parse

@dataclass
class Step:
  tool: str
  inputs: dict

@dataclass
class Plan:
  steps: list[Step]

INTENT_TO_TOOL = {
  Intent.RISK: ('gql.run', {'persisted_id': 'risk'}),
  Intent.NEIGHBORS: ('cypher.run', {'template_key': 'neighbors'}),
  Intent.DOCS: ('sql.run', {'template_key': 'docs'}),
}

def make_plan(text: str) -> Plan | None:
  intent = parse(text)
  if not intent:
    return None
  tool, inputs = INTENT_TO_TOOL[intent]
  return Plan(steps=[Step(tool=tool, inputs=inputs)])

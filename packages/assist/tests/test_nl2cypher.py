import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

import grammar
import templates


def test_people_at_org():
    parsed = grammar.parse("people at Acme Corp")
    assert parsed["template_id"] == "people_at_org"
    assert parsed["params"] == {"org": "acme corp"}
    cypher = templates.render(parsed["template_id"], parsed["params"])
    assert "WORKS_AT" in cypher


def test_org_of_person():
    parsed = grammar.parse("organization of Alice")
    assert parsed["template_id"] == "org_of_person"
    assert parsed["params"] == {"person": "alice"}
    cypher = templates.render(parsed["template_id"], parsed["params"])
    assert "Person" in cypher

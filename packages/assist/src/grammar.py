"""NL to Cypher grammar using Lark."""
from __future__ import annotations

from lark import Lark, Transformer, v_args

# Simple grammar for demo queries
_GRAMMAR = r"""
start: people_at | org_of

people_at: "people" "at" org
org_of: "organization" "of" person

org: WORD+
person: WORD+

%import common.WORD
%import common.WS
%ignore WS
"""

_PARSER = Lark(_GRAMMAR, parser="lalr")


@v_args(inline=True)
class _Transformer(Transformer):
    def org(self, *words: str) -> str:
        return " ".join(words)

    def person(self, *words: str) -> str:
        return " ".join(words)

    def people_at(self, org: str) -> dict:
        return {"template_id": "people_at_org", "params": {"org": org}}

    def org_of(self, person: str) -> dict:
        return {"template_id": "org_of_person", "params": {"person": person}}

    def start(self, item):
        return item


def parse(question: str) -> dict:
    """Parse a natural language question into a Cypher template and params."""
    tree = _PARSER.parse(question.lower())
    return _Transformer().transform(tree)

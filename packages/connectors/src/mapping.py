from __future__ import annotations

"""Mapping utilities.

Mappings are expressed in a very small YAML dialect:

```
entity: Person
fields:
  id: id
  name: name
  email: email
```

The keys on the right side refer to columns from the source stream.  During
normalization the resulting entity will look like::

    {
        "entityType": "Person",
        "externalIds": {"id": "123"},
        "attrs": {"name": "Alice", "email": "a@example.com"}
    }
"""

from typing import Dict, Mapping

import yaml


def parse_mapping(yaml_text: str) -> Dict[str, str]:
    data = yaml.safe_load(yaml_text)
    if not isinstance(data, Mapping) or "entity" not in data or "fields" not in data:
        raise ValueError("invalid mapping")
    return {"entity": data["entity"], "fields": dict(data["fields"])}


def apply_mapping(row: Mapping[str, str], mapping: Dict[str, str]) -> Dict[str, Dict[str, str]]:
    fields = mapping["fields"]
    external = {k: row[v] for k, v in fields.items() if k == "id" and v in row}
    attrs = {k: row[v] for k, v in fields.items() if k != "id" and v in row}
    return {
        "entityType": mapping["entity"],
        "externalIds": external,
        "attrs": attrs,
    }

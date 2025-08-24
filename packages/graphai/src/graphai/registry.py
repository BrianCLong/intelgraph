from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Model:
  id: str
  name: str
  type: str
  metrics: Dict[str, float]


_registry: Dict[str, Model] = {}


def register(model: Model) -> None:
  _registry[model.id] = model


def get(model_id: str) -> Model:
  return _registry[model_id]


def list_models() -> List[Model]:
  return list(_registry.values())

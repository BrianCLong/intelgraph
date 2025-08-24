"""In-memory stores for datasets and models.

This module is intentionally minimal and not suitable for production.
"""
from __future__ import annotations

from typing import Dict, List


class MemoryStore:
  datasets: Dict[str, Dict]
  models: Dict[str, Dict]

  def __init__(self) -> None:
    self.datasets = {}
    self.models = {}

  def add_dataset(self, dataset: Dict) -> str:
    import uuid

    dataset_id = str(uuid.uuid4())
    self.datasets[dataset_id] = dataset
    return dataset_id

  def add_model(self, model: Dict) -> str:
    import uuid

    model_id = str(uuid.uuid4())
    self.models[model_id] = model
    return model_id


STORE = MemoryStore()

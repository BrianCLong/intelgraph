from __future__ import annotations

from pydantic import BaseModel, Field

from typing import Dict, List, Optional



class GraphNode(BaseModel):
    id: str
    features: Optional[Dict[str, float]] = None
    attrs: Optional[Dict[str, str]] = None


class GraphEdge(BaseModel):
    src: str
    dst: str
    undirected: bool | None = None
    features: Optional[Dict[str, float]] = None
    attrs: Optional[Dict[str, str]] = None


class Subgraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    directed: bool | None = None
    metadata: Optional[Dict[str, str]] = None


class ModelOutput(BaseModel):
    task: str
    target: Dict[str, str]
    score: float
    logits: Optional[List[float]] = None
    label: Optional[str] = None


class ModelMeta(BaseModel):
    name: str
    version: str
    gradients: bool | None = None
    node_feature_names: Optional[List[str]] = None
    edge_feature_names: Optional[List[str]] = None


class ExplainRequest(BaseModel):
    subgraph: Subgraph
    outputs: List[ModelOutput]
    model: ModelMeta
    options: Optional[Dict[str, str]] = None


class Importance(BaseModel):
    id: str
    type: str
    score: float


class PathExplanation(BaseModel):
    path: List[str]
    score: float
    rationale: str


class CounterfactualEdit(BaseModel):
    op: str
    payload: Dict[str, str]
    cost: float


class Counterfactual(BaseModel):
    target: Dict[str, str]
    new_score: float
    delta: float
    edits: List[CounterfactualEdit]


class Robustness(BaseModel):
    stability: float
    details: Dict[str, List[str]] | Dict[str, float]


class Fairness(BaseModel):
    enabled: bool
    parity: Optional[Dict[str, float]] = None
    notes: List[str] = Field(default_factory=list)


class VizPayload(BaseModel):
    nodes: List[Dict[str, float | str]]
    edges: List[Dict[str, float | str]]
    legend: Dict[str, str]


class ExplainResponse(BaseModel):
    importances: List[Importance]
    paths: List[PathExplanation]
    counterfactuals: List[Counterfactual]
    robustness: Robustness
    fairness: Fairness
    viz: VizPayload
    audit_id: str


class PathResponse(BaseModel):
    paths: List[PathExplanation]
    audit_id: str


class CounterfactualResponse(BaseModel):
    counterfactuals: List[Counterfactual]
    audit_id: str


class FairnessReport(BaseModel):
    fairness: Fairness
    audit_id: str


class RobustnessReport(BaseModel):
    robustness: Robustness
    audit_id: str

from __future__ import annotations

import json
from functools import lru_cache
from typing import Dict
from pydantic import Field

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    auth_mode: str = Field("none", alias="AUTH_MODE")
    api_keys: str | None = Field(None, alias="API_KEYS")
    jwt_public_key: str | None = Field(None, alias="JWT_PUBLIC_KEY")

    max_nodes: int = Field(5000, alias="MAX_NODES")
    max_edges: int = Field(10000, alias="MAX_EDGES")
    time_budget_ms: int = Field(1500, alias="TIME_BUDGET_MS")

    cf_max_edits: int = Field(3, alias="CF_MAX_EDITS")
    cf_costs_raw: str = Field('{"add_edge":1,"remove_edge":1.5,"toggle_feature":0.5,"nudge_numeric":0.2}', alias="CF_COSTS")

    robustness_samples: int = Field(64, alias="ROBUSTNESS_SAMPLES")
    fairness_enabled: bool = Field(False, alias="FAIRNESS_ENABLED")
    random_seed: int = Field(0, alias="RANDOM_SEED")

    enable_prometheus: bool = Field(True, alias="ENABLE_PROMETHEUS")
    log_level: str = Field("info", alias="LOG_LEVEL")

    audit_to_db: bool = Field(False, alias="AUDIT_TO_DB")

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cf_costs(self) -> Dict[str, float]:
        return json.loads(self.cf_costs_raw)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()  # type: ignore[call-arg]
    safe = settings.model_dump(exclude={"api_keys", "jwt_public_key"})
    # simple logging
    print("Config:", safe)
    return settings

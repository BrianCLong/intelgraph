import logging
import os
from pydantic import BaseModel


class Settings(BaseModel):
    AUTH_MODE: str = os.getenv("AUTH_MODE", "none")
    API_KEYS: str | None = os.getenv("API_KEYS")
    JWT_PUBLIC_KEY_PEM: str | None = os.getenv("JWT_PUBLIC_KEY_PEM")
    DB_URL: str = os.getenv("DB_URL", "sqlite:///:memory:")
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "/models")
    ENABLE_ASYNC: bool = os.getenv("ENABLE_ASYNC", "true").lower() == "true"
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "32"))
    STORE_RAW: bool = os.getenv("STORE_RAW", "false").lower() == "true"
    RAW_RETENTION_HOURS: int = int(os.getenv("RAW_RETENTION_HOURS", "24"))
    ENABLE_PROMETHEUS: bool = os.getenv("ENABLE_PROMETHEUS", "true").lower() == "true"


settings = Settings()


def log_config() -> None:
    safe = settings.model_dump()
    if safe.get("API_KEYS"):
        safe["API_KEYS"] = "***"
    if safe.get("JWT_PUBLIC_KEY_PEM"):
        safe["JWT_PUBLIC_KEY_PEM"] = "***"
    logging.getLogger(__name__).info("effective_config", extra={"config": safe})

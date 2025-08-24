"""FastAPI application for the FinIntel service."""

from fastapi import FastAPI


def create_app() -> FastAPI:
  """Create and configure the FastAPI application."""
  app = FastAPI(title="FinIntel Service")

  @app.get("/health", tags=["health"])
  def health() -> dict[str, str]:
    """Simple healthcheck endpoint."""
    return {"status": "ok"}

  return app


app = create_app()

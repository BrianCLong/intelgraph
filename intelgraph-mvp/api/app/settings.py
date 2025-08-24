from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    jwt_secret: str = "dev-secret"
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "devpassword"

    class Config:
        env_file = ".env"


settings = Settings()

-- Enable pgvector extension and create embedding table
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS search_embeddings (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  embedding vector(384),
  payload JSONB
);

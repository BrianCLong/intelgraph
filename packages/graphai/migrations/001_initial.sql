CREATE TABLE IF NOT EXISTS graphs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  nodeQuery TEXT NOT NULL,
  edgeQuery TEXT NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_sets (
  id UUID PRIMARY KEY,
  graphId UUID REFERENCES graphs(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  version INT DEFAULT 1,
  spec JSONB,
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY,
  graphId UUID REFERENCES graphs(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  metrics JSONB,
  createdAt TIMESTAMPTZ DEFAULT now()
);

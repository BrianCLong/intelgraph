CREATE TABLE IF NOT EXISTS er_decisions (
  candidate_id TEXT PRIMARY KEY,
  approved BOOLEAN,
  decided_by TEXT,
  decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// Policy labels present on relationships/nodes
MATCH ()-[r]-() WHERE r.policy IS NOT NULL
RETURN count(r) AS labeled_edges;

// Time-travel consistency snapshot
WITH datetime($asOf) AS t
MATCH (n)-[r]->(m)
WHERE r.validFrom <= t AND (r.validTo IS NULL OR r.validTo > t)
RETURN count(r) AS edges_at_time;

MATCH (n)-[r]->(m) WHERE r.type IS NOT NULL RETURN r LIMIT 1;

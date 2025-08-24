MATCH (n)-[:REL]->(m) RETURN exists(m.id) LIMIT 1;

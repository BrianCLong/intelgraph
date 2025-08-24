MATCH (n)-[:REL]->(m) RETURN m ORDER BY m.id LIMIT 1;

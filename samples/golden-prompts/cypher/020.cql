MATCH (n)-[:REL]->(m) WHERE exists(m.id) RETURN m.id LIMIT 1;

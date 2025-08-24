MATCH (n)-[:REL]->(m) WHERE m.score > 0 RETURN m LIMIT 1;

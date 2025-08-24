MATCH (n)-[:REL]->(m)-[:REL]->(o) RETURN o.id LIMIT 1;

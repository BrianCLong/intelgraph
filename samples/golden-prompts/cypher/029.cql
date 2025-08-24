MATCH (n)-[:REL]->(m) WITH count(m) AS c RETURN c LIMIT 1;

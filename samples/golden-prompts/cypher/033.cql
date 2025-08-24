MATCH (n)-[:REL]->(m) WHERE m.weight>10 RETURN m LIMIT 1;

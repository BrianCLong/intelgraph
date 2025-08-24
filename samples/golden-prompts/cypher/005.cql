MATCH (n)-[:REL*1..3]->(m) RETURN count(*) LIMIT 1;

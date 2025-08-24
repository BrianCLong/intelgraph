MATCH (n)-[:REL]->(m) WHERE m.flag=true RETURN m LIMIT 1;

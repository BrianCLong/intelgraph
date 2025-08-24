MATCH (n)-[:REL]->(m) RETURN size( (m)-->() ) LIMIT 1;

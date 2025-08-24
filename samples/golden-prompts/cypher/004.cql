MATCH (n) WHERE exists(n.id) RETURN n.id LIMIT 1;

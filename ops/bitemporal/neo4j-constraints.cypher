// Neo4j constraints for bitemporal nodes
CREATE CONSTRAINT bitemporal_valid_range IF NOT EXISTS
FOR (n:Bitemporal)
REQUIRE (n.valid_from IS NOT NULL AND n.tx_from IS NOT NULL);

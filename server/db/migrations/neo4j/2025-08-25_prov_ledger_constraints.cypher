// Provenance Ledger Constraints and Indexes
// Defines Claim, Evidence, License, and Authority schema

// === CONSTRAINTS ===
// Claim
CREATE CONSTRAINT claim_id_unique IF NOT EXISTS
FOR (c:Claim) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT claim_hash_exists IF NOT EXISTS
FOR (c:Claim) REQUIRE c.hash IS NOT NULL;
CREATE CONSTRAINT claim_created_at_exists IF NOT EXISTS
FOR (c:Claim) REQUIRE c.created_at IS NOT NULL;

// Evidence
CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT evidence_hash_exists IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.hash IS NOT NULL;
CREATE CONSTRAINT evidence_kind_exists IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.kind IS NOT NULL;
CREATE CONSTRAINT evidence_created_at_exists IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.created_at IS NOT NULL;

// License
CREATE CONSTRAINT license_id_unique IF NOT EXISTS
FOR (l:License) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT license_name_exists IF NOT EXISTS
FOR (l:License) REQUIRE l.name IS NOT NULL;
CREATE CONSTRAINT license_url_exists IF NOT EXISTS
FOR (l:License) REQUIRE l.url IS NOT NULL;

// Authority
CREATE CONSTRAINT authority_id_unique IF NOT EXISTS
FOR (a:Authority) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT authority_name_exists IF NOT EXISTS
FOR (a:Authority) REQUIRE a.name IS NOT NULL;
CREATE CONSTRAINT authority_jurisdiction_exists IF NOT EXISTS
FOR (a:Authority) REQUIRE a.jurisdiction IS NOT NULL;

// === INDEXES ===
// Claim indexes
CREATE INDEX claim_hash IF NOT EXISTS FOR (c:Claim) ON (c.hash);
CREATE INDEX claim_created_at IF NOT EXISTS FOR (c:Claim) ON (c.created_at);

// Evidence indexes
CREATE INDEX evidence_kind IF NOT EXISTS FOR (e:Evidence) ON (e.kind);
CREATE INDEX evidence_hash IF NOT EXISTS FOR (e:Evidence) ON (e.hash);
CREATE INDEX evidence_created_at IF NOT EXISTS FOR (e:Evidence) ON (e.created_at);

// License indexes
CREATE INDEX license_name IF NOT EXISTS FOR (l:License) ON (l.name);
CREATE INDEX license_url IF NOT EXISTS FOR (l:License) ON (l.url);

// Authority indexes
CREATE INDEX authority_name IF NOT EXISTS FOR (a:Authority) ON (a.name);
CREATE INDEX authority_jurisdiction IF NOT EXISTS FOR (a:Authority) ON (a.jurisdiction);

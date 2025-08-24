CREATE TABLE ontology_registry (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  version text NOT NULL,
  status text NOT NULL,
  graphql_sdl text NOT NULL,
  shacl_ttl text NOT NULL,
  json_schemas jsonb NOT NULL,
  change_notes text,
  created_at timestamptz NOT NULL,
  activated_at timestamptz,
  deprecated_at timestamptz,
  tenant_id text
);

CREATE TABLE taxonomy (
  id uuid PRIMARY KEY,
  version_ref text NOT NULL,
  path ltree NOT NULL,
  label text NOT NULL,
  synonyms text[],
  parent ltree,
  policy_labels jsonb,
  tenant_id text
);

CREATE TABLE mappings (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  source_kind text NOT NULL,
  version_ref text NOT NULL,
  mapping_yaml text NOT NULL,
  tests jsonb,
  created_at timestamptz NOT NULL,
  tenant_id text
);

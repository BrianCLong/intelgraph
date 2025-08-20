-- Enable PostGIS extension and add geospatial columns
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geospatial fields to entities table
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS geom GEOGRAPHY(Point,4326),
  ADD COLUMN IF NOT EXISTS place_accuracy TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin1 TEXT,
  ADD COLUMN IF NOT EXISTS admin2 TEXT,
  ADD COLUMN IF NOT EXISTS admin3 TEXT;

-- Create spatial index
CREATE INDEX IF NOT EXISTS entities_geom_gix ON entities USING GIST (geom);

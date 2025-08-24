-- Create spatial indexes for geofence polygons using PostGIS
CREATE INDEX IF NOT EXISTS geofences_geom_idx ON geofences USING GIST (geom);

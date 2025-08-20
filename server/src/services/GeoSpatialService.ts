import { Pool } from 'pg';
import { getPostgresPool } from '../config/database.js';

interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

class GeoSpatialService {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  async entitiesInBbox(bbox: BBox) {
    const { minLon, minLat, maxLon, maxLat } = bbox;
    const result = await this.pool.query(
      `SELECT id, type, name, geom
       FROM entities
       WHERE geom && ST_MakeEnvelope($1,$2,$3,$4,4326)`,
      [minLon, minLat, maxLon, maxLat],
    );
    return result.rows;
  }

  async nearbyEntities(lat: number, lon: number, radiusMeters: number) {
    const result = await this.pool.query(
      `SELECT id, type, name, geom,
              ST_DistanceSphere(geom, ST_MakePoint($2,$1)) AS distance
       FROM entities
       WHERE ST_DWithin(geom, ST_MakePoint($2,$1)::geography, $3)
       ORDER BY distance ASC`,
      [lat, lon, radiusMeters],
    );
    return result.rows;
  }

  async pathsBetween(entityIds: string[]) {
    if (entityIds.length < 2) return [];
    const result = await this.pool.query(
      `SELECT a.id AS from_id, b.id AS to_id,
              ST_DistanceSphere(a.geom, b.geom) AS distance_m
       FROM entities a, entities b
       WHERE a.id = ANY($1) AND b.id = ANY($1) AND a.id <> b.id`,
      [entityIds],
    );
    return result.rows;
  }
}

export default new GeoSpatialService();

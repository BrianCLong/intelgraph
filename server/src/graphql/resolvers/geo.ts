import GeoSpatialService from '../../services/GeoSpatialService.js';

const geoResolvers = {
  Query: {
    entitiesInBbox: (_: unknown, { bbox }: { bbox: [number, number, number, number] }) =>
      GeoSpatialService.entitiesInBbox({
        minLon: bbox[0],
        minLat: bbox[1],
        maxLon: bbox[2],
        maxLat: bbox[3],
      }),
    nearbyEntities: (
      _: unknown,
      { lat, lon, radiusMeters }: { lat: number; lon: number; radiusMeters: number },
    ) => GeoSpatialService.nearbyEntities(lat, lon, radiusMeters),
    pathsBetween: (_: unknown, { entityIds }: { entityIds: string[] }) =>
      GeoSpatialService.pathsBetween(entityIds),
  },
};

export default geoResolvers;

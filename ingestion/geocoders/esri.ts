import { GeocoderProvider, GeocodeResult } from '../../server/src/services/GeocodingService.js';

export default class EsriGeocoder implements GeocoderProvider {
  async geocode(query: string): Promise<GeocodeResult[]> {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.candidates) return [];
    return data.candidates.map((c: any) => ({
      lat: c.location.y,
      lon: c.location.x,
      displayName: c.address,
      confidence: c.score / 100,
      provider: 'esri',
    }));
  }
}

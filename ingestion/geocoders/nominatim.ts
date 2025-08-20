import { GeocoderProvider, GeocodeResult } from '../../server/src/services/GeocodingService.js';

export default class NominatimGeocoder implements GeocoderProvider {
  async geocode(query: string): Promise<GeocodeResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'intelgraph-geocoder' },
    });
    const data = await res.json();
    return data.map((d: any) => ({
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
      displayName: d.display_name,
      provider: 'nominatim',
    }));
  }
}

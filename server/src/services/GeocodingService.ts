export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  confidence?: number;
  provider: string;
}

export interface GeocoderProvider {
  geocode(query: string): Promise<GeocodeResult[]>;
}

export class GeocodingService {
  private cache = new Map<string, GeocodeResult[]>();

  constructor(private provider: GeocoderProvider) {}

  async geocode(query: string): Promise<GeocodeResult[]> {
    if (this.cache.has(query)) {
      return this.cache.get(query)!;
    }
    const results = await this.provider.geocode(query);
    this.cache.set(query, results);
    return results;
  }
}

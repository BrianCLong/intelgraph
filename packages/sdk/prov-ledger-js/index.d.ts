export interface Record {
  id: string;
  license: string;
  source: string;
}

export interface ManifestResponse {
  manifestUrl: string;
  sha256: string;
  manifest?: any;
}

export interface Client {
  createClaim(data: Record): Promise<any>;
  createEvidence(data: Record): Promise<any>;
  createTransform(data: Record): Promise<any>;
  exportManifest(): Promise<ManifestResponse>;
}

export function createClient(baseUrl: string): Client;

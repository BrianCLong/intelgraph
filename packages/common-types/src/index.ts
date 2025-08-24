export interface BoundingBox { l: number; t: number; r: number; b: number; }
export interface Document { id: string; title: string; pages: number; lang?: string; }
export interface Entity { text: string; type: 'PERSON' | 'ORG' | 'LOCATION' | 'EMAIL' | 'PHONE'; page?: number; bbox?: BoundingBox; }

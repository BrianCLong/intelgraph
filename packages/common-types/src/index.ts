export interface Document {
  id: string;
  title: string;
  text: string;
}

export interface SearchHit {
  documentId: string;
  snippet: string;
}

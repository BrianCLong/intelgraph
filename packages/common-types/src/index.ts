export interface Session {
  id: string;
  assistantId: string;
  title?: string;
  classification: 'LOW' | 'MED' | 'HIGH';
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'TOOL';
  text: string;
}

export interface Citation {
  id: string;
  sourceType: string;
  ref: string;
}

export interface ModelAdapter {
  generate(prompt: string): Promise<string>;
}

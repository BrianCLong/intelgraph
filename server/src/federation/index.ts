/**
 * Basic placeholders for future federation features.
 */

export interface Subgraph {
  name: string;
  url: string;
}

export function registerSubgraph(name: string, url: string): Subgraph {
  return { name, url };
}

export function federationStatus(): string {
  return "ok";
}


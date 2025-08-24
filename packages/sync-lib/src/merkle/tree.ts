export class MerkleTree {
  private leaves: string[] = [];

  add(data: string): void {
    this.leaves.push(this.hash(data));
  }

  root(): string {
    return this.build(this.leaves);
  }

  private build(nodes: string[]): string {
    if (nodes.length === 0) return '';
    if (nodes.length === 1) return nodes[0];
    const next: string[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] ?? left;
      next.push(this.hash(left + right));
    }
    return this.build(next);
  }

  private hash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(16, '0').repeat(4);
  }
}

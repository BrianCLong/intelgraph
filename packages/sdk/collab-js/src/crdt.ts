export type Operation = {
  insert?: { pos: number; value: string };
  delete?: { pos: number; count: number };
};

export class TextCRDT {
  private text: string;

  constructor(initial = '') {
    this.text = initial;
  }

  apply(op: Operation): void {
    if (op.insert) {
      const { pos, value } = op.insert;
      this.text = this.text.slice(0, pos) + value + this.text.slice(pos);
    } else if (op.delete) {
      const { pos, count } = op.delete;
      this.text = this.text.slice(0, pos) + this.text.slice(pos + count);
    }
  }

  value(): string {
    return this.text;
  }

  merge(other: TextCRDT): TextCRDT {
    return new TextCRDT(other.value());
  }
}

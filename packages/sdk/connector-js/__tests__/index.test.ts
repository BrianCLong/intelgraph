import { createEmitter } from '../src/index';
import { Writable } from 'stream';

describe('createEmitter', () => {
  it('writes newline delimited JSON', () => {
    let data = '';
    const stream = new Writable({
      write(chunk, _enc, cb) {
        data += chunk.toString();
        cb();
      }
    });
    const emit = createEmitter(stream);
    emit({ foo: 'bar' });
    expect(data).toBe('{"foo":"bar"}\n');
  });
});

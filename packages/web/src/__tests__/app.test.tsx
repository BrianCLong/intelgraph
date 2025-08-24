import { describe, it, expect, vi } from 'vitest';
import $ from 'jquery';

describe('jQuery wiring', () => {
  it('emits event', () => {
    const spy = vi.fn();
    $(document).on('socket:finintel', spy);
    $(document).trigger('socket:finintel', [{ msg: 'x' }]);
    expect(spy).toHaveBeenCalled();
  });
});

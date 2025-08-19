import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('prints timestamp and request id', () => {
    process.env.REQUEST_ID = 'req-123';
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledWith('[2024-01-01T00:00:00.000Z] [req-123]', 'hello');
  });
});

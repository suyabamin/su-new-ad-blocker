import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, DEBUG, setDebug } from '../../../src/shared/logger.js';

describe('Logger (src/shared/logger.js)', () => {
  let logSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setDebug(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setDebug(false);
  });

  it('defaults to DEBUG = false', () => {
    expect(DEBUG).toBe(false);
    expect(logger.DEBUG).toBe(false);
  });

  it('does not throw in any mode (AC-T0.2-3)', () => {
    // With DEBUG = false
    expect(() => logger.log('tag', 'msg')).not.toThrow();
    expect(() => logger.warn('tag', 'warn-msg')).not.toThrow();
    expect(() => logger.error('tag', 'err-msg')).not.toThrow();

    // With odd / missing parameters
    expect(() => logger.log()).not.toThrow();
    expect(() => logger.log(null, undefined)).not.toThrow();
    expect(() => logger.log({ complex: 'object' })).not.toThrow();

    // With DEBUG = true
    setDebug(true);
    expect(() => logger.log('tag', 'msg')).not.toThrow();
    expect(() => logger.warn('tag', 'warn-msg')).not.toThrow();
    expect(() => logger.error('tag', 'err-msg')).not.toThrow();
    expect(() => logger.log(null, undefined)).not.toThrow();
  });

  it('produces no console output when DEBUG is false (AC-T0.2-4)', () => {
    setDebug(false);

    logger.log('TAG', 'message 1');
    logger.warn('TAG', 'message 2');
    logger.error('TAG', 'message 3');

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('produces structured console output when DEBUG is true', () => {
    setDebug(true);

    logger.log('TEST_LOG', 'info message', { extra: 1 });
    expect(logSpy).toHaveBeenCalledWith('[TEST_LOG]', 'info message', {
      extra: 1,
    });

    logger.warn('TEST_WARN', 'warning message');
    expect(warnSpy).toHaveBeenCalledWith('[TEST_WARN]', 'warning message');

    logger.error('TEST_ERR', 'error message', new Error('test'));
    expect(errorSpy).toHaveBeenCalledWith('[TEST_ERR]', 'error message', expect.any(Error));
  });

  it('allows toggling debug via setDebug and logger.DEBUG property', () => {
    expect(logger.DEBUG).toBe(false);

    logger.setDebug(true);
    expect(logger.DEBUG).toBe(true);

    logger.DEBUG = false;
    expect(logger.DEBUG).toBe(false);

    logger.DEBUG = true;
    expect(logger.DEBUG).toBe(true);
  });

  it('handles unexpected exceptions internally without throwing', () => {
    setDebug(true);

    logSpy.mockImplementation(() => {
      throw new Error('Unexpected console failure');
    });
    warnSpy.mockImplementation(() => {
      throw new Error('Unexpected console failure');
    });
    errorSpy.mockImplementation(() => {
      throw new Error('Unexpected console failure');
    });

    expect(() => logger.log('TAG', 'test')).not.toThrow();
    expect(() => logger.warn('TAG', 'test')).not.toThrow();
    expect(() => logger.error('TAG', 'test')).not.toThrow();
  });
});

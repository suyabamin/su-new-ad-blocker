import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setDebugMode, isDebugMode } from '../../../src/shared/logger.js';

// AC-TC.1-9, AC-TC.1-10, AC-TC.1-11

describe('logger (src/shared/logger.js)', () => {
  let debugSpy;
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    setDebugMode(false);
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setDebugMode(false);
  });

  it('defaults to debug mode off (AC-TC.1-10)', () => {
    expect(isDebugMode()).toBe(false);
  });

  it('setDebugMode enables and disables output', () => {
    setDebugMode(true);
    expect(isDebugMode()).toBe(true);
    setDebugMode(false);
    expect(isDebugMode()).toBe(false);
  });

  describe('no-throw guarantee (AC-TC.1-9)', () => {
    it('logger.debug does not throw in any mode or with any args', () => {
      setDebugMode(false);
      expect(() => logger.debug('tag', 'msg')).not.toThrow();
      expect(() => logger.debug()).not.toThrow();
      expect(() => logger.debug(null, undefined)).not.toThrow();
      setDebugMode(true);
      expect(() => logger.debug('tag', 'msg')).not.toThrow();
    });

    it('logger.info does not throw', () => {
      setDebugMode(false);
      expect(() => logger.info('tag', 'msg')).not.toThrow();
      setDebugMode(true);
      expect(() => logger.info('tag', 'msg')).not.toThrow();
    });

    it('logger.warn does not throw', () => {
      setDebugMode(false);
      expect(() => logger.warn('tag', 'msg')).not.toThrow();
      setDebugMode(true);
      expect(() => logger.warn('tag', 'msg')).not.toThrow();
    });

    it('logger.error does not throw', () => {
      setDebugMode(false);
      expect(() => logger.error('tag', 'msg')).not.toThrow();
      setDebugMode(true);
      expect(() => logger.error('tag', 'msg')).not.toThrow();
    });

    it('does not throw even when console methods throw internally (AC-TC.1-9)', () => {
      setDebugMode(true);
      debugSpy.mockImplementation(() => {
        throw new Error('console failure');
      });
      infoSpy.mockImplementation(() => {
        throw new Error('console failure');
      });
      warnSpy.mockImplementation(() => {
        throw new Error('console failure');
      });
      errorSpy.mockImplementation(() => {
        throw new Error('console failure');
      });
      expect(() => logger.debug('tag', 'msg')).not.toThrow();
      expect(() => logger.info('tag', 'msg')).not.toThrow();
      expect(() => logger.warn('tag', 'msg')).not.toThrow();
      expect(() => logger.error('tag', 'msg')).not.toThrow();
    });
  });

  describe('silent when debug mode is off (AC-TC.1-10)', () => {
    it('produces no console output when debugMode is false', () => {
      setDebugMode(false);
      logger.debug('TAG', 'a');
      logger.info('TAG', 'b');
      logger.warn('TAG', 'c');
      logger.error('TAG', 'd');
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('structured output when debug mode is on (AC-TC.1-11)', () => {
    it('logger.debug calls console.debug with tag prefix', () => {
      setDebugMode(true);
      logger.debug('MODULE', 'hello', 42);
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG][MODULE]', 'hello', 42);
    });

    it('logger.info calls console.info with tag prefix', () => {
      setDebugMode(true);
      logger.info('MODULE', 'info message');
      expect(infoSpy).toHaveBeenCalledWith('[INFO][MODULE]', 'info message');
    });

    it('logger.warn calls console.warn with tag prefix', () => {
      setDebugMode(true);
      logger.warn('MODULE', 'warn message');
      expect(warnSpy).toHaveBeenCalledWith('[WARN][MODULE]', 'warn message');
    });

    it('logger.error calls console.error with tag prefix', () => {
      setDebugMode(true);
      logger.error('MODULE', 'error message', new Error('oops'));
      expect(errorSpy).toHaveBeenCalledWith('[ERROR][MODULE]', 'error message', expect.any(Error));
    });
  });
});

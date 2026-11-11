// Structured logger wrapping console output.
// Disabled by default to guarantee zero console noise in production.

export let DEBUG = false;

export function setDebug(enabled) {
  DEBUG = Boolean(enabled);
}

export const logger = {
  get DEBUG() {
    return DEBUG;
  },
  set DEBUG(value) {
    DEBUG = Boolean(value);
  },
  setDebug(enabled) {
    DEBUG = Boolean(enabled);
  },
  log(tag, ...args) {
    try {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[${tag}]`, ...args);
      }
    } catch {
      // Safe no-op to ensure logger never throws
    }
  },
  warn(tag, ...args) {
    try {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.warn(`[${tag}]`, ...args);
      }
    } catch {
      // Safe no-op to ensure logger never throws
    }
  },
  error(tag, ...args) {
    try {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error(`[${tag}]`, ...args);
      }
    } catch {
      // Safe no-op to ensure logger never throws
    }
  },
};

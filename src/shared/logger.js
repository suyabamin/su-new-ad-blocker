// Structured logger for the SU New Ad Blocker extension.
// All logging MUST go through this module. No console.log in committed code.
// Silent by default (debugMode = false). Never throws.

let debugMode = false;

/**
 * Enable or disable debug output.
 * @param {boolean} enabled
 */
export function setDebugMode(enabled) {
  debugMode = Boolean(enabled);
}

/** Returns whether debug output is currently enabled. */
export function isDebugMode() {
  return debugMode;
}

function emit(level, tag, args) {
  try {
    if (!debugMode) {
      return;
    }
    const prefix = `[${level.toUpperCase()}][${tag}]`;
    // eslint-disable-next-line no-console
    console[level](prefix, ...args);
  } catch {
    // Safe no-op — logger must never throw under any circumstances.
  }
}

export const logger = Object.freeze({
  /**
   * Log a debug-level message.
   * @param {string} tag - Short module/context label
   * @param {...unknown} args
   */
  debug(tag, ...args) {
    emit('debug', tag, args);
  },

  /**
   * Log an informational message.
   * @param {string} tag
   * @param {...unknown} args
   */
  info(tag, ...args) {
    emit('info', tag, args);
  },

  /**
   * Log a warning.
   * @param {string} tag
   * @param {...unknown} args
   */
  warn(tag, ...args) {
    emit('warn', tag, args);
  },

  /**
   * Log an error.
   * @param {string} tag
   * @param {...unknown} args
   */
  error(tag, ...args) {
    emit('error', tag, args);
  },
});

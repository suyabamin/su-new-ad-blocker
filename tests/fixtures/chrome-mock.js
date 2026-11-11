// Mock implementation of chrome APIs for unit tests running in Node

export function createMockChrome() {
  const storageState = new Map();
  const alarms = new Map();
  const messageListeners = [];
  const alarmListeners = [];
  const dynamicRules = [];

  return {
    storage: {
      local: {
        get: (keys, callback) => {
          const result = {};
          if (typeof keys === 'string') {
            result[keys] = storageState.get(keys);
          } else if (Array.isArray(keys)) {
            for (const k of keys) {
              if (storageState.has(k)) {
                result[k] = storageState.get(k);
              }
            }
          } else if (keys && typeof keys === 'object') {
            for (const [k, defaultVal] of Object.entries(keys)) {
              result[k] = storageState.has(k) ? storageState.get(k) : defaultVal;
            }
          } else if (keys === null || keys === undefined) {
            for (const [k, v] of storageState.entries()) {
              result[k] = v;
            }
          }
          if (callback) {
            callback(result);
          }
          return Promise.resolve(result);
        },
        set: (items, callback) => {
          for (const [k, v] of Object.entries(items)) {
            storageState.set(k, v);
          }
          if (callback) {
            callback();
          }
          return Promise.resolve();
        },
        remove: (keys, callback) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            storageState.delete(k);
          }
          if (callback) {
            callback();
          }
          return Promise.resolve();
        },
        clear: (callback) => {
          storageState.clear();
          if (callback) {
            callback();
          }
          return Promise.resolve();
        },
      },
    },
    runtime: {
      id: 'mock-extension-id',
      onMessage: {
        addListener: (listener) => {
          messageListeners.push(listener);
        },
        removeListener: (listener) => {
          const idx = messageListeners.indexOf(listener);
          if (idx !== -1) {
            messageListeners.splice(idx, 1);
          }
        },
      },
      onInstalled: {
        addListener: (listener) => {
          // Store listener or run immediately when testing install
          listener({ reason: 'install' });
        },
      },
      sendMessage: (message, callback) => {
        let responded = false;
        const sendResponse = (res) => {
          responded = true;
          if (callback) {
            callback(res);
          }
        };
        for (const listener of messageListeners) {
          const result = listener(message, {}, sendResponse);
          if (result === true) {
            // async handler
            return;
          }
        }
        if (!responded && callback) {
          callback(undefined);
        }
      },
      getManifest: () => ({
        version: '0.1.0',
        name: 'SU New Ad Blocker',
      }),
    },
    alarms: {
      create: (name, alarmInfo) => {
        alarms.set(name, alarmInfo);
      },
      get: (name, callback) => {
        const item = alarms.get(name);
        if (callback) {
          callback(item);
        }
        return Promise.resolve(item);
      },
      clearAll: (callback) => {
        alarms.clear();
        if (callback) {
          callback();
        }
        return Promise.resolve();
      },
      onAlarm: {
        addListener: (listener) => {
          alarmListeners.push(listener);
        },
      },
    },
    declarativeNetRequest: {
      updateDynamicRules: (options, callback) => {
        if (options.removeRuleIds) {
          for (const id of options.removeRuleIds) {
            const idx = dynamicRules.findIndex((r) => r.id === id);
            if (idx !== -1) {
              dynamicRules.splice(idx, 1);
            }
          }
        }
        if (options.addRules) {
          dynamicRules.push(...options.addRules);
        }
        if (callback) {
          callback();
        }
        return Promise.resolve();
      },
      getDynamicRules: (callback) => {
        if (callback) {
          callback(dynamicRules);
        }
        return Promise.resolve([...dynamicRules]);
      },
      onRuleMatchedDebug: {
        addListener: () => {},
      },
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
    },
    _internal: {
      storageState,
      alarms,
      messageListeners,
      alarmListeners,
      dynamicRules,
    },
  };
}

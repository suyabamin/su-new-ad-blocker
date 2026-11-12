// Fixed, audited HTTPS endpoints. List text is data and is never executed.
export const FILTER_LISTS = Object.freeze([
  Object.freeze({
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    license: 'GPL-3.0-or-later OR CC-BY-SA-3.0-or-later',
  }),
  Object.freeze({
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    license: 'GPL-3.0-or-later OR CC-BY-SA-3.0-or-later',
  }),
]);

export const MAX_FILTER_LIST_BYTES = 5 * 1024 * 1024;
export const MAX_DYNAMIC_FILTER_RULES = 4000;
export const DYNAMIC_RULES_PER_LIST = 2000;
export const DYNAMIC_RULE_ID_OFFSET = 50_000;
export const DYNAMIC_ALLOW_RULE_ID_OFFSET = 60_000;
export const STATIC_ALLOW_RULE_ID_OFFSET = 1_000_000;
export const MAX_STATIC_RULES = 30_000;

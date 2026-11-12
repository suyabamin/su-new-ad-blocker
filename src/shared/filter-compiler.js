// Conservative EasyList subset compiler shared by build and runtime updates.

export const FILTER_RESOURCE_TYPES = Object.freeze([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other',
]);

const RESOURCE_TYPES = Object.freeze({
  document: 'main_frame',
  subdocument: 'sub_frame',
  stylesheet: 'stylesheet',
  script: 'script',
  image: 'image',
  font: 'font',
  object: 'object',
  'object-subrequest': 'object',
  xmlhttprequest: 'xmlhttprequest',
  ping: 'ping',
  media: 'media',
  websocket: 'websocket',
  other: 'other',
});

const IGNORED_OPTIONS = new Set(['important', 'match-case']);
const UNSUPPORTED_OPTIONS = new Set([
  'popup',
  'redirect',
  'rewrite',
  'removeparam',
  'csp',
  'header',
  'badfilter',
  'elemhide',
  'generichide',
  'specifichide',
  'webrtc',
]);

/** Converts a supported network filter to a DNR rule descriptor. */
export function parseNetworkFilter(line) {
  if (typeof line !== 'string') {
    return null;
  }
  let text = line.trim();
  if (!text || text.startsWith('!') || text.startsWith('[') || text.includes('#')) {
    return null;
  }

  let action = 'block';
  if (text.startsWith('@@')) {
    action = 'allow';
    text = text.slice(2);
  }
  const dollar = text.indexOf('$');
  const pattern = dollar < 0 ? text : text.slice(0, dollar);
  const options =
    dollar < 0
      ? []
      : text
          .slice(dollar + 1)
          .split(',')
          .map((v) => v.trim());
  if (!pattern || pattern.length > 2000 || /\s/.test(pattern)) {
    return null;
  }

  const includedTypes = new Set();
  const excludedTypes = new Set();
  const initiatorDomains = new Set();
  const excludedInitiatorDomains = new Set();
  let domainType;
  let isUrlFilterCaseSensitive;
  let important = false;

  for (const option of options) {
    if (!option) {
      return null;
    }
    if (IGNORED_OPTIONS.has(option)) {
      if (option === 'match-case') {
        isUrlFilterCaseSensitive = true;
      }
      if (option === 'important') {
        important = true;
      }
      continue;
    }
    if (UNSUPPORTED_OPTIONS.has(option.split('=')[0])) {
      return null;
    }
    if (option === 'third-party' || option === '3p') {
      domainType = 'thirdParty';
      continue;
    }
    if (
      option === '~third-party' ||
      option === '~3p' ||
      option === 'first-party' ||
      option === '1p'
    ) {
      domainType = 'firstParty';
      continue;
    }
    if (option.startsWith('domain=')) {
      for (const domain of option.slice(7).split('|')) {
        const normalized = domain.replace(/^~/, '').replace(/^\.+/, '').toLowerCase();
        if (!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}$/.test(normalized)) {
          return null;
        }
        (domain.startsWith('~') ? excludedInitiatorDomains : initiatorDomains).add(normalized);
      }
      continue;
    }
    const negative = option.startsWith('~');
    const typeName = negative ? option.slice(1) : option;
    const type = RESOURCE_TYPES[typeName];
    if (!type) {
      return null;
    }
    (negative ? excludedTypes : includedTypes).add(type);
  }

  if (includedTypes.size && excludedTypes.size) {
    return null;
  }
  const condition = { urlFilter: pattern };
  if (includedTypes.size) {
    condition.resourceTypes = [...includedTypes];
  } else if (excludedTypes.size) {
    condition.excludedResourceTypes = [...excludedTypes];
  }
  if (domainType) {
    condition.domainType = domainType;
  }
  if (initiatorDomains.size) {
    condition.initiatorDomains = [...initiatorDomains];
  }
  if (excludedInitiatorDomains.size) {
    condition.excludedInitiatorDomains = [...excludedInitiatorDomains];
  }
  if (isUrlFilterCaseSensitive) {
    condition.isUrlFilterCaseSensitive = true;
  }
  return { action, condition, important };
}

/** Compiles several source lists into a unique, bounded dynamic-rule set. */
export function compileFilterLists(
  sources,
  { maxRules = 4000, maxRulesPerSource = maxRules, firstId = 1 } = {}
) {
  const rules = [];
  const seen = new Set();
  const report = [];
  for (const source of sources) {
    let parsed = 0;
    let converted = 0;
    let skipped = 0;
    let truncated = 0;
    const lines = source.text.split(/\r?\n/);
    const normalizeBadFilter = (line) =>
      line
        .trim()
        .replace(/,badfilter(?=,|$)/, '')
        .replace(/\$badfilter$/, '')
        .replace(/\$$/, '');
    const badFilters = new Set(
      lines.filter((line) => /(?:\$|,)badfilter(?:,|$)/.test(line)).map(normalizeBadFilter)
    );
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('!') || line.trim().startsWith('[')) {
        continue;
      }
      parsed++;
      const descriptor = parseNetworkFilter(line);
      if (
        !descriptor ||
        /(?:\$|,)badfilter(?:,|$)/.test(line) ||
        badFilters.has(normalizeBadFilter(line))
      ) {
        skipped++;
        continue;
      }
      const signature = JSON.stringify([
        descriptor.action,
        descriptor.condition,
        descriptor.important,
      ]);
      if (seen.has(signature)) {
        continue;
      }
      seen.add(signature);
      if (rules.length >= maxRules) {
        truncated++;
        continue;
      }
      if (converted >= maxRulesPerSource) {
        truncated++;
        continue;
      }
      const basePriority = descriptor.action === 'allow' ? 2 : 1;
      rules.push({
        id: firstId + rules.length,
        priority: descriptor.important ? 3 : basePriority,
        action: { type: descriptor.action },
        condition: descriptor.condition,
      });
      converted++;
    }
    report.push({ id: source.id, parsed, converted, skipped, truncated });
  }
  return { rules, report };
}

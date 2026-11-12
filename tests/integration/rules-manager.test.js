import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enableRuleset,
  disableRuleset,
  pauseDomain,
  resumeDomain,
  isPaused,
  listPaused,
  resetRulesManagerState,
  PAUSE_RULE_PRIORITY,
  PAUSE_RULE_ID_OFFSET,
} from '../../src/background/rules-manager.js';

describe('rules-manager (src/background/rules-manager.js)', () => {
  let updateEnabledRulesetsMock;
  let updateDynamicRulesMock;

  beforeEach(() => {
    resetRulesManagerState();
    updateEnabledRulesetsMock = vi.fn().mockResolvedValue(undefined);
    updateDynamicRulesMock = vi.fn().mockResolvedValue(undefined);

    global.chrome = {
      declarativeNetRequest: {
        updateEnabledRulesets: updateEnabledRulesetsMock,
        updateDynamicRules: updateDynamicRulesMock,
      },
    };
  });

  describe('ruleset management', () => {
    it('enableRuleset calls updateEnabledRulesets with enableRulesetIds', async () => {
      await enableRuleset('main_blocking_rules');
      expect(updateEnabledRulesetsMock).toHaveBeenCalledWith({
        enableRulesetIds: ['main_blocking_rules'],
      });
    });

    it('disableRuleset calls updateEnabledRulesets with disableRulesetIds', async () => {
      await disableRuleset('main_blocking_rules');
      expect(updateEnabledRulesetsMock).toHaveBeenCalledWith({
        disableRulesetIds: ['main_blocking_rules'],
      });
    });
  });

  describe('site pause and resume (dynamic rules)', () => {
    it('pauseDomain adds dynamic allow rule with PAUSE_RULE_PRIORITY (100000)', async () => {
      const ruleId = await pauseDomain('example.com');
      expect(ruleId).toBeGreaterThanOrEqual(PAUSE_RULE_ID_OFFSET);

      expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
      const callArg = updateDynamicRulesMock.mock.calls[0][0];
      expect(callArg.addRules).toHaveLength(1);

      const addedRule = callArg.addRules[0];
      expect(addedRule.id).toBe(ruleId);
      expect(addedRule.priority).toBe(PAUSE_RULE_PRIORITY);
      expect(addedRule.action.type).toBe('allow');
      expect(addedRule.condition.urlFilter).toBe('||example.com^');
      expect(addedRule.condition.resourceTypes).toContain('main_frame');
      expect(addedRule.condition.resourceTypes).toContain('script');

      expect(isPaused('example.com')).toBe(true);
      expect(listPaused()).toEqual(['example.com']);
    });

    it('pauseDomain is idempotent when called twice on the same domain', async () => {
      const id1 = await pauseDomain('example.com');
      const id2 = await pauseDomain('EXAMPLE.COM');

      expect(id1).toBe(id2);
      expect(updateDynamicRulesMock).toHaveBeenCalledTimes(1);
    });

    it('pauseDomain throws TypeError on invalid domain input', async () => {
      await expect(pauseDomain('')).rejects.toThrow(TypeError);
      await expect(pauseDomain(null)).rejects.toThrow(TypeError);
    });

    it('resumeDomain removes the dynamic allow rule', async () => {
      const ruleId = await pauseDomain('example.com');
      expect(isPaused('example.com')).toBe(true);

      await resumeDomain('example.com');
      expect(updateDynamicRulesMock).toHaveBeenCalledWith({
        removeRuleIds: [ruleId],
      });
      expect(isPaused('example.com')).toBe(false);
      expect(listPaused()).toEqual([]);
    });

    it('resumeDomain is a safe no-op on non-paused domains', async () => {
      await resumeDomain('not-paused.com');
      expect(updateDynamicRulesMock).not.toHaveBeenCalled();
    });
  });
});

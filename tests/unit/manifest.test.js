import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const CANONICAL_PERMISSIONS = [
  'declarativeNetRequest',
  'declarativeNetRequestFeedback',
  'storage',
  'alarms',
  'activeTab',
];

describe('manifest.json specification (T1.1, D1, D2)', () => {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('declares Manifest V3 with valid metadata', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('SU New Ad Blocker');
    expect(manifest.short_name).toBe('SU Ad Blocker');
    expect(manifest.version).toBe('0.1.0');
    expect(typeof manifest.description).toBe('string');
    expect(manifest.description.length).toBeLessThan(132);
    expect(manifest.description.length).toBeGreaterThan(0);
  });

  it('declares canonical permissions matching Section 0 exactly', () => {
    expect(manifest.permissions).toEqual(CANONICAL_PERMISSIONS);
    expect(manifest.host_permissions).toEqual(['<all_urls>']);
  });

  it('declares ES module service worker', () => {
    expect(manifest.background).toEqual({
      service_worker: 'src/background/service-worker.js',
      type: 'module',
    });
    expect(fs.existsSync(path.join(ROOT_DIR, manifest.background.service_worker))).toBe(true);
  });

  it('declares action popup and options UI', () => {
    expect(manifest.action.default_popup).toBe('src/popup/popup.html');
    expect(fs.existsSync(path.join(ROOT_DIR, manifest.action.default_popup))).toBe(true);

    expect(manifest.options_ui).toEqual({
      page: 'src/options/options.html',
      open_in_tab: true,
    });
    expect(fs.existsSync(path.join(ROOT_DIR, manifest.options_ui.page))).toBe(true);
  });

  it('declares content scripts for cosmetic and youtube with document_start', () => {
    const cosmetic = manifest.content_scripts.find((cs) => cs.matches.includes('<all_urls>'));
    expect(cosmetic).toBeDefined();
    expect(cosmetic.run_at).toBe('document_start');
    expect(cosmetic.all_frames).toBe(true);
    expect(cosmetic.js).toContain('src/content/cosmetic.js');

    const youtube = manifest.content_scripts.find((cs) =>
      cs.matches.includes('https://www.youtube.com/*')
    );
    expect(youtube).toBeDefined();
    expect(youtube.run_at).toBe('document_start');
    expect(youtube.js).toContain('src/content/youtube/youtube.js');
  });

  it('declares icons at sizes 16, 32, 48, 128 under src/assets/icons/ and files exist', () => {
    const expectedSizes = ['16', '32', '48', '128'];
    for (const size of expectedSizes) {
      const iconPath = manifest.icons[size];
      expect(iconPath).toBe(`src/assets/icons/icon${size}.png`);
      expect(fs.existsSync(path.join(ROOT_DIR, iconPath))).toBe(true);

      const actionIconPath = manifest.action.default_icon[size];
      expect(actionIconPath).toBe(`src/assets/icons/icon${size}.png`);
    }
  });

  it('declares declarative_net_request rule_resources pointing to rules/', () => {
    const ruleResources = manifest.declarative_net_request.rule_resources;
    expect(Array.isArray(ruleResources)).toBe(true);
    expect(ruleResources.length).toBeGreaterThan(0);

    for (const resource of ruleResources) {
      expect(resource.path.startsWith('rules/')).toBe(true);
      expect(fs.existsSync(path.join(ROOT_DIR, resource.path))).toBe(true);
    }
  });
});

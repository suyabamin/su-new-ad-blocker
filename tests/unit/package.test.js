import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { createZipArchive, validatePackageFiles } from '../../scripts/package.js';

let tempRoot;

function readZipEntries(archivePath) {
  const archive = fs.readFileSync(archivePath);
  const endOffset = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const entryCount = archive.readUInt16LE(endOffset + 10);
  let centralOffset = archive.readUInt32LE(endOffset + 16);
  const entries = new Map();

  for (let index = 0; index < entryCount; index++) {
    const nameLength = archive.readUInt16LE(centralOffset + 28);
    const extraLength = archive.readUInt16LE(centralOffset + 30);
    const commentLength = archive.readUInt16LE(centralOffset + 32);
    const name = archive.toString('utf8', centralOffset + 46, centralOffset + 46 + nameLength);
    const compressedSize = archive.readUInt32LE(centralOffset + 20);
    const localOffset = archive.readUInt32LE(centralOffset + 42);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, inflateRawSync(compressed).toString('utf8'));
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

describe('release packager', () => {
  afterEach(() => {
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  it('creates a ZIP with the manifest at root and nested runtime files', () => {
    const tempParent = path.join(process.cwd(), '.pw-tmp');
    fs.mkdirSync(tempParent, { recursive: true });
    tempRoot = fs.mkdtempSync(path.join(tempParent, 'package-unit-'));
    const distDir = path.join(tempRoot, 'dist');
    const archivePath = path.join(tempRoot, 'release.zip');
    fs.mkdirSync(path.join(distDir, 'content'), { recursive: true });
    fs.mkdirSync(path.join(distDir, 'src', 'options'), { recursive: true });
    fs.writeFileSync(path.join(distDir, 'manifest.json'), '{"manifest_version":3}');
    fs.writeFileSync(path.join(distDir, 'content', 'cosmetic.js'), '(()=>{})();');
    fs.writeFileSync(path.join(distDir, 'src', 'options', 'options.html'), '<main></main>');

    const names = createZipArchive(distDir, archivePath);
    const entries = readZipEntries(archivePath);
    expect(names).toEqual(['content/cosmetic.js', 'manifest.json', 'src/options/options.html']);
    expect(entries.get('manifest.json')).toBe('{"manifest_version":3}');
    expect(entries.get('content/cosmetic.js')).toBe('(()=>{})();');
    expect(entries.get('src/options/options.html')).toBe('<main></main>');
  });

  it('rejects source maps, environment files, tests, documentation, and missing root manifests', () => {
    for (const forbidden of [
      ['manifest.json', 'content/app.js.map'],
      ['manifest.json', '.env'],
      ['manifest.json', 'node_modules/pkg/index.js'],
      ['manifest.json', 'tests/unit/app.test.js'],
      ['manifest.json', 'docs/README.md'],
    ]) {
      expect(() => validatePackageFiles(forbidden)).toThrow();
    }
    expect(() => validatePackageFiles(['content/app.js'])).toThrow(/manifest.json at its root/);
  });
});

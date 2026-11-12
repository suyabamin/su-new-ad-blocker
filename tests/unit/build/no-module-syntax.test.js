import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { bundleContentScripts, assertNoTopLevelModuleSyntax } from '../../../scripts/build.js';

describe('build: no-module-syntax in content script bundles (ADR-0005)', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'su-test-build-no-module-'));

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('runs the bundler into a temp dir and asserts output has no top-level import or export statements', async () => {
    const { cosmeticOutFile, youtubeOutFile } = await bundleContentScripts({
      outDir: tempDir,
    });

    expect(fs.existsSync(cosmeticOutFile)).toBe(true);
    expect(fs.existsSync(youtubeOutFile)).toBe(true);

    const cosmeticCode = fs.readFileSync(cosmeticOutFile, 'utf8');
    const youtubeCode = fs.readFileSync(youtubeOutFile, 'utf8');

    // Bundles must not be empty
    expect(cosmeticCode.length).toBeGreaterThan(100);
    expect(youtubeCode.length).toBeGreaterThan(100);

    // Verify assertNoTopLevelModuleSyntax does not throw for genuine bundles
    expect(() => assertNoTopLevelModuleSyntax(cosmeticOutFile, cosmeticCode)).not.toThrow();
    expect(() => assertNoTopLevelModuleSyntax(youtubeOutFile, youtubeCode)).not.toThrow();

    // Explicit regex assertions: no top-level import or export statements
    const moduleSyntaxRegex =
      /^\s*(import\s+(?:[a-zA-Z0-9_{}\s*,]+from\s+)?['"][^'"]+['"]|import\s*\(|export\s+(?:default\s+|const\s+|let\s+|var\s+|function\s+|class\s+|\*|\{))/m;

    expect(cosmeticCode).not.toMatch(moduleSyntaxRegex);
    expect(youtubeCode).not.toMatch(moduleSyntaxRegex);
  });

  it('assertNoTopLevelModuleSyntax correctly rejects code with top-level imports or exports', () => {
    const codeWithExport = 'var x = 1;\nexport const foo = 2;\nconsole.log(foo);';
    expect(() => assertNoTopLevelModuleSyntax('dummy.js', codeWithExport)).toThrow(
      /Top-level module syntax detected/
    );

    const codeWithImport = "import { something } from './other.js';\nconsole.log(something);";
    expect(() => assertNoTopLevelModuleSyntax('dummy.js', codeWithImport)).toThrow(
      /Top-level module syntax detected/
    );

    const validIife = '(() => {\n  var secret = 42;\n  console.log(secret);\n})();';
    expect(() => assertNoTopLevelModuleSyntax('dummy.js', validIife)).not.toThrow();
  });
});

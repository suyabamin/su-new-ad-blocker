// scripts/build.js
// Bundles content scripts with esbuild into IIFEs and packages the extension in dist/
// See docs/ADR/0005-bundle-content-scripts.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Asserts that a bundle contains no top-level module syntax (import/export).
 * MV3 content scripts are classic scripts and will fail to load if module syntax is present.
 *
 * @param {string} filePath
 * @param {string} content
 */
export function assertNoTopLevelModuleSyntax(filePath, content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (
      !trimmed ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      continue;
    }
    if (
      /^export\s+(default\s+|const\s+|let\s+|var\s+|function\s+|class\s+|type\s+|interface\s+|\{|\*)/.test(
        trimmed
      ) ||
      /^export\s*\{/.test(trimmed) ||
      /^export\s+default\b/.test(trimmed) ||
      /^import\s+/.test(trimmed) ||
      /^import\s*\(/.test(trimmed)
    ) {
      throw new Error(
        `Top-level module syntax detected in bundle ${filePath} at line ${i + 1}: "${trimmed}". MV3 content scripts must not contain module syntax.`
      );
    }
  }
}

/**
 * Bundles cosmetic and youtube content scripts using esbuild into IIFE format.
 *
 * @param {object} options
 * @param {string} [options.rootDir]
 * @param {string} [options.outDir]
 * @param {boolean} [options.minify]
 * @returns {Promise<{ cosmeticOutFile: string, youtubeOutFile: string }>}
 */
export async function bundleContentScripts({
  rootDir = ROOT_DIR,
  outDir = path.join(ROOT_DIR, 'dist'),
  minify = process.env.NODE_ENV === 'production',
} = {}) {
  const cosmeticEntry = path.join(rootDir, 'src', 'content', 'cosmetic.js');
  const youtubeEntry = fs.existsSync(path.join(rootDir, 'src', 'content', 'youtube', 'youtube.js'))
    ? path.join(rootDir, 'src', 'content', 'youtube', 'youtube.js')
    : path.join(rootDir, 'src', 'content', 'youtube.js');

  const contentOutDir = path.join(outDir, 'content');
  fs.mkdirSync(contentOutDir, { recursive: true });

  const cosmeticOutFile = path.join(contentOutDir, 'cosmetic.js');
  const youtubeOutFile = path.join(contentOutDir, 'youtube.js');

  const buildOptions = {
    bundle: true,
    format: 'iife',
    target: 'chrome120',
    platform: 'browser',
    minify,
  };

  await esbuild.build({
    ...buildOptions,
    entryPoints: [cosmeticEntry],
    outfile: cosmeticOutFile,
  });

  await esbuild.build({
    ...buildOptions,
    entryPoints: [youtubeEntry],
    outfile: youtubeOutFile,
  });

  // Verify output bundles contain no top-level import or export statements
  for (const bundlePath of [cosmeticOutFile, youtubeOutFile]) {
    const code = fs.readFileSync(bundlePath, 'utf8');
    assertNoTopLevelModuleSyntax(bundlePath, code);
  }

  // Also mirror bundles to outDir/dist/content to support relative path resolution
  const distContentOutDir = path.join(outDir, 'dist', 'content');
  fs.mkdirSync(distContentOutDir, { recursive: true });
  fs.copyFileSync(cosmeticOutFile, path.join(distContentOutDir, 'cosmetic.js'));
  fs.copyFileSync(youtubeOutFile, path.join(distContentOutDir, 'youtube.js'));

  return { cosmeticOutFile, youtubeOutFile };
}

/**
 * Copies source directories that remain unchanged into dist/.
 *
 * @param {object} options
 * @param {string} [options.rootDir]
 * @param {string} [options.outDir]
 */
export function copyUnchangedDirectories({
  rootDir = ROOT_DIR,
  outDir = path.join(ROOT_DIR, 'dist'),
} = {}) {
  const dirsToCopy = [
    { src: path.join(rootDir, 'src', 'background'), dest: path.join(outDir, 'src', 'background') },
    { src: path.join(rootDir, 'src', 'popup'), dest: path.join(outDir, 'src', 'popup') },
    { src: path.join(rootDir, 'src', 'options'), dest: path.join(outDir, 'src', 'options') },
    { src: path.join(rootDir, 'src', 'assets'), dest: path.join(outDir, 'src', 'assets') },
    { src: path.join(rootDir, 'rules'), dest: path.join(outDir, 'rules') },
    { src: path.join(rootDir, 'src', 'shared'), dest: path.join(outDir, 'src', 'shared') },
    { src: path.join(rootDir, 'icons'), dest: path.join(outDir, 'icons') },
  ];

  for (const { src, dest } of dirsToCopy) {
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }
}

/**
 * Generates dist/manifest.json with content_scripts rewritten to dist/content/*.js.
 *
 * @param {object} options
 * @param {string} [options.rootDir]
 * @param {string} [options.outDir]
 * @returns {object} updated manifest object
 */
export function generateDistManifest({
  rootDir = ROOT_DIR,
  outDir = path.join(ROOT_DIR, 'dist'),
} = {}) {
  const manifestPath = path.join(rootDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (Array.isArray(manifest.content_scripts)) {
    manifest.content_scripts = manifest.content_scripts.map((cs) => {
      const matches = cs.matches || [];
      if (matches.includes('<all_urls>')) {
        return {
          ...cs,
          js: ['dist/content/cosmetic.js'],
        };
      }
      if (matches.some((m) => m.includes('youtube.com'))) {
        return {
          ...cs,
          js: ['dist/content/youtube.js'],
        };
      }
      return cs;
    });
  }

  const outManifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(outManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

/**
 * Full build routine: bundles content scripts, copies static assets, and writes manifest.
 *
 * @param {object} options
 */
export async function buildExtension(options = {}) {
  const outDir = options.outDir || path.join(ROOT_DIR, 'dist');
  fs.mkdirSync(outDir, { recursive: true });

  await bundleContentScripts({ ...options, outDir });
  copyUnchangedDirectories({ ...options, outDir });
  generateDistManifest({ ...options, outDir });
}

// Execute directly if run via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildExtension()
    .then(() => {
      console.log('Build completed successfully.');
    })
    .catch((err) => {
      console.error('Build failed:', err);
      process.exit(1);
    });
}

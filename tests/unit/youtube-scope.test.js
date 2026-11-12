import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  YOUTUBE_SELECTORS,
  FORBIDDEN_YOUTUBE_SELECTORS,
} from '../../src/content/youtube/selectors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('YouTube strict scope verification (T5.4)', () => {
  const youtubeSourceFiles = [
    path.join(ROOT_DIR, 'src', 'content', 'youtube.js'),
    path.join(ROOT_DIR, 'src', 'content', 'youtube', 'youtube.js'),
    path.join(ROOT_DIR, 'src', 'content', 'youtube', 'selectors.js'),
  ];

  it('never references HTMLVideoElement or querySelector("video") in any YouTube script', () => {
    for (const filePath of youtubeSourceFiles) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const code = fs.readFileSync(filePath, 'utf8');

      expect(code).not.toMatch(/HTMLVideoElement/i);
      expect(code).not.toMatch(/querySelector\(\s*['"`]video/i);
      expect(code).not.toMatch(/querySelectorAll\(\s*['"`]video/i);
      expect(code).not.toMatch(/getElementsByTagName\(\s*['"`]video/i);
    }
  });

  it('never manipulates playback: no play, pause, playbackRate, currentTime, muted, volume, seek', () => {
    const forbiddenPlaybackTokens = [
      /\.play\s*\(/,
      /\.pause\s*\(/,
      /\.playbackRate\b/,
      /\.currentTime\b/,
      /\.muted\b/,
      /\.volume\b/,
      /\.seek\s*\(/,
      /\.fastForward\b/,
    ];

    for (const filePath of youtubeSourceFiles) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const code = fs.readFileSync(filePath, 'utf8');

      for (const pattern of forbiddenPlaybackTokens) {
        expect(code).not.toMatch(pattern);
      }
    }
  });

  it('never simulates clicks or interactions on buttons', () => {
    for (const filePath of youtubeSourceFiles) {
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).not.toMatch(/\.click\s*\(/);
    }
  });

  it('prohibits all forbidden selectors from appearing in YOUTUBE_SELECTORS', () => {
    for (const forbidden of FORBIDDEN_YOUTUBE_SELECTORS) {
      expect(YOUTUBE_SELECTORS).not.toContain(forbidden);
    }
  });

  it('restricts YouTube ad selectors strictly to cosmetic container hiding', () => {
    for (const sel of YOUTUBE_SELECTORS) {
      // Must not target media or core player controls
      expect(sel).not.toBe('video');
      expect(sel).not.toBe('audio');
      expect(sel).not.toContain('video-stream');
      expect(sel).not.toContain('html5-main-video');
    }
  });
});

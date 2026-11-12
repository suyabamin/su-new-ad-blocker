import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UTF8_FLAG = 0x0800;

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function collectFiles(rootDir, currentDir = rootDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in release output: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      return collectFiles(rootDir, fullPath);
    }
    if (!entry.isFile()) {
      return [];
    }
    return [{ fullPath, name: path.relative(rootDir, fullPath).split(path.sep).join('/') }];
  });
}

export function validatePackageFiles(fileNames) {
  if (!fileNames.includes('manifest.json')) {
    throw new Error('Release archive must contain manifest.json at its root.');
  }

  for (const name of fileNames) {
    const parts = name.split('/');
    const baseName = parts.at(-1).toLowerCase();
    if (name.toLowerCase().endsWith('.map')) {
      throw new Error(`Source maps are not allowed in release output: ${name}`);
    }
    if (baseName === '.env' || baseName.startsWith('.env.')) {
      throw new Error(`Environment files are not allowed in release output: ${name}`);
    }
    if (
      parts.some((part) => ['node_modules', 'tests', 'test', 'docs'].includes(part.toLowerCase()))
    ) {
      throw new Error(`Development files are not allowed in release output: ${name}`);
    }
    if (/\.(test|spec)\.[cm]?js$/i.test(baseName)) {
      throw new Error(`Test files are not allowed in release output: ${name}`);
    }
  }
}

function createZipRecords(files) {
  const localRecords = [];
  const centralRecords = [];
  let localOffset = 0;
  const { time, day } = dosTimestamp();

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = fs.readFileSync(file.fullPath);
    const compressed = deflateRawSync(data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localRecords.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralRecords.push(central);
    localOffset += local.length + compressed.length;
  }

  return { localRecords, centralRecords, centralOffset: localOffset };
}

export function createZipArchive(rootDir, archivePath) {
  const files = collectFiles(rootDir).sort((a, b) => a.name.localeCompare(b.name));
  validatePackageFiles(files.map(({ name }) => name));
  const { localRecords, centralRecords, centralOffset } = createZipRecords(files);
  const centralSize = centralRecords.reduce((sum, record) => sum + record.length, 0);
  if (files.length > 0xffff || centralOffset > 0xffffffff || centralSize > 0xffffffff) {
    throw new Error('Release archive exceeds classic ZIP format limits.');
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);

  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(archivePath, Buffer.concat([...localRecords, ...centralRecords, end]));
  return files.map(({ name }) => name);
}

function clearDist(rootDir) {
  const expectedPath = path.join(rootDir, 'dist');
  const distPath = path.resolve(expectedPath);
  if (distPath !== expectedPath || path.dirname(distPath) !== rootDir) {
    throw new Error(`Refusing to remove unexpected build path: ${distPath}`);
  }
  if (fs.existsSync(distPath)) {
    if (fs.lstatSync(distPath).isSymbolicLink()) {
      throw new Error(`Refusing to remove a linked build path: ${distPath}`);
    }
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

export function packageRelease(rootDir = ROOT_DIR) {
  clearDist(rootDir);
  const build = spawnSync(process.execPath, ['scripts/build.js'], {
    cwd: rootDir,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  });
  if (build.error) {
    throw build.error;
  }
  if (build.status !== 0) {
    throw new Error(`Production build failed with exit code ${build.status}.`);
  }

  const archivePath = path.join(rootDir, 'release', 'su_new_ad_blocker-0.1.0.zip');
  const files = createZipArchive(path.join(rootDir, 'dist'), archivePath);
  process.stdout.write(`Packaged ${files.length} files to ${archivePath}\n`);
  return { archivePath, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    packageRelease();
  } catch (error) {
    process.stderr.write(`Packaging failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

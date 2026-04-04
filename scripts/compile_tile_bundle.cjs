#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function usage() {
  throw new Error('用法: node scripts/compile_tile_bundle.cjs <sourcePath> <target>');
}

function resolveExistingPath(relativePath, label) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`${label} 缺失`);
  }

  const absolutePath = path.join(BASE, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} 不存在: ${relativePath}`);
  }

  return absolutePath;
}

function readJsonFile(absolutePath, label) {
  if (!absolutePath.toLowerCase().endsWith('.json')) {
    throw new Error(`${label} 必须是 .json 文件: ${path.relative(BASE, absolutePath)}`);
  }
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(relativePath, value) {
  const absolutePath = path.join(BASE, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function inferThemeKey(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.startsWith('base_') || normalized.startsWith('original_')) {
    return 'original';
  }
  if (normalized.endsWith('_tiles.json')) {
    return normalized.slice(0, -'_tiles.json'.length);
  }
  return normalized.replace(/\.json$/, '');
}

function compileTileFile(sourceValue) {
  if (sourceValue === null || typeof sourceValue !== 'object') {
    throw new Error('tile source 必须是 JSON object');
  }

  const original = Array.isArray(sourceValue.original) ? sourceValue.original : [];
  const volantis = Array.isArray(sourceValue.volantis) ? sourceValue.volantis : [];
  if (!Array.isArray(sourceValue.original) || !Array.isArray(sourceValue.volantis)) {
    throw new Error('单文件 tile source 必须包含 original 和 volantis 数组');
  }

  return { original, volantis };
}

function compileTileDirectory(sourceDir) {
  const files = fs.readdirSync(sourceDir)
    .filter((entry) => entry.toLowerCase().endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`sourceDir 中没有可编译的 .json 文件: ${path.relative(BASE, sourceDir)}`);
  }

  const tiles = {};
  for (const fileName of files) {
    const themeKey = inferThemeKey(fileName);
    if (tiles[themeKey]) {
      throw new Error(`重复的 tile 主题 key: ${themeKey}`);
    }

    const value = readJsonFile(path.join(sourceDir, fileName), `sourceDir/${fileName}`);
    if (!Array.isArray(value)) {
      throw new Error(`tile 文件必须是数组: ${path.join(path.relative(BASE, sourceDir), fileName)}`);
    }
    tiles[themeKey] = value;
  }

  return {
    original: tiles.original || [],
    volantis: tiles.volantis || [],
  };
}

function main() {
  if (args.length !== 2) {
    usage();
  }

  const [sourcePath, target] = args;
  const absoluteSourcePath = resolveExistingPath(sourcePath, 'sourcePath');
  const compiled = fs.statSync(absoluteSourcePath).isDirectory()
    ? compileTileDirectory(absoluteSourcePath)
    : compileTileFile(readJsonFile(absoluteSourcePath, 'sourcePath'));

  writeJson(target, compiled);
  console.log(`Compiled ${sourcePath} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_tile_bundle] ${error.message}`);
  process.exit(1);
}
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function usage() {
  throw new Error('用法: node scripts/compile_character_bundle.cjs <sourceDir> <target>');
}

function resolveExistingDirectory(relativePath, label) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`${label} 缺失`);
  }
  const absolutePath = path.join(BASE, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} 不存在: ${relativePath}`);
  }
  if (!fs.statSync(absolutePath).isDirectory()) {
    throw new Error(`${label} 必须是目录: ${relativePath}`);
  }
  return absolutePath;
}

function inferThemeKey(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.startsWith('base_') || normalized.startsWith('original_')) {
    return 'original';
  }
  if (normalized.endsWith('_characters.json')) {
    return normalized.slice(0, -'_characters.json'.length);
  }
  return normalized.replace(/\.json$/, '');
}

function readCharacterCollections(sourceDir) {
  const sourcePath = resolveExistingDirectory(sourceDir, 'sourceDir');
  const files = fs.readdirSync(sourcePath)
    .filter((entry) => entry.toLowerCase().endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`sourceDir 中没有可编译的 .json 文件: ${sourceDir}`);
  }

  const bundle = {};
  for (const fileName of files) {
    const themeKey = inferThemeKey(fileName);
    if (bundle[themeKey]) {
      throw new Error(`重复的角色主题 key: ${themeKey}`);
    }

    const value = JSON.parse(fs.readFileSync(path.join(sourcePath, fileName), 'utf8'));
    if (!Array.isArray(value)) {
      throw new Error(`角色文件必须是数组: ${path.join(sourceDir, fileName)}`);
    }
    bundle[themeKey] = value;
  }

  return bundle;
}

function writeJson(relativePath, value) {
  const absolutePath = path.join(BASE, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  if (args.length !== 2) {
    usage();
  }

  const [sourceDir, target] = args;
  const bundle = readCharacterCollections(sourceDir);
  writeJson(target, bundle);
  console.log(`Compiled ${sourceDir} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_character_bundle] ${error.message}`);
  process.exit(1);
}
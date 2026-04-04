#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function usage() {
  throw new Error('用法: node scripts/compile_json_bundle.cjs <source> <target>');
}

function assertJsonFile(relativePath, label) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`${label} 缺失`);
  }
  if (!relativePath.toLowerCase().endsWith('.json')) {
    throw new Error(`${label} 必须是 .json 文件: ${relativePath}`);
  }
  const absolutePath = path.join(BASE, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} 不存在: ${relativePath}`);
  }
  return absolutePath;
}

function readJson(relativePath, label) {
  const absolutePath = assertJsonFile(relativePath, label);
  return {
    absolutePath,
    value: JSON.parse(fs.readFileSync(absolutePath, 'utf8')),
  };
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

  const [source, target] = args;
  const { value } = readJson(source, 'source');

  if (value === null || typeof value !== 'object') {
    throw new Error(`source 必须是 JSON object 或 array: ${source}`);
  }

  writeJson(target, value);
  console.log(`Compiled ${source} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_json_bundle] ${error.message}`);
  process.exit(1);
}

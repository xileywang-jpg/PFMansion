#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'runtime_data_pipeline.json');
const args = new Set(process.argv.slice(2));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertExists(relativePath, label) {
  const absolutePath = path.join(BASE, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${label} 不存在: ${relativePath}`);
  }
  return absolutePath;
}

function loadManifest() {
  const manifest = readJson(MANIFEST_PATH);
  if (!Array.isArray(manifest.generatedTargets)) {
    throw new Error('runtime_data_pipeline.json 缺少 generatedTargets 数组');
  }
  if (!Array.isArray(manifest.manualRuntimeTargets)) {
    throw new Error('runtime_data_pipeline.json 缺少 manualRuntimeTargets 数组');
  }
  if (!Array.isArray(manifest.historicalPipelines)) {
    throw new Error('runtime_data_pipeline.json 缺少 historicalPipelines 数组');
  }
  return manifest;
}

function validateManifest(manifest) {
  const seenTargets = new Map();

  for (const entry of manifest.generatedTargets) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('generatedTargets 条目必须是对象');
    }
    if (!entry.name || !entry.source || !entry.builder || !Array.isArray(entry.targets) || entry.targets.length === 0) {
      throw new Error('generatedTargets 条目缺少 name/source/builder/targets');
    }
    if (entry.builderArgs != null && !Array.isArray(entry.builderArgs)) {
      throw new Error(`generatedTargets.${entry.name}.builderArgs 必须是数组`);
    }
    assertExists(entry.source, `${entry.name} source`);
    assertExists(entry.builder, `${entry.name} builder`);
    for (const target of entry.targets) {
      if (seenTargets.has(target)) {
        throw new Error(`runtime target 重复声明: ${target}`);
      }
      seenTargets.set(target, entry.name);
    }
  }

  for (const entry of manifest.manualRuntimeTargets) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('manualRuntimeTargets 条目必须是对象');
    }
    if (!entry.target || !entry.authority || !entry.status) {
      throw new Error('manualRuntimeTargets 条目缺少 target/authority/status');
    }
    if (seenTargets.has(entry.target)) {
      throw new Error(`runtime target 同时被声明为 generated 与 manual: ${entry.target}`);
    }
    seenTargets.set(entry.target, entry.status);
    assertExists(entry.target, `manual runtime target`);
  }

  for (const entry of manifest.historicalPipelines) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('historicalPipelines 条目必须是对象');
    }
    if (!entry.name || !entry.builder || !entry.target || !entry.status) {
      throw new Error('historicalPipelines 条目缺少 name/builder/target/status');
    }
    assertExists(entry.builder, `${entry.name} builder`);
  }
}

function printPipeline(manifest) {
  console.log('Runtime data pipeline');
  console.log('');
  console.log('Generated targets:');
  for (const entry of manifest.generatedTargets) {
	const builderArgs = Array.isArray(entry.builderArgs) && entry.builderArgs.length > 0 ? ` ${entry.builderArgs.join(' ')}` : '';
	console.log(`- ${entry.name}: ${entry.source} -> ${entry.targets.join(', ')} via ${entry.builder}${builderArgs}`);
  }
  console.log('');
  console.log('Manual runtime targets:');
  for (const entry of manifest.manualRuntimeTargets) {
    console.log(`- ${entry.target}: ${entry.status}`);
  }
  console.log('');
  console.log('Historical non-runtime pipelines:');
  for (const entry of manifest.historicalPipelines) {
    console.log(`- ${entry.name}: ${entry.builder} -> ${entry.target} (${entry.status})`);
  }
}

function runBuilder(relativeScriptPath, builderArgs) {
  const scriptPath = path.join(BASE, relativeScriptPath);
  const result = spawnSync(process.execPath, [scriptPath, ...(builderArgs || [])], {
    cwd: BASE,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`builder 执行失败: ${relativeScriptPath}`);
  }
}

function runNodeScript(relativeScriptPath, scriptArgs = []) {
  const scriptPath = path.join(BASE, relativeScriptPath);
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: BASE,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`script 执行失败: ${relativeScriptPath}`);
  }
}

function main() {
  const manifest = loadManifest();
  validateManifest(manifest);

  if (args.has('--list')) {
    printPipeline(manifest);
    return;
  }

  console.log('Compiling runtime data from declared authoritative sources...');
  for (const entry of manifest.generatedTargets) {
    console.log(`- ${entry.name}`);
    runBuilder(entry.builder, entry.builderArgs);
    for (const target of entry.targets) {
      assertExists(target, `${entry.name} target`);
    }
  }

  console.log('');
  console.log('Runtime-owned manual targets:');
  for (const entry of manifest.manualRuntimeTargets) {
    console.log(`- ${entry.target}`);
  }

  if (!args.has('--skip-validate-authoring')) {
    console.log('');
    runNodeScript('scripts/validate_authoring_data.cjs');
  }
}

try {
  main();
} catch (error) {
  console.error(`[compile_runtime_data] ${error.message}`);
  process.exit(1);
}

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SUPPORTED_THEMES = new Set(['original', 'volantis']);

function usage() {
  throw new Error('用法: node scripts/compile_skill_tree_bundle.cjs <source> <target>');
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
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function writeJson(relativePath, value) {
  const absolutePath = path.join(BASE, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeTheme(treeID, explicitTheme, themeHint) {
  const normalizedExplicitTheme = String(explicitTheme || '').trim().toLowerCase();
  const normalizedThemeHint = String(themeHint || '').trim().toLowerCase();

  if (normalizedExplicitTheme) {
    if (!SUPPORTED_THEMES.has(normalizedExplicitTheme)) {
      throw new Error(`skill tree ${treeID} 主题非法: ${normalizedExplicitTheme}`);
    }
    if (normalizedThemeHint && normalizedExplicitTheme !== normalizedThemeHint) {
      throw new Error(`skill tree ${treeID} 主题冲突: ${normalizedExplicitTheme} != ${normalizedThemeHint}`);
    }
    return normalizedExplicitTheme;
  }

  if (normalizedThemeHint) {
    if (!SUPPORTED_THEMES.has(normalizedThemeHint)) {
      throw new Error(`skill tree ${treeID} 主题非法: ${normalizedThemeHint}`);
    }
    return normalizedThemeHint;
  }

  throw new Error(`skill tree ${treeID} 缺少显式 theme；请在 authoring 中设置 theme 或使用顶层主题分组`);
}

function compileSkillTrees(sourceValue) {
  if (sourceValue === null || Array.isArray(sourceValue) || typeof sourceValue !== 'object') {
    throw new Error('skill tree source 必须是 JSON object');
  }

  const rawTrees = sourceValue.trees;
  if (rawTrees === null || typeof rawTrees !== 'object') {
    throw new Error('source.trees 缺失或非法');
  }

  const buckets = {
    original: [],
    volantis: [],
  };

  const pushTree = (rawTree, themeHint = '') => {
    if (rawTree === null || Array.isArray(rawTree) || typeof rawTree !== 'object') {
      throw new Error('skill tree 必须是 object');
    }
    if (!rawTree.id) {
      throw new Error('skill tree 缺少 id');
    }

    const tree = { ...rawTree };
    const theme = normalizeTheme(tree.id, tree.theme, themeHint);
    tree.theme = theme;
    buckets[theme].push(tree);
  };

  if (Array.isArray(rawTrees)) {
    for (const tree of rawTrees) {
      pushTree(tree);
    }
  } else {
    for (const theme of ['original', 'volantis']) {
      const themedTrees = rawTrees[theme] || [];
      if (!Array.isArray(themedTrees)) {
        throw new Error(`trees.${theme} 必须是 array`);
      }
      for (const tree of themedTrees) {
        pushTree(tree, theme);
      }
    }
  }

  return { trees: buckets };
}

function main() {
  if (args.length !== 2) {
    usage();
  }

  const [source, target] = args;
  const compiled = compileSkillTrees(readJson(source, 'source'));
  writeJson(target, compiled);
  console.log(`Compiled ${source} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_skill_tree_bundle] ${error.message}`);
  process.exit(1);
}
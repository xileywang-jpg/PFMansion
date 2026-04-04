#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SUPPORTED_THEMES = new Set(['original', 'volantis']);

function usage() {
  throw new Error('用法: node scripts/compile_item_bundle.cjs <baseItems> <rewardItems> <skillsPath> <target>');
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

function normalizeTheme(cardID, explicitTheme, themeHint = '') {
  const candidate = String(explicitTheme || themeHint || '').trim().toLowerCase();
  if (candidate) {
    if (!SUPPORTED_THEMES.has(candidate)) {
      throw new Error(`card ${cardID} 主题非法: ${candidate}`);
    }
    return candidate;
  }
  return String(cardID).startsWith('vol_') ? 'volantis' : 'original';
}

function inferThemeKey(fileName, suffix) {
  const normalized = fileName.toLowerCase();
  if (normalized.startsWith('base_') || normalized.startsWith('original_')) {
    return 'original';
  }
  if (normalized.endsWith(suffix)) {
    return normalized.slice(0, -suffix.length);
  }
  return normalized.replace(/\.json$/, '');
}

function compileThemedCardMap(sourceValue, label) {
  if (sourceValue === null || Array.isArray(sourceValue) || typeof sourceValue !== 'object') {
    throw new Error(`${label} 必须是按 id 分组的 JSON object`);
  }

  const themedCards = {
    original: [],
    volantis: [],
  };
  const topLevelKeys = Object.keys(sourceValue);
  const hasExplicitThemeGroups = topLevelKeys.length > 0 && topLevelKeys.every((key) => SUPPORTED_THEMES.has(key));

  const pushCompiledCard = (cardID, rawCard, themeHint = '') => {
    if (rawCard === null || Array.isArray(rawCard) || typeof rawCard !== 'object') {
      throw new Error(`${label}.${cardID} 必须是 object`);
    }

    const compiledCard = { ...rawCard };
    if (!compiledCard.id) {
      compiledCard.id = cardID;
    }
    if (compiledCard.id !== cardID) {
      throw new Error(`${label} key/id 不一致: ${cardID} != ${compiledCard.id}`);
    }

    const theme = normalizeTheme(compiledCard.id, compiledCard.theme, themeHint);
    compiledCard.theme = theme;
    themedCards[theme].push(compiledCard);
  };

  if (hasExplicitThemeGroups) {
    for (const theme of ['original', 'volantis']) {
      const themedSource = sourceValue[theme] || {};
      if (themedSource === null || Array.isArray(themedSource) || typeof themedSource !== 'object') {
        throw new Error(`${label}.${theme} 必须是按 id 分组的 JSON object`);
      }
      for (const cardID of Object.keys(themedSource).sort()) {
        pushCompiledCard(cardID, themedSource[cardID], theme);
      }
    }
  } else {
    for (const cardID of topLevelKeys.sort()) {
      pushCompiledCard(cardID, sourceValue[cardID]);
    }
  }

  return themedCards;
}

function mapToSortedCards(sourceValue, label) {
  if (sourceValue === null || Array.isArray(sourceValue) || typeof sourceValue !== 'object') {
    throw new Error(`${label} 必须是按 id 分组的 JSON object`);
  }

  const cards = [];
  for (const cardID of Object.keys(sourceValue).sort()) {
    const rawCard = sourceValue[cardID];
    if (rawCard === null || Array.isArray(rawCard) || typeof rawCard !== 'object') {
      throw new Error(`${label}.${cardID} 必须是 object`);
    }

    const compiledCard = { ...rawCard };
    if (!compiledCard.id) {
      compiledCard.id = cardID;
    }
    if (compiledCard.id !== cardID) {
      throw new Error(`${label} key/id 不一致: ${cardID} != ${compiledCard.id}`);
    }
    cards.push(compiledCard);
  }

  return cards;
}

function compileStrictThemedCardMap(sourceValue, label) {
  if (sourceValue === null || Array.isArray(sourceValue) || typeof sourceValue !== 'object') {
    throw new Error(`${label} 必须是按 id 分组的 JSON object`);
  }

  const themedCards = {
    original: [],
    volantis: [],
  };
  const topLevelKeys = Object.keys(sourceValue);
  const hasExplicitThemeGroups = topLevelKeys.length > 0 && topLevelKeys.every((key) => SUPPORTED_THEMES.has(key));

  const pushCompiledCard = (cardID, rawCard, themeHint = '') => {
    if (rawCard === null || Array.isArray(rawCard) || typeof rawCard !== 'object') {
      throw new Error(`${label}.${cardID} 必须是 object`);
    }

    const compiledCard = { ...rawCard };
    if (!compiledCard.id) {
      compiledCard.id = cardID;
    }
    if (compiledCard.id !== cardID) {
      throw new Error(`${label} key/id 不一致: ${cardID} != ${compiledCard.id}`);
    }

    const normalizedExplicitTheme = String(compiledCard.theme || '').trim().toLowerCase();
    const normalizedThemeHint = String(themeHint || '').trim().toLowerCase();
    let theme = normalizedExplicitTheme || normalizedThemeHint;
    if (!theme) {
      throw new Error(`${label}.${cardID} 缺少显式 theme；请在 authoring 中设置 theme 或使用顶层主题分组`);
    }
    if (!SUPPORTED_THEMES.has(theme)) {
      throw new Error(`${label}.${cardID} 主题非法: ${theme}`);
    }
    if (normalizedExplicitTheme && normalizedThemeHint && normalizedExplicitTheme !== normalizedThemeHint) {
      throw new Error(`${label}.${cardID} 主题冲突: ${normalizedExplicitTheme} != ${normalizedThemeHint}`);
    }

    compiledCard.theme = theme;
    themedCards[theme].push(compiledCard);
  };

  if (hasExplicitThemeGroups) {
    for (const theme of ['original', 'volantis']) {
      const themedSource = sourceValue[theme] || {};
      if (themedSource === null || Array.isArray(themedSource) || typeof themedSource !== 'object') {
        throw new Error(`${label}.${theme} 必须是按 id 分组的 JSON object`);
      }
      for (const cardID of Object.keys(themedSource).sort()) {
        pushCompiledCard(cardID, themedSource[cardID], theme);
      }
    }
  } else {
    for (const cardID of topLevelKeys.sort()) {
      pushCompiledCard(cardID, sourceValue[cardID]);
    }
  }

  return themedCards;
}

function mergeThemeBuckets(target, source) {
  target.original.push(...source.original);
  target.volantis.push(...source.volantis);
}

function compileStrictThemedCardDirectory(sourceDir, label, suffix) {
  const files = fs.readdirSync(sourceDir)
    .filter((entry) => entry.toLowerCase().endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`${label} 目录中没有可编译的 .json 文件: ${path.relative(BASE, sourceDir)}`);
  }

  const themedCards = {
    original: [],
    volantis: [],
  };

  for (const fileName of files) {
    const themeHint = inferThemeKey(fileName, suffix);
    const raw = readJsonFile(path.join(sourceDir, fileName), `${label}/${fileName}`);
    const compiled = compileStrictThemedCardMap(raw, `${label}/${fileName}`);

    if (themeHint === 'original' || themeHint === 'volantis') {
      for (const card of compiled.original) {
        if (card.theme !== themeHint) {
          throw new Error(`${label}/${fileName} 中存在主题冲突: ${card.id} -> ${card.theme}`);
        }
      }
      for (const card of compiled.volantis) {
        if (card.theme !== themeHint) {
          throw new Error(`${label}/${fileName} 中存在主题冲突: ${card.id} -> ${card.theme}`);
        }
      }
    }

    mergeThemeBuckets(themedCards, compiled);
  }

  return themedCards;
}

function compileStrictThemedCardInput(relativePath, label, suffix) {
  const absolutePath = resolveExistingPath(relativePath, label);
  if (fs.statSync(absolutePath).isDirectory()) {
    return compileStrictThemedCardDirectory(absolutePath, label, suffix);
  }
  return compileStrictThemedCardMap(readJsonFile(absolutePath, label), label);
}

function compileItemsBundle(baseItemsValue, rewardItemsValue, skillsInput) {
  const baseCards = compileThemedCardMap(baseItemsValue, 'baseItems');
  const rewardItems = compileStrictThemedCardMap(rewardItemsValue, 'rewardItems');
  const skills = skillsInput;

  const items = {
    original: [],
    volantis: [],
  };
  const omens = {
    original: [],
    volantis: [],
  };

  for (const theme of ['original', 'volantis']) {
    for (const card of baseCards[theme]) {
      if (String(card.type || '').toUpperCase() === 'OMEN' || String(card.id || '').startsWith('omen_')) {
        omens[theme].push(card);
        continue;
      }
      items[theme].push(card);
    }
  }

  return {
    items,
    rewardItems,
    omens,
    skills,
  };
}

function main() {
  if (args.length !== 4) {
    usage();
  }

  const [baseItems, rewardItems, skillsPath, target] = args;
  const compiled = compileItemsBundle(
    readJsonFile(resolveExistingPath(baseItems, 'baseItems'), 'baseItems'),
    readJsonFile(resolveExistingPath(rewardItems, 'rewardItems'), 'rewardItems'),
    compileStrictThemedCardInput(skillsPath, 'skills', '_skills.json'),
  );
  writeJson(target, compiled);
  console.log(`Compiled ${baseItems} + ${rewardItems} + ${skillsPath} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_item_bundle] ${error.message}`);
  process.exit(1);
}
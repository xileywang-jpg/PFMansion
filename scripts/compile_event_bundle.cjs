#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SUPPORTED_THEMES = new Set(['original', 'volantis']);

function usage() {
  throw new Error('用法: node scripts/compile_event_bundle.cjs <sourcePath> <target>');
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

function inferTheme(cardID, explicitTheme, themeHint) {
  const normalizedExplicitTheme = String(explicitTheme || '').trim().toLowerCase();
  const normalizedThemeHint = String(themeHint || '').trim().toLowerCase();

  if (normalizedExplicitTheme) {
    if (!SUPPORTED_THEMES.has(normalizedExplicitTheme)) {
      throw new Error(`event ${cardID} 主题非法: ${normalizedExplicitTheme}`);
    }
    if (normalizedThemeHint && normalizedExplicitTheme !== normalizedThemeHint) {
      throw new Error(`event ${cardID} 主题冲突: ${normalizedExplicitTheme} != ${normalizedThemeHint}`);
    }
    return normalizedExplicitTheme;
  }

  if (normalizedThemeHint) {
    if (!SUPPORTED_THEMES.has(normalizedThemeHint)) {
      throw new Error(`event ${cardID} 主题非法: ${normalizedThemeHint}`);
    }
    return normalizedThemeHint;
  }

  throw new Error(`event ${cardID} 缺少显式 theme；请在 authoring 中设置 theme 或使用顶层主题分组`);
}

function inferThemeKey(fileName) {
  const normalized = fileName.toLowerCase();
  if (normalized.startsWith('base_') || normalized.startsWith('original_')) {
    return 'original';
  }
  if (normalized.endsWith('_events.json')) {
    return normalized.slice(0, -'_events.json'.length);
  }
  return normalized.replace(/\.json$/, '');
}

function pushCompiledEvent(themeBuckets, eventID, rawEvent, themeHint = '') {
  if (rawEvent === null || Array.isArray(rawEvent) || typeof rawEvent !== 'object') {
    throw new Error(`event ${eventID} 必须是 object`);
  }

  const compiledEvent = { ...rawEvent };
  if (!compiledEvent.id) {
    compiledEvent.id = eventID;
  }
  if (compiledEvent.id !== eventID) {
    throw new Error(`event key/id 不一致: ${eventID} != ${compiledEvent.id}`);
  }
  if (compiledEvent.title && !compiledEvent.name) {
    compiledEvent.name = compiledEvent.title;
  }
  if (compiledEvent.name && !compiledEvent.title) {
    compiledEvent.title = compiledEvent.name;
  }

  const theme = inferTheme(compiledEvent.id, compiledEvent.theme, themeHint);
  compiledEvent.theme = theme;
  themeBuckets[theme].push(compiledEvent);
}

function compileEventMap(sourceValue) {
  if (sourceValue === null || Array.isArray(sourceValue) || typeof sourceValue !== 'object') {
    throw new Error('event source 必须是按 id 分组的 JSON object');
  }

  const events = {
    original: [],
    volantis: [],
  };
  const topLevelKeys = Object.keys(sourceValue);
  const hasExplicitThemeGroups = topLevelKeys.length > 0 && topLevelKeys.every((key) => SUPPORTED_THEMES.has(key));

  if (hasExplicitThemeGroups) {
    for (const theme of ['original', 'volantis']) {
      const themedEvents = sourceValue[theme] || {};
      if (themedEvents === null || Array.isArray(themedEvents) || typeof themedEvents !== 'object') {
        throw new Error(`events.${theme} 必须是按 id 分组的 JSON object`);
      }
      for (const eventID of Object.keys(themedEvents).sort()) {
        pushCompiledEvent(events, eventID, themedEvents[eventID], theme);
      }
    }
  } else {
    for (const eventID of topLevelKeys.sort()) {
      pushCompiledEvent(events, eventID, sourceValue[eventID]);
    }
  }

  return { events };
}

function mergeEventBuckets(target, source) {
  target.original.push(...source.original);
  target.volantis.push(...source.volantis);
}

function compileEventDirectory(sourceDir) {
  const files = fs.readdirSync(sourceDir)
    .filter((entry) => entry.toLowerCase().endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`sourceDir 中没有可编译的 .json 文件: ${path.relative(BASE, sourceDir)}`);
  }

  const compiled = {
    original: [],
    volantis: [],
  };

  for (const fileName of files) {
    const themeHint = inferThemeKey(fileName);
    const raw = readJsonFile(path.join(sourceDir, fileName), `sourceDir/${fileName}`);

    if (raw === null || Array.isArray(raw) || typeof raw !== 'object') {
      throw new Error(`event source 必须是按 id 分组的 JSON object: ${fileName}`);
    }

    const bucket = {
      original: [],
      volantis: [],
    };

    for (const eventID of Object.keys(raw).sort()) {
      pushCompiledEvent(bucket, eventID, raw[eventID], themeHint);
    }

    mergeEventBuckets(compiled, bucket);
  }

  return { events: compiled };
}

function main() {
  if (args.length !== 2) {
    usage();
  }

  const [sourcePath, target] = args;
  const absoluteSourcePath = resolveExistingPath(sourcePath, 'sourcePath');
  const compiled = fs.statSync(absoluteSourcePath).isDirectory()
    ? compileEventDirectory(absoluteSourcePath)
    : compileEventMap(readJsonFile(absoluteSourcePath, 'sourcePath'));
  writeJson(target, compiled);
  console.log(`Compiled ${sourcePath} -> ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`[compile_event_bundle] ${error.message}`);
  process.exit(1);
}
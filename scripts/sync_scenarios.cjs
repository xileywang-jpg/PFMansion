#!/usr/bin/env node
/**
 * Sync runtime scenario data from a single authored JSON source.
 *
 * Authoritative source:
 *   raw_data/scenarios/runtime_scenarios.json
 *
 * Generated targets:
 *   game/data/scenarios.json
 *   data/generated/runtimeScenarios.ts
 *
 * Usage:
 *   node scripts/sync_scenarios.cjs
 *   node scripts/sync_scenarios.cjs --bootstrap
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const SOURCE_PATH = path.join(BASE, 'raw_data', 'scenarios', 'runtime_scenarios.json');
const BACKEND_PATH = path.join(BASE, 'game', 'data', 'scenarios.json');
const FRONTEND_PATH = path.join(BASE, 'data', 'generated', 'runtimeScenarios.ts');
const SUPPORTED_OBJECTIVE_EVENT_TYPES = new Set([
  'PLAYER_DEATH',
  'TILE_REACHED',
  'ITEM_COLLECTED',
  'RITUAL_COMPLETED',
  'TURNS_SURVIVED',
  'OMEN_USED',
  'ROOM_EXPLORED',
]);

const args = new Set(process.argv.slice(2));

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateObjectiveDefinition(objective, context) {
  if (!isPlainObject(objective)) {
    throw new Error(`${context} 必须是对象`);
  }
  if (!isNonEmptyString(objective.name)) {
    throw new Error(`${context}.name 不能为空`);
  }
  if (!isNonEmptyString(objective.description)) {
    throw new Error(`${context}.description 不能为空`);
  }
  if (!isNonEmptyString(objective.type)) {
    throw new Error(`${context}.type 不能为空`);
  }
  if ('target' in objective || 'turns' in objective || 'customId' in objective) {
    throw new Error(`${context} 不应再使用顶层 target/turns/customId，请迁移到 params`);
  }
  if (!isPlainObject(objective.params)) {
    throw new Error(`${context}.params 必须是对象`);
  }
  if (!isPositiveInteger(objective.params.turns)) {
    throw new Error(`${context}.params.turns 必须是正整数`);
  }
  if ('required' in objective.params && !isPositiveInteger(objective.params.required)) {
    throw new Error(`${context}.params.required 必须是正整数`);
  }
  if (!isNonEmptyString(objective.params.eventType)) {
    throw new Error(`${context}.params.eventType 不能为空`);
  }

  const type = objective.type.trim().toUpperCase();
  const eventType = objective.params.eventType.trim().toUpperCase();
  if (!SUPPORTED_OBJECTIVE_EVENT_TYPES.has(eventType)) {
    throw new Error(`${context}.params.eventType 不支持: ${objective.params.eventType}`);
  }

  switch (type) {
    case 'ELIMINATE':
    case 'CONVERT':
    case 'REACH':
    case 'COLLECT':
    case 'OPEN_GATE':
      if (!isNonEmptyString(objective.params.target)) {
        throw new Error(`${context}.params.target 不能为空`);
      }
      break;
    case 'CUSTOM':
      if (!isNonEmptyString(objective.params.customId)) {
        throw new Error(`${context}.params.customId 不能为空`);
      }
      break;
    default:
      break;
  }
}

function validateScenarioBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('scenario bundle 必须是对象');
  }
  if (!bundle.hauntMatrix || typeof bundle.hauntMatrix !== 'object' || Array.isArray(bundle.hauntMatrix)) {
    throw new Error('scenario bundle 缺少 hauntMatrix 对象');
  }
  if (!bundle.scenarios || typeof bundle.scenarios !== 'object' || Array.isArray(bundle.scenarios)) {
    throw new Error('scenario bundle 缺少 scenarios 对象');
  }

  for (const [theme, matrix] of Object.entries(bundle.hauntMatrix)) {
    if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
      throw new Error(`hauntMatrix.${theme} 必须是对象`);
    }
  }

  for (const [scenarioId, scenario] of Object.entries(bundle.scenarios)) {
    if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
      throw new Error(`scenarios.${scenarioId} 必须是对象`);
    }
    if (scenario.id !== scenarioId) {
      throw new Error(`scenarios.${scenarioId}.id 必须与 key 一致`);
    }
    if (typeof scenario.name !== 'string' || scenario.name.trim() === '') {
      throw new Error(`scenarios.${scenarioId}.name 不能为空`);
    }
    if (typeof scenario.introText !== 'string') {
      throw new Error(`scenarios.${scenarioId}.introText 必须是字符串`);
    }
    if (typeof scenario.traitorRule !== 'string' || scenario.traitorRule.trim() === '') {
      throw new Error(`scenarios.${scenarioId}.traitorRule 不能为空`);
    }
    if (scenario.heroObjective) {
      validateObjectiveDefinition(scenario.heroObjective, `scenarios.${scenarioId}.heroObjective`);
    }
    if (scenario.traitorObjective) {
      validateObjectiveDefinition(scenario.traitorObjective, `scenarios.${scenarioId}.traitorObjective`);
    }
  }

  return {
    scenarioCount: Object.keys(bundle.scenarios).length,
    themeCount: Object.keys(bundle.hauntMatrix).length,
  };
}

function writeFrontendModule(filePath, bundle) {
  const content = `// This file is auto-generated by scripts/sync_scenarios.cjs\n// Do not edit this file directly. Edit raw_data/scenarios/runtime_scenarios.json instead.\n\nexport const HAUNT_MATRIX_DATA = ${JSON.stringify(bundle.hauntMatrix, null, 2)} as const;\n\nexport const SCENARIOS_DATA = ${JSON.stringify(bundle.scenarios, null, 2)} as const;\n\nexport const SCENARIO_RUNTIME_DATA = ${JSON.stringify(bundle, null, 2)} as const;\n`;
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, content);
}

function bootstrapSourceFromBackend() {
  if (fs.existsSync(SOURCE_PATH)) {
    return false;
  }
  if (!fs.existsSync(BACKEND_PATH)) {
    throw new Error(`无法 bootstrap：缺少 ${BACKEND_PATH}`);
  }
  const backendBundle = readJson(BACKEND_PATH);
  validateScenarioBundle(backendBundle);
  writeJson(SOURCE_PATH, backendBundle);
  return true;
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    if (!args.has('--bootstrap')) {
      throw new Error(`缺少权威 scenario 源 ${SOURCE_PATH}；首次运行请加 --bootstrap`);
    }
    const bootstrapped = bootstrapSourceFromBackend();
    if (bootstrapped) {
      console.log(`Bootstrapped ${path.relative(BASE, SOURCE_PATH)} from ${path.relative(BASE, BACKEND_PATH)}`);
    }
  }

  const bundle = readJson(SOURCE_PATH);
  const summary = validateScenarioBundle(bundle);

  writeJson(BACKEND_PATH, bundle);
  writeFrontendModule(FRONTEND_PATH, bundle);

  console.log(`Synced ${summary.scenarioCount} scenarios across ${summary.themeCount} haunt themes`);
  console.log(`  source:   ${path.relative(BASE, SOURCE_PATH)}`);
  console.log(`  backend:  ${path.relative(BASE, BACKEND_PATH)}`);
  console.log(`  frontend: ${path.relative(BASE, FRONTEND_PATH)}`);
}

try {
  main();
} catch (error) {
  console.error(`[sync_scenarios] ${error.message}`);
  process.exit(1);
}
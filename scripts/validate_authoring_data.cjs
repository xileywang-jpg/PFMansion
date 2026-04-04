#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const BASE = path.resolve(__dirname, '..');
const TEST_NAME = '^TestRuntimeDataAuthoringValidation$';

function main() {
  console.log('Validating authored runtime data through Go loader...');

  const result = spawnSync('go', ['test', './game', '-run', TEST_NAME, '-count=1'], {
    cwd: BASE,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('authoring data validation failed');
  }
}

try {
  main();
} catch (error) {
  console.error(`[validate_authoring_data] ${error.message}`);
  process.exit(1);
}
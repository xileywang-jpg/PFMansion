const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_TARGETS = [
  'components',
  'hooks',
  'src',
  'store',
  'utils',
  'ws',
  'constants.ts',
  'types.ts',
];
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const FORBIDDEN_PATTERNS = [
  {
    name: 'removed static export import',
    test: (specifier) => /(^|\/)data\/source(\/|$)/.test(specifier),
  },
  {
    name: 'retired static wrapper import',
    test: (specifier) => /(^|\/)data\/(events|items|skills|scenarios|hauntMatrix)(\.[a-z]+)?$/.test(specifier),
  },
  {
    name: 'retired theme config import',
    test: (specifier) => /(^|\/)config\/themes(\.[a-z]+)?$/.test(specifier),
  },
];

const IMPORT_PATTERNS = [
  /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]/g,
  /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  /require\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function walk(entryPath, files = []) {
  const stat = fs.statSync(entryPath);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(entryPath)) {
      walk(path.join(entryPath, child), files);
    }
    return files;
  }

  if (ALLOWED_EXTENSIONS.has(path.extname(entryPath))) {
    files.push(entryPath);
  }

  return files;
}

function collectRuntimeFiles() {
  const files = [];
  for (const target of RUNTIME_TARGETS) {
    const fullPath = path.join(ROOT, target);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    walk(fullPath, files);
  }
  return files;
}

function getImportSpecifiers(content) {
  const specifiers = [];
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function main() {
  const violations = [];
  const runtimeFiles = collectRuntimeFiles();

  for (const filePath of runtimeFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const specifiers = getImportSpecifiers(content);

    for (const specifier of specifiers) {
      for (const rule of FORBIDDEN_PATTERNS) {
        if (rule.test(specifier)) {
          violations.push({
            filePath: path.relative(ROOT, filePath).replace(/\\/g, '/'),
            specifier,
            rule: rule.name,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('Runtime data boundary validation failed.');
    for (const violation of violations) {
      console.error(`- ${violation.filePath}: ${violation.rule} -> ${violation.specifier}`);
    }
    process.exit(1);
  }

  console.log(`Runtime data boundary validation passed (${runtimeFiles.length} files checked).`);
}

main();
#!/usr/bin/env node
/**
 * 自动扫描主题目录并生成聚合 index.ts
 * 
 * 用法: node scripts/generateDataIndex.js
 * 
 * 扫描 data/source/ 下的所有主题目录，
 * 自动生成聚合各个卡牌类型的 index.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '..', 'data', 'source');
const CARD_TYPES = ['characters', 'items', 'tiles', 'events', 'skills', 'scenarios', 'skillTrees', 'omens'];

// 获取所有主题目录（排除卡牌类型目录本身）
function getThemeDirs() {
  const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !CARD_TYPES.includes(e.name))
    .map(e => e.name);
}

// 导出名称映射
const EXPORT_NAME_MAP = {
  characters: 'CHARACTERS_DATA',
  items: 'ITEMS_DATA',
  events: 'EVENTS_DATA',
  skills: 'SKILLS_DATA',
  scenarios: 'SCENARIOS_DATA',
  skillTrees: 'SKILL_TREES',
  omens: 'OMENS_DATA',
  tiles: 'TILES_DATA'
};

// 为每个卡牌类型生成聚合 index.ts
function generateTypeIndex(themeDirs, cardType) {
  const imports = [];
  const mergeExpressions = [];
  const exportName = EXPORT_NAME_MAP[cardType];
  
  // 收集所有主题中该类型的导出
  for (const theme of themeDirs) {
    const typeDir = path.join(SOURCE_DIR, theme, cardType);
    if (fs.existsSync(typeDir)) {
      const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.ts') && !f.startsWith('index'));
      
      for (const file of files) {
        const moduleName = file.replace('.ts', '');
        const varName = `${theme}_${moduleName}`;
        
        // 修正路径：相对于 cardType/index.ts，需要 ../theme/cardType/moduleName
        imports.push(`import { ${exportName} as ${varName} } from '../${theme}/${cardType}/${moduleName}';`);
        mergeExpressions.push(`...${varName}`);
      }
    }
  }
  
  // 生成导出 - 数组类型 vs 对象类型
  const isArrayType = ['characters', 'tiles', 'skillTrees'].includes(cardType);
  let exportStr;
  
  if (isArrayType) {
    exportStr = `export const ${exportName} = [\n  ${mergeExpressions.join(',\n  ')}\n];`;
  } else {
    exportStr = `export const ${exportName} = {\n  ${mergeExpressions.join(',\n  ')}\n};`;
  }
  
  return { imports, exportStr };
}

function main() {
  const themeDirs = getThemeDirs();
  console.log('发现主题:', themeDirs);
  
  for (const cardType of CARD_TYPES) {
    const { imports, exportStr } = generateTypeIndex(themeDirs, cardType);
    
    if (imports.length === 0) {
      console.log(`跳过 ${cardType} (无数据)`);
      continue;
    }
    
    const content = `// ⚠️ 此文件由脚本自动生成，请勿手动编辑
// 运行 npm run gen-data 或 node scripts/generateDataIndex.js 重新生成

${imports.join('\n')}

${exportStr}
`;
    
    const outputPath = path.join(SOURCE_DIR, cardType, 'index.ts');
    fs.writeFileSync(outputPath, content);
    console.log(`✅ 已生成: ${outputPath}`);
  }
  
  console.log('\n🎉 数据索引生成完成！');
}

main();

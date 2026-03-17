// 日志工具 - 鉴权服务用
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志目录
const LOG_DIR = process.env.LOG_DIR || '/var/log/pfmansion';
const LOG_FILE = path.join(LOG_DIR, 'auth.log');
const DEBUG_FILE = path.join(LOG_DIR, 'debug.log');

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLevel = LOG_LEVELS.DEBUG; // 默认debug模式

// 确保日志目录存在
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// 格式化日志
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    logLine += ` ${JSON.stringify(data)}`;
  }
  
  return logLine;
}

// 写入日志文件
function writeLog(filePath, content) {
  try {
    ensureLogDir();
    fs.appendFileSync(filePath, content + '\n');
  } catch (e) {
    console.error('写入日志失败:', e.message);
  }
}

// 主日志函数
export function log(level, message, data = null) {
  // 检查日志级别
  if (LOG_LEVELS[level] === undefined) {
    level = 'INFO';
  }
  
  if (LOG_LEVELS[level] < currentLevel) {
    return;
  }
  
  const formatted = formatLog(level, message, data);
  
  // 控制台输出
  switch (level) {
    case 'DEBUG':
      console.log(formatted);
      break;
    case 'INFO':
      console.log(`ℹ️ ${formatted}`);
      break;
    case 'WARN':
      console.warn(`⚠️ ${formatted}`);
      break;
    case 'ERROR':
      console.error(`❌ ${formatted}`);
      break;
  }
  
  // 写入日志文件
  writeLog(LOG_FILE, formatted);
  
  // debug模式写入debug文件
  if (level === 'DEBUG' || currentLevel === LOG_LEVELS.DEBUG) {
    writeLog(DEBUG_FILE, formatted);
  }
}

// 便捷方法
export const logger = {
  debug: (msg, data) => log('DEBUG', msg, data),
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  
  // 设置日志级别
  setLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLevel = LOG_LEVELS[level];
      log('INFO', `日志级别设置为 ${level}`);
    }
  },
  
  getLevel: () => {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLevel);
  },
  
  // 清空日志
  clear: (type = 'all') => {
    ensureLogDir();
    
    if (type === 'all' || type === 'auth') {
      if (fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '');
        log('INFO', '日志已清空: auth.log');
      }
    }
    
    if (type === 'all' || type === 'debug') {
      if (fs.existsSync(DEBUG_FILE)) {
        fs.writeFileSync(DEBUG_FILE, '');
        log('INFO', '日志已清空: debug.log');
      }
    }
  },
  
  // 读取日志
  read: (type = 'auth', lines = 100) => {
    const filePath = type === 'debug' ? DEBUG_FILE : LOG_FILE;
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n').filter(l => l.trim());
    return allLines.slice(-lines);
  },
  
  // 获取日志文件路径
  getLogPath: (type = 'auth') => {
    return type === 'debug' ? DEBUG_FILE : LOG_FILE;
  }
};

// 用户操作日志（专门记录用户行为）
export function auditLog(action, userId, details = {}) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [AUDIT] userId=${userId} action=${action} ${JSON.stringify(details)}`;
  
  console.log(`📋 ${logLine}`);
  writeLog(LOG_FILE, logLine);
}

export default logger;

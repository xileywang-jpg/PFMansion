// 鉴权服务 - 为游戏平台提供统一的用户认证
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { logger, auditLog } from './logger.js';

// 主题配置（服务端可配置）
const ENABLED_THEMES = [
  {
    id: 'original',
    name: '原版',
    description: '经典山屋惊魂',
    primaryColor: '#8B4513'
  },
  {
    id: 'volantis',
    name: '翁法罗斯',
    description: '崩坏星穹铁道 - 永恒之地',
    primaryColor: '#FFD700'
  }
];

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mansion-protocol-secret-key-2024';

// 内存存储（生产环境请使用数据库）
const users = new Map(); // username -> { id, username, passwordHash, createdAt }
const sessions = new Map(); // token -> { userId, username, createdAt, expiresAt }

// 初始化测试用户
async function initTestUser() {
  const testUsers = [
    { username: 'sifere', password: 'meow123', desc: '猫猫怪盗' },
    { username: 'aglaia', password: 'gold123', desc: '黄金裔领袖' },
    { username: 'mithrix', password: 'war123', desc: '纷争之子' },
    { username: 'athena', password: 'wisdom123', desc: '智慧女神' },
    { username: 'ares', password: 'battle123', desc: '战争之神' },
    { username: 'test1', password: 'test123', desc: '测试玩家1' },
    { username: 'test2', password: 'test123', desc: '测试玩家2' },
    { username: 'test3', password: 'test123', desc: '测试玩家3' },
    { username: 'test4', password: 'test123', desc: '测试玩家4' },
  ];

  for (const user of testUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    users.set(user.username, {
      id: uuidv4(),
      username: user.username,
      passwordHash,
      createdAt: new Date().toISOString()
    });
    logger.info(`用户已创建: ${user.username} / ${user.password} (${user.desc})`);
  }
}

app.use(cors());
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });
  
  next();
});

// 验证 token 中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }

  const session = sessions.get(token);
  if (!session) {
    logger.warn('Token无效', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'token 无效或已过期' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    logger.info('Token过期', { username: session.username });
    return res.status(401).json({ error: 'token 已过期' });
  }

  req.user = { userId: session.userId, username: session.username };
  next();
}

// ==================== API 路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (users.has(username)) {
      logger.warn('注册失败: 用户名已存在', { username });
      return res.status(400).json({ error: '用户名已存在' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    users.set(username, user);
    logger.info('新用户注册', { username, ip: req.ip });
    auditLog('REGISTER', user.id, { username, ip: req.ip });

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    logger.error('注册失败', { error: error.message, username: req.body.username });
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = users.get(username);
    if (!user) {
      logger.warn('登录失败: 用户不存在', { username, ip: clientIp });
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      logger.warn('登录失败: 密码错误', { username, ip: clientIp });
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    // 存储会话
    sessions.set(token, {
      userId: user.id,
      username: user.username,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 天
    });

    logger.info('用户登录成功', { username, ip: clientIp });
    auditLog('LOGIN', user.id, { username, ip: clientIp });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    logger.error('登录失败', { error: error.message });
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证 token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  logger.debug('Token验证', { username: req.user.username });
  res.json({
    valid: true,
    user: {
      id: req.user.userId,
      username: req.user.username
    }
  });
});

// 用户登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    sessions.delete(token);
    logger.info('用户登出', { username: req.user.username });
    auditLog('LOGOUT', req.user.userId, { username: req.user.username });
  }
  
  res.json({ success: true, message: '已登出' });
});

// 获取用户信息
app.get('/api/auth/user', authenticateToken, (req, res) => {
  res.json({
    id: req.user.userId,
    username: req.user.username
  });
});

// 获取游戏列表（可扩展）
app.get('/api/games', authenticateToken, (req, res) => {
  res.json([
    {
      id: 'mansion-protocol',
      name: 'Mansion Protocol',
      description: '猫猫怪盗的豪宅探险',
      icon: '🏠',
      path: '/game/mansion-protocol/lobby',
      color: '#8B5CF6'
    },
    {
      id: 'coming-soon-1',
      name: '更多游戏开发中...',
      description: '敬请期待',
      icon: '🎮',
      path: null,
      color: '#6B7280',
      disabled: true
    }
  ]);
});

// 获取可用的游戏服务（供 Nginx 验证）
app.get('/api/services', (req, res) => {
  res.json({
    auth: { url: 'http://localhost:3001', health: '/api/health' },
    game: { url: 'http://localhost:8080', health: '/ws' }
  });
});

// 获取可用的主题列表
app.get('/api/themes', (req, res) => {
  res.json({
    themes: ENABLED_THEMES,
    default: 'original'
  });
});

// ==================== 日志管理 API ====================

// 获取日志
app.get('/api/admin/logs', (req, res) => {
  const { type = 'auth', lines = 100 } = req.query;
  const logs = logger.read(type, parseInt(lines));
  res.json({ logs, type, count: logs.length });
});

// 清空日志
app.delete('/api/admin/logs', (req, res) => {
  const { type = 'all' } = req.query;
  logger.clear(type);
  logger.info('日志已清空', { type, admin: '操作' });
  res.json({ success: true, message: `日志已清空: ${type}` });
});

// ==================== 前端日志接收 ====================

// 接收前端日志
app.post('/api/admin/frontend-logs', (req, res) => {
  const { logs, sessionId, userId } = req.body;
  
  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: '无效的日志格式' });
  }

  // 处理每条前端日志
  logs.forEach((entry) => {
    const { timestamp, level, event, data, url } = entry;
    
    // 写入专用前端日志文件
    const logLine = JSON.stringify({
      timestamp: new Date(timestamp).toISOString(),
      level: level || 'INFO',
      event,
      data,
      url,
      sessionId,
      userId
    });
    
    // 写入前端日志文件
    const frontendLogPath = logger.getLogPath('frontend');
    const fs = require('fs');
    try {
      fs.appendFileSync(frontendLogPath.replace('auth.log', 'frontend.log'), logLine + '\n');
    } catch (e) {
      // 静默失败
    }
  });

  logger.debug('收到前端日志', { count: logs.length, sessionId, userId });
  res.json({ success: true, count: logs.length });
});

// 设置日志级别
app.put('/api/admin/log-level', (req, res) => {
  const { level } = req.body;
  if (!level || !['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
    return res.status(400).json({ error: '无效的日志级别' });
  }
  logger.setLevel(level);
  res.json({ success: true, level: logger.getLevel() });
});

// 获取日志级别
app.get('/api/admin/log-level', (req, res) => {
  res.json({ level: logger.getLevel() });
});

// 获取会话统计
app.get('/api/admin/stats', (req, res) => {
  res.json({
    users: users.size,
    sessions: sessions.size,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 启动服务器
async function start() {
  await initTestUser();
  
  const server = app.listen(PORT, () => {
    logger.info('鉴权服务已启动', {
      port: PORT,
      logDir: logger.getLogPath('auth').replace('/auth.log', '')
    });
    console.log('🎭 鉴权服务已启动');
    console.log(`   地址: http://127.0.0.1:${PORT} (仅内网)`);
    console.log(`   测试用户: sifere / meow123`);
    console.log(`   日志目录: ${logger.getLogPath('auth').replace('/auth.log', '')}`);
    console.log('-----------------------------------');
  });
  
  // 只允许本地连接
  server.on('connection', (socket) => {
    const addr = socket.remoteAddress;
    if (addr && !addr.startsWith('127.') && !addr.startsWith('::1') && !addr.startsWith('::ffff:127.')) {
      socket.destroy();
      logger.warn('阻止外部连接', { ip: addr });
    }
  });
}

start().catch(logger.error);

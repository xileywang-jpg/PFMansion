// 鉴权服务 - 为游戏平台提供统一的用户认证
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mansion-protocol-secret-key-2024';

// 内存存储（生产环境请使用数据库）
const users = new Map(); // username -> { id, username, passwordHash, createdAt }
const sessions = new Map(); // token -> { userId, username, createdAt, expiresAt }

// 初始化测试用户
async function initTestUser() {
  const testUsername = 'sifere';
  const testPassword = 'meow123';
  const passwordHash = await bcrypt.hash(testPassword, 10);
  users.set(testUsername, {
    id: uuidv4(),
    username: testUsername,
    passwordHash,
    createdAt: new Date().toISOString()
  });
  console.log('🐱 测试用户已创建: sifere / meow123');
}

app.use(cors());
app.use(express.json());

// 验证 token 中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '需要登录' });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'token 无效或已过期' });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
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
    console.log(`📝 新用户注册: ${username}`);

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = users.get(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
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

    console.log(`🔑 用户登录: ${username}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证 token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
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
      path: '/game/mansion-protocol',
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

// 启动服务器
async function start() {
  await initTestUser();
  
  const server = app.listen(PORT, () => {
    console.log('🎭 鉴权服务已启动');
    console.log(`   地址: http://127.0.0.1:${PORT} (仅内网)`);
    console.log(`   测试用户: sifere / meow123`);
    console.log('-----------------------------------');
  });
  
  // 只允许本地连接
  server.on('connection', (socket) => {
    const addr = socket.remoteAddress;
    if (addr && !addr.startsWith('127.') && !addr.startsWith('::1') && !addr.startsWith('::ffff:127.')) {
      socket.destroy();
      console.log('Blocked external connection from', addr);
    }
  });
}

start().catch(console.error);

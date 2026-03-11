// 鉴权 API 客户端
const API_BASE = '/api';

const authApi = {
  // 登录
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    return data;
  },

  // 注册
  async register(username, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    return data;
  },

  // 验证 token
  async verify() {
    const token = localStorage.getItem('token');
    if (!token) return { valid: false };
    
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data;
  },

  // 获取用户信息
  async getUser() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/auth/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  // 登出
  async logout() {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    localStorage.removeItem('token');
  },

  // 获取游戏列表
  async getGames() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/games`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('获取游戏列表失败');
    return res.json();
  }
};

export default authApi;

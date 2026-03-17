import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/auth';
import { logger, trackPageView, trackAction } from '../../ws/logger';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 页面加载日志
  trackPageView('Login');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        logger.info('尝试登录', { username });
        const result = await authApi.login(username, password);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        logger.info('登录成功', { username });
        trackAction('LOGIN_SUCCESS', { username });
        navigate('/games');
      } else {
        logger.info('尝试注册', { username });
        await authApi.register(username, password);
        setError('');
        setIsLogin(true);
        logger.info('注册成功', { username });
        trackAction('REGISTER_SUCCESS', { username });
        alert('注册成功！请登录~ 🐱');
      }
    } catch (err) {
      setError(err.message);
      logger.warn('登录/注册失败', { username, error: err.message });
      trackAction('AUTH_FAILED', { username, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="logo">🐱💨</div>
          <h1>赛法莉娅的冒险小屋</h1>
          <p>欢迎回来，冒险家~ ✨</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={3}
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '处理中...' : isLogin ? '进入豪宅' : '创建账户'}
          </button>
        </form>

        <div className="login-footer">
          {isLogin ? (
            <>
              还没有账户？{' '}
              <span 
                style={{ color: 'var(--primary-light)', cursor: 'pointer' }}
                onClick={() => { setIsLogin(false); setError(''); }}
              >
                创建一个
              </span>
            </>
          ) : (
            <>
              已有账户？{' '}
              <span 
                style={{ color: 'var(--primary-light)', cursor: 'pointer' }}
                onClick={() => { setIsLogin(true); setError(''); }}
              >
                直接登录
              </span>
            </>
          )}
        </div>
      </div>
      <div className="paw-prints">🐾</div>
    </div>
  );
}

export default LoginPage;

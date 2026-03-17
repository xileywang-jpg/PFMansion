import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../api/auth';
import { logger, trackPageView, trackAction } from '../../ws/logger';

function GamesPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [loading, setLoading] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const navigate = useNavigate();

  // 页面加载日志
  trackPageView('Games');

  useEffect(() => {
    const init = async () => {
      // 验证登录状态
      const verifyResult = await authApi.verify();
      if (!verifyResult.valid) {
        logger.warn('未登录尝试访问GamesPage', { path: '/games' });
        navigate('/login');
        return;
      }
      
      setUser(verifyResult.user);
      logger.info('用户验证成功', { userId: verifyResult.user.id, username: verifyResult.user.username });
      
      // 获取游戏列表和主题列表
      try {
        const [gamesList, themesData] = await Promise.all([
          authApi.getGames(),
          authApi.getThemes()
        ]);
        setGames(gamesList);
        setThemes(themesData.themes || []);
        
        // 不再自动读取缓存的主题，每次都让用户选择
        // 但保留用户名显示
        setSelectedTheme(themesData.default || themesData.themes?.[0]?.id || 'original');
        
        // 显示确认弹窗
        setShowThemeModal(true);
      } catch (err) {
        console.error('获取数据失败:', err);
        logger.error('获取游戏列表失败', { error: err.message });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  // 确认身份并选择主题
  const handleConfirm = (themeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
    setShowThemeModal(false);
    
    const theme = themes.find(t => t.id === themeId);
    logger.info('选择主题', { themeId, themeName: theme?.name });
    trackAction('SELECT_THEME', { themeId, themeName: theme?.name });
  };

  const handleLogout = async () => {
    logger.info('用户登出', { username: user?.username });
    trackAction('LOGOUT', { username: user?.username });
    await authApi.logout();
    navigate('/login');
  };

  const getThemeInfo = () => {
    return themes.find(t => t.id === selectedTheme);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/games" className="navbar-brand">
          <span className="logo">🐱💨</span>
          <span>冒险小屋</span>
        </Link>
        <div className="navbar-user">
          {/* 主题选择按钮 - 每次都能重新选择 */}
          <button 
            className="theme-btn"
            onClick={() => setShowThemeModal(true)}
            style={{ '--theme-color': getThemeInfo()?.primaryColor || '#8B4513' }}
          >
            🎨 {getThemeInfo()?.name || '选择主题'}
          </button>
          <span className="username">欢迎，{user?.username} ~</span>
          <button className="logout-btn" onClick={handleLogout}>
            登出
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="games-page fade-in">
          <div className="games-header">
            <h1>🎮 选择你的冒险</h1>
            <p>准备好开始新的旅程了吗？</p>
          </div>

          <div className="games-grid">
            {games.map((game) => (
              <Link
                key={game.id}
                to={game.path || '#'}
                className={`game-card ${game.disabled ? 'disabled' : ''}`}
                style={{ '--card-color': game.color }}
                onClick={(e) => game.disabled && e.preventDefault()}
              >
                <div className="icon">{game.icon}</div>
                <h3>{game.name}</h3>
                <p>{game.description}</p>
                {game.disabled && <span className="badge">即将推出</span>}
                {!game.disabled && <span className="badge" style={{ background: 'var(--success)' }}>开始游戏</span>}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* 身份确认 + 主题选择弹窗 - 每次进入都显示 */}
      {showThemeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>👋 确认身份</h2>
            <p className="modal-desc">你好，<strong>{user?.username}</strong>！请选择游戏主题开始冒险~</p>
            
            <div className="theme-grid">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  className={`theme-option ${selectedTheme === theme.id ? 'selected' : ''}`}
                  style={{ '--theme-color': theme.primaryColor }}
                  onClick={() => handleConfirm(theme.id)}
                >
                  <div className="theme-icon">
                    {theme.id === 'volantis' ? '⚡' : '🏠'}
                  </div>
                  <h3>{theme.name}</h3>
                  <p>{theme.description}</p>
                  {selectedTheme === theme.id && <span className="check-mark">✓</span>}
                </button>
              ))}
            </div>

            <button className="modal-close-btn" onClick={() => handleConfirm(selectedTheme)}>
              开始游戏
            </button>
          </div>
        </div>
      )}
      
      <div className="paw-prints">🐾</div>
    </div>
  );
}

export default GamesPage;

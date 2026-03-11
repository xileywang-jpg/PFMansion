import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../api/auth';

function GamesPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // 验证登录状态
      const verifyResult = await authApi.verify();
      if (!verifyResult.valid) {
        navigate('/login');
        return;
      }
      
      setUser(verifyResult.user);
      
      // 获取游戏列表
      try {
        const gamesList = await authApi.getGames();
        setGames(gamesList);
      } catch (err) {
        console.error('获取游戏列表失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/login');
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
      
      <div className="paw-prints">🐾</div>
    </div>
  );
}

export default GamesPage;

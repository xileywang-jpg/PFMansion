// 主应用入口 - 使用路由
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import GamesPage from './pages/GamesPage.jsx';
import GameScreen from '../components/GameScreen';
import { LobbyScreen } from '../components/NetworkScreens.tsx';
import { fetchGameData } from './services/gameData';
import './styles/global.css';

// 游戏数据加载状态组件
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: '#eee',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '16px' }}>🎮</div>
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>Mansion Protocol</div>
      <div style={{ fontSize: '14px', color: '#888' }}>加载游戏数据中...</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    // 启动时加载游戏数据
    console.log('[App] 开始加载游戏数据...');
    fetchGameData()
      .then(() => {
        console.log('[App] 游戏数据加载完成');
        setDataLoaded(true);
      })
      .catch((err) => {
        console.error('[App] 游戏数据加载失败:', err);
        setDataError(err.message || '加载失败');
      });
  }, []);

  // 等待游戏数据加载完成
  if (!dataLoaded) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>🎮</div>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>Mansion Protocol</div>
        {dataError ? (
          <div style={{ fontSize: '14px', color: '#ff6b6b', marginTop: '8px' }}>
            数据加载失败: {dataError}
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
            加载中...
          </div>
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 受保护路由 */}
        <Route 
          path="/games" 
          element={
            <ProtectedRoute>
              <GamesPage />
            </ProtectedRoute>
          } 
        />
        
        {/* 游戏页面 */}
        <Route 
          path="/game/mansion-protocol/lobby" 
          element={
            <ProtectedRoute>
              <LobbyScreen />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/game/mansion-protocol" 
          element={
            <ProtectedRoute>
              <GameScreen />
            </ProtectedRoute>
          } 
        />
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
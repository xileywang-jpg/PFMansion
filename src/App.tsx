// 主应用入口 - 使用路由
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import GamesPage from './pages/GamesPage.jsx';
import LocalGame from '../components/LocalGame.tsx';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
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
          path="/game/mansion-protocol" 
          element={
            <ProtectedRoute>
              <LocalGame />
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

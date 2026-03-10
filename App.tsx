// 游戏入口组件
// 支持本地单人模式和联机模式

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { wsClient, ServerMessage } from './ws/client';
import * as network from './ws/network';
import { LoginScreen, LobbyScreen } from './components/NetworkScreens';

// 单机版游戏组件
import LocalGame from './components/LocalGame';

type GameMode = 'local' | 'online';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [networkScreen, setNetworkScreen] = useState<'login' | 'lobby' | 'game'>('login');
  const [isConnected, setIsConnected] = useState(false);

  // 本地模式初始化
  const initializeLocal = useGameStore(state => state.initializeGame);

  useEffect(() => {
    if (gameMode === 'local') {
      initializeLocal();
    }
  }, [gameMode, initializeLocal]);

  // 网络模式
  useEffect(() => {
    if (gameMode !== 'online') return;

    // 监听连接状态
    const checkConnection = setInterval(() => {
      setIsConnected(wsClient.isConnected());
    }, 1000);

    // 消息处理
    const handlers: Record<string, (msg: ServerMessage) => void> = {
      game_started: () => setNetworkScreen('game'),
      server_shutdown: () => {
        setNetworkScreen('login');
        setGameMode('local');
      }
    };

    Object.entries(handlers).forEach(([type, handler]) => {
      wsClient.on(type, handler);
    });

    return () => {
      clearInterval(checkConnection);
      Object.keys(handlers).forEach(type => wsClient.off(type));
    };
  }, [gameMode]);

  // 切换到本地模式
  const switchToLocal = () => {
    network.cleanupNetworkLayer();
    setGameMode('local');
  };

  // 切换到联机模式
  const switchToOnline = () => {
    setGameMode('online');
    setNetworkScreen('login');
  };

  // 根据模式渲染
  if (gameMode === 'local') {
    return (
      <>
        <LocalGame />
        {/* 模式切换按钮 */}
        <button
          onClick={switchToOnline}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded border border-zinc-700"
        >
          切换到联机模式
        </button>
      </>
    );
  }

  // 联机模式
  if (gameMode === 'online') {
    if (networkScreen === 'login' || networkScreen === 'lobby') {
      return (
        <>
          <LoginScreen 
            onLogin={() => {
              setIsConnected(true);
            }} 
          />
          {isConnected && <LobbyScreen />}
          <button
            onClick={switchToLocal}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded border border-zinc-700"
          >
            切换到单机模式
          </button>
        </>
      );
    }

    // 游戏进行中
    return (
      <>
        <LocalGame />
        <div className="fixed top-4 right-4 z-50 px-3 py-1 bg-green-900/80 text-green-400 text-xs rounded border border-green-800">
          联机模式
        </div>
        <button
          onClick={switchToLocal}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded border border-zinc-700"
        >
          退出联机
        </button>
      </>
    );
  }

  return null;
};

export default App;

// 游戏网络 Hook
// 简化网络操作的 React Hook

import { useState, useEffect, useCallback } from 'react';
import { wsClient, ServerMessage } from '../ws/client';
import * as network from '../ws/network';
import { useGameStore } from '../store/gameStore';

export type GameScreen = 'login' | 'lobby' | 'game';

export function useGameNetwork() {
  const [screen, setScreen] = useState<GameScreen>('login');
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const store = useGameStore();

  // 初始化
  useEffect(() => {
    // 监听连接状态
    const checkConnection = setInterval(() => {
      setIsConnected(wsClient.isConnected());
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      network.cleanupNetworkLayer();
    };
  }, []);

  // 消息处理
  useEffect(() => {
    const handlers: Record<string, (msg: ServerMessage) => void> = {
      game_started: () => {
        setScreen('game');
      },
      state_sync: (msg) => {
        // 同步游戏状态
        if (msg.state) {
          syncGameState(msg.state);
        }
      },
      error: (msg) => {
        setError(msg.message);
        setTimeout(() => setError(null), 3000);
      },
      server_shutdown: () => {
        setError('服务器已关闭');
        setScreen('login');
      }
    };

    // 注册处理器
    Object.entries(handlers).forEach(([type, handler]) => {
      wsClient.on(type, handler);
    });

    return () => {
      Object.keys(handlers).forEach(type => {
        wsClient.off(type);
      });
    };
  }, []);

  // 同步游戏状态
  const syncGameState = useCallback((state: any) => {
    // 简化版：只同步关键状态
    if (state.phase) {
      // 根据 phase 设置本地状态
    }
    
    if (state.logs && state.logs.length > 0) {
      const currentLogs = store.logs || [];
      const newLogs = state.logs.filter(
        (log: any) => !currentLogs.find((l: any) => l.id === log.id)
      );
      
      if (newLogs.length > 0) {
        newLogs.forEach((log: any) => {
          store.addLog(log.text, log.type);
        });
      }
    }
    
    // 刷新整个状态
    if (state.phase === 'EXPLORATION' || state.phase === 'HAUNT') {
      // 游戏进行中
    }
  }, [store]);

  // 登录
  const login = useCallback(() => {
    setError(null);
    network.initNetworkLayer();
    
    // 等待连接
    let attempts = 0;
    const checkLogin = setInterval(() => {
      attempts++;
      if (wsClient.isConnected()) {
        clearInterval(checkLogin);
        setIsConnected(true);
        setPlayerId(wsClient.getPlayerId());
        setScreen('lobby');
      } else if (attempts > 10) {
        clearInterval(checkLogin);
        setError('连接失败，请检查服务器');
      }
    }, 500);
  }, []);

  // 创建房间
  const createRoom = useCallback((roomName: string, playerName: string) => {
    network.createRoom(roomName, playerName);
  }, []);

  // 加入房间
  const joinRoom = useCallback((roomId: string, playerName: string) => {
    network.joinRoom(roomId, playerName);
  }, []);

  // 离开房间
  const leaveRoom = useCallback(() => {
    network.leaveRoom();
    setRoomId(null);
  }, []);

  // 设置准备
  const setReady = useCallback((ready: boolean) => {
    network.setReady(ready);
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    network.startGame();
  }, []);

  // 游戏操作
  const move = useCallback((direction: string) => {
    network.sendMove(direction);
  }, []);

  const placeTile = useCallback((direction: string) => {
    network.sendPlaceTile(direction);
  }, []);

  const endTurn = useCallback(() => {
    network.sendEndTurn();
  }, []);

  const rollDice = useCallback((numDice: number = 1) => {
    network.sendRollDice(numDice);
  }, []);

  return {
    screen,
    isConnected,
    playerId,
    roomId,
    error,
    login,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    move,
    placeTile,
    endTurn,
    rollDice,
  };
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsClient } from '../ws/client';
import * as network from '../ws/network';
import { useGameStore } from '../store/gameStore';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [playerName, setPlayerName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }

    setIsConnecting(true);
    setError('');

    // 初始化网络层
    network.initNetworkLayer();

    // 等待连接
    let attempts = 0;
    const checkConnection = setInterval(() => {
      attempts++;
      if (wsClient.isConnected()) {
        clearInterval(checkConnection);
        onLogin();
      } else if (attempts > 10) {
        clearInterval(checkConnection);
        setIsConnecting(false);
        setError('连接服务器失败，请刷新重试');
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4 p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h1 className="text-4xl font-serif-display text-center text-white mb-2">
          MANSION <span className="text-indigo-500">PROTOCOL</span>
        </h1>
        <p className="text-center text-zinc-500 mb-8 text-sm">多人联机版</p>

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">你的名字</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="输入你的名字"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              maxLength={20}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white font-bold rounded transition-colors"
          >
            {isConnecting ? '连接中...' : '进入游戏'}
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          需要运行后端服务器才能联机游戏
        </p>
      </div>
    </div>
  );
};

export const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [error, setError] = useState('');
  // 从 localStorage 读取玩家名称和主题，支持页面刷新后保持登录状态
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('gameTheme') || 'original');
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [allReady, setAllReady] = useState(false);

  // 保存玩家名称到 localStorage
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('playerName', name);
  };

  // 保存主题到 localStorage
  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    localStorage.setItem('gameTheme', theme);
  };

  useEffect(() => {
    // 如果未连接，自动建立 WebSocket 连接
    if (!wsClient.isConnected()) {
      network.initNetworkLayer();
    }
    
    // 等待连接成功后获取房间列表
    const checkAndListRooms = setInterval(() => {
      if (wsClient.isConnected()) {
        network.listRooms();
        clearInterval(checkAndListRooms);
      }
    }, 500);
    
    // 5秒后如果还没连接成功，停止尝试
    setTimeout(() => clearInterval(checkAndListRooms), 5000);

    // 注册消息处理器
    wsClient.on('room_list', (msg) => {
      setRooms(msg.rooms || []);
    });

    wsClient.on('room_created', (msg) => {
      setIsInRoom(true);
      setIsHost(true);
      setRoomPlayers([{ id: msg.playerId, name: playerName, isHost: true, isReady: true }]);
      // 保存主题设置
      if (msg.theme) {
        localStorage.setItem('gameTheme', msg.theme);
      }
    });

    wsClient.on('room_joined', (msg) => {
      setIsInRoom(true);
      setIsHost(false);
      // 解析玩家列表
      const players = Object.values(msg.players || {}) as any[];
      setRoomPlayers(players);
      // 保存主题设置（如果之前没有设置）
      if (msg.theme && !localStorage.getItem('gameTheme')) {
        localStorage.setItem('gameTheme', msg.theme);
      }
    });

    wsClient.on('player_joined', (msg) => {
      const players = Object.values(msg.players || {}) as any[];
      setRoomPlayers(players);
      setError('');
    });

    wsClient.on('player_left', (msg) => {
      // 刷新玩家列表
      network.getState();
    });

    wsClient.on('player_ready', (msg) => {
      setRoomPlayers(prev => prev.map(p => 
        p.id === msg.playerId ? { ...p, isReady: msg.ready } : p
      ));
    });

    wsClient.on('game_started', (msg: any) => {
      // 游戏开始，使用 React Router 跳转到游戏页面，而不是刷新页面
      // 注意：这里不需要手动设置 currentRoomId，因为 network.ts 中的 handleGameStarted 会处理
      // 但我们需要确保消息被正确传递
      console.log('🎮 游戏开始，切换到游戏页面...');
      navigate('/game/mansion-protocol');
    });

    // 获取房间列表
    network.listRooms();

    return () => {
      wsClient.off('room_list');
      wsClient.off('room_created');
      wsClient.off('room_joined');
      wsClient.off('player_joined');
      wsClient.off('player_left');
      wsClient.off('player_ready');
      wsClient.off('game_started');
    };
  }, [playerName]);

  useEffect(() => {
    // 检查是否所有玩家都准备
    if (roomPlayers.length > 0) {
      const allReady = roomPlayers.every(p => p.isReady);
      setAllReady(allReady);
    }
  }, [roomPlayers]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('请输入房间名称');
      return;
    }
    setError('');
    network.createRoom(roomName, playerName);
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('请输入房间号');
      return;
    }
    setError('');
    network.joinRoom(joinRoomId, playerName);
  };

  const handleLeaveRoom = () => {
    network.leaveRoom();
    setIsInRoom(false);
    setIsHost(false);
    setRoomPlayers([]);
    network.listRooms();
  };

  const handleToggleReady = () => {
    const currentPlayer = roomPlayers.find(p => p.name === playerName);
    network.setReady(!currentPlayer?.isReady);
  };

  const handleStartGame = () => {
    network.startGame();
  };

  if (!playerName) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50">
        <div className="max-w-md w-full mx-4 p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">进入大厅</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => handlePlayerNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && playerName.trim()) {
                // 不需要做任何事，只是防止自动跳转
              }
            }}
            placeholder="输入你的名字"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded text-white mb-4"
          />
          
          {/* 主题选择 */}
          <div className="mb-6">
            <label className="block text-zinc-400 text-sm mb-2">选择主题</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('original')}
                className={`p-3 rounded border text-sm font-bold transition-all ${
                  selectedTheme === 'original'
                    ? 'bg-amber-900/30 border-amber-500 text-amber-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                🏰 原版
              </button>
              <button
                onClick={() => handleThemeChange('volantis')}
                className={`p-3 rounded border text-sm font-bold transition-all ${
                  selectedTheme === 'volantis'
                    ? 'bg-yellow-900/30 border-yellow-500 text-yellow-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                ✨ 翁法罗斯
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              if (playerName.trim()) {
                // 保持当前页面，playerName 已经保存到 localStorage 了
              }
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white font-bold rounded"
            disabled={!playerName.trim()}
          >
            进入大厅
          </button>
        </div>
      </div>
    );
  }

  if (isInRoom) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50">
        <div className="max-w-lg w-full mx-4 p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-2">房间大厅</h2>
          <p className="text-zinc-500 mb-6">房间号: {wsClient.getRoomId()}</p>

          <div className="space-y-3 mb-6">
            <h3 className="text-zinc-400 text-sm font-bold uppercase">玩家列表</h3>
            {roomPlayers.map((player: any) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded">
                <span className="text-white">
                  {player.name}
                  {player.isHost && <span className="text-yellow-500 ml-2">👑 房主</span>}
                </span>
                <span className={player.isReady ? 'text-green-400' : 'text-zinc-500'}>
                  {player.isReady ? '✓ 已准备' : '⏳ 等待中'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleToggleReady}
              className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded"
            >
              {roomPlayers.find(p => p.name === playerName)?.isReady ? '取消准备' : '准备'}
            </button>
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded"
            >
              离开
            </button>
          </div>

          {isHost && allReady && (
            <button
              onClick={handleStartGame}
              className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
            >
              开始游戏
            </button>
          )}

          {isHost && !allReady && (
            <p className="text-center text-zinc-500 text-sm mt-4">
              等待所有玩家准备...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-50">
      <div className="max-w-lg w-full mx-4 p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">游戏大厅</h2>
        
        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <div className="space-y-6">
          {/* 创建房间 */}
          <div className="p-4 bg-zinc-800 rounded">
            <h3 className="text-white font-bold mb-3">创建房间</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="房间名称"
                className="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded text-white"
              />
              <button
                onClick={handleCreateRoom}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
              >
                创建
              </button>
            </div>
          </div>

          {/* 加入房间 */}
          <div className="p-4 bg-zinc-800 rounded">
            <h3 className="text-white font-bold mb-3">加入房间</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="房间号"
                className="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded text-white"
              />
              <button
                onClick={handleJoinRoom}
                className="px-6 py-2 bg-zinc-600 hover:bg-zinc-500 text-white font-bold rounded"
              >
                加入
              </button>
            </div>
          </div>

          {/* 房间列表 */}
          {rooms.length > 0 && (
            <div className="p-4 bg-zinc-800 rounded">
              <h3 className="text-white font-bold mb-3">可用房间</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {rooms.map((room: any) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-zinc-700 rounded">
                    <div>
                      <span className="text-white">{room.name}</span>
                      <span className="text-zinc-500 ml-2 text-sm">{room.id}</span>
                    </div>
                    <span className="text-zinc-400 text-sm">
                      {Object.keys(room.players || {}).length}/4 玩家
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          玩家: {playerName}
        </p>
      </div>
    </div>
  );
};

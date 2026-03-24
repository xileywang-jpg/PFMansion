// 本地单机游戏组件
// 包含原有的所有游戏 UI

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import * as network from '../ws/network';
import { wsClient } from '../ws/client';
import MapGrid from './MapGrid';
import PlayerHUD from './PlayerHUD';
import CardResolutionModal from './EventModal';
import TurnControl from './TurnControl';
import TileInspector from './TileInspector';
import HauntRollModal from './HauntRollModal';
import HauntReveal from './HauntReveal';
import InventoryModal from './InventoryModal';
import InteractionModal from './InteractionModal';
import CombatResolution from './CombatResolution';
import DiceRoller from './DiceRoller';
import FeedbackToast from './FeedbackToast';
import SkillTreeModal from './SkillTreeModal';
import PlayerInspectionModal from './PlayerInspectionModal';
import { Bug, Skull, LogOut } from 'lucide-react';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { debugForceHaunt, isHauntActive, omenCount, initializeGame, players } = useGameStore();
  const isNetworkMode = network.isInNetworkMode();

  // 初始化游戏 - 完全由网络模式控制
  // 网络模式: 等服务器发送 game_started + state_sync 后才有游戏状态
  // 单机模式: 由单独的入口页面控制，这里不做自动初始化
  React.useEffect(() => {
    // 不再自动初始化单机游戏
    // 网络模式由 handleGameStarted 消息触发状态同步
    // 单机模式通过独立的单机入口进入
    
    // 检查是否有保存的房间信息（从 NetworkScreens 跳转过来时保存的）
    const savedRoomId = sessionStorage.getItem('roomId');
    const savedPlayerId = sessionStorage.getItem('playerId');
    
    if (savedRoomId && savedPlayerId) {
      console.log('[GameScreen] 恢复房间连接:', savedRoomId);
      
      // 恢复 wsClient 的房间信息
      wsClient.setRoomId(savedRoomId);
      wsClient.setPlayerId(savedPlayerId);
      
      // 恢复 network.ts 的 currentRoomId（关键！否则 isConnectedToServer() 会返回 false）
      network.restoreSession();
      
      // 初始化网络层（如果还没有初始化）
      if (!wsClient.isConnected()) {
        console.log('[GameScreen] 初始化网络层...');
        network.initNetworkLayer();
        
        // 等待 WS 连接成功后请求状态
        const checkConnection = setInterval(() => {
          if (wsClient.isConnected()) {
            clearInterval(checkConnection);
            console.log('[GameScreen] WS已连接，请求游戏状态');
            network.getState();
          }
        }, 500);
        
        // 10秒后如果还没连接成功就不再等待
        setTimeout(() => {
          clearInterval(checkConnection);
        }, 10000);
      } else {
        // WS 已经连接，直接请求状态
        network.getState();
      }
    } else {
      // 没有保存的房间信息，可能是第一次进入，等待服务器消息
      console.log('[GameScreen] 无保存的房间信息，等待服务器状态...');
    }
  }, []);

  // 处理离开房间（网络模式）
  const handleLeaveRoom = () => {
    if (isNetworkMode) {
      network.leaveRoom();
      // 跳转到大厅
      navigate('/game/mansion-protocol/lobby');
    }
  };

  return (
    <div className="flex w-screen h-screen bg-black text-zinc-200 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Main Map Viewport */}
      <div className="flex-1 relative z-10">
        <div className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col items-start gap-2">
            <div>
                <h1 className="text-3xl font-serif-display text-white tracking-tighter opacity-80">
                    MANSION <span className="text-indigo-500">PROTOCOL</span>
                </h1>
                <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
                        Sector 4 // {isHauntActive ? 'Haunt Phase' : 'Exploration Phase'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Omen Counter Widget */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded text-[10px] text-zinc-400 uppercase tracking-widest shadow-lg backdrop-blur-sm" title="当前揭示的预兆数量">
                    <Skull size={14} className={omenCount > 0 ? "text-indigo-500" : "text-zinc-600"} />
                    <span className="text-zinc-600">Omens:</span>
                    <span className={`font-bold text-sm ${omenCount > 0 ? "text-indigo-400" : "text-zinc-500"}`}>{omenCount}</span> 
                </div>

                {!isHauntActive && (
                    <button 
                      onClick={debugForceHaunt}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-500 border border-indigo-900/30 rounded text-[9px] font-bold uppercase transition-all"
                      title="强制进入作祟模式"
                    >
                      <Bug size={12} />
                      调试: 触发作祟
                    </button>
                )}

                {/* 离开房间按钮（仅网络模式） */}
                {isNetworkMode && (
                    <button 
                      onClick={handleLeaveRoom}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 rounded text-[9px] font-bold uppercase transition-all"
                      title="离开房间"
                    >
                      <LogOut size={12} />
                      离开
                    </button>
                )}
            </div>
        </div>
        
        <MapGrid />
        
        {/* Floating UI Elements */}
        <TileInspector />
        <TurnControl />
        <FeedbackToast />
      </div>

      {/* Right Sidebar */}
      <PlayerHUD />

      {/* Overlays */}
      <CardResolutionModal />
      <HauntRollModal />
      <HauntReveal />
      <InventoryModal />
      <InteractionModal />
      <SkillTreeModal />
      <PlayerInspectionModal />
      <CombatResolution />
      <DiceRoller />

      {/* Scanline Effect (Atmosphere) */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default GameScreen;

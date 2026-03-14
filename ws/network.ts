// 游戏网络层 - 连接到后端
import { wsClient, ServerMessage } from './client';
import { useGameStore } from '../store/gameStore';

let isNetworkMode = false;
let currentRoomId: string | null = null;
let currentPlayerId: string | null = null;

// 初始化网络层
export function initNetworkLayer() {
  console.log('🌐 初始化游戏网络层');
  
  // 注册消息处理器
  wsClient.on('room_created', handleRoomCreated);
  wsClient.on('room_joined', handleRoomJoined);
  wsClient.on('player_joined', handlePlayerJoined);
  wsClient.on('player_left', handlePlayerLeft);
  wsClient.on('player_ready', handlePlayerReady);
  wsClient.on('game_started', handleGameStarted);
  wsClient.on('state_sync', handleStateSync);
  wsClient.on('dice_result', handleDiceResult);
  // 阶段1新增消息处理
  wsClient.on('card_drawn', handleCardDrawn);
  wsClient.on('combat_resolved', handleCombatResolved);
  wsClient.on('error', handleError);
  wsClient.on('server_shutdown', handleServerShutdown);
  
  // 连接 WebSocket
  wsClient.connect();
}

// 清理网络层
export function cleanupNetworkLayer() {
  wsClient.disconnect();
}

// 检查是否在网络模式
export function isInNetworkMode(): boolean {
  return isNetworkMode;
}

// 设置网络模式
export function setNetworkMode(enabled: boolean) {
  isNetworkMode = enabled;
  console.log('🌐 网络模式:', enabled ? '启用' : '禁用');
}

// 获取当前房间ID
export function getCurrentRoomId(): string | null {
  return currentRoomId;
}

// 获取当前玩家ID
export function getCurrentPlayerId(): string | null {
  return currentPlayerId;
}

// ==================== 消息处理 ====================

function handleRoomCreated(msg: ServerMessage) {
  console.log('🏠 房间已创建:', msg);
  currentRoomId = msg.roomId;
  currentPlayerId = msg.playerId;
  
  const store = useGameStore.getState();
  store.showFeedback(`房间创建成功: ${msg.roomId}`, 'info');
}

function handleRoomJoined(msg: ServerMessage) {
  console.log('👤 加入房间:', msg);
  currentRoomId = msg.roomId;
  currentPlayerId = msg.playerId;
  
  const store = useGameStore.getState();
  store.showFeedback('加入房间成功', 'info');
}

function handlePlayerJoined(msg: ServerMessage) {
  console.log('👥 玩家加入:', msg);
  const store = useGameStore.getState();
  store.showFeedback(`${msg.playerName} 加入了房间`, 'info');
}

function handlePlayerLeft(msg: ServerMessage) {
  console.log('👋 玩家离开:', msg);
  const store = useGameStore.getState();
  store.showFeedback(`玩家离开了房间`, 'info');
}

function handlePlayerReady(msg: ServerMessage) {
  console.log('✅ 玩家准备:', msg);
}

function handleGameStarted(msg: ServerMessage) {
  console.log('🎮 游戏开始!');
  isNetworkMode = true;
  
  const store = useGameStore.getState();
  store.showFeedback('游戏开始!', 'turn');
}

function handleStateSync(msg: ServerMessage) {
  console.log('🔄 状态同步:', msg.state, 'version:', msg.version);
  
  const state = msg.state as any;
  const store = useGameStore.getState();
  
  // 防御性检查
  if (!state) {
    console.error('状态同步失败: state 为空');
    return;
  }
  
  // Phase 1: 验证版本号 (可选，用于检测过期状态)
  if (msg.version) {
    console.log('📊 状态版本:', msg.version, '时间戳:', msg.timestamp);
  }
  
  // 完整的状态映射
  store.setState({
    // 游戏阶段
    phase: state.phase || 'EXPLORATION',
    turnPhase: state.turnPhase || 'MOVING',
    turnIndex: state.turnIndex || 1,
    
    // 玩家
    players: state.players || {},
    playerIds: state.playerIds || [],
    activePlayerId: state.activePlayerId || '',
    
    // 地图
    map: state.map || {},
    tileDeck: state.tileDeck || [],
    
    // 资源
    movesRemaining: state.movesRemaining ?? 3,
    omenCount: state.omenCount ?? 0,
    isHauntActive: state.isHauntActive ?? false,
    traitorId: state.traitorId || null,
    
    // 卡牌
    activeCard: state.activeCard || null,
    decks: state.decks || { EVENT: [], ITEM: [], OMEN: [] },
    lastRollResult: state.lastRollResult ?? null,
    
    // 战斗
    activeCombat: state.activeCombat ? {
      attackerId: state.activeCombat.attackerId,
      defenderId: state.activeCombat.defenderId,
      attribute: state.activeCombat.attribute,
      phase: state.activeCombat.phase,
    } : null,
    
    // Phase 1: 待处理动作 (新增)
    pendingAction: state.pendingAction || null,
    
    // 剧本
    currentScenario: state.currentScenario || null,
    lastTriggeredOmenId: state.lastTriggeredOmen || null,
    lastTriggeredTileId: state.lastTriggeredTile || null,
    
    // 日志
    logs: state.logs || [],
  });
  
  // 显示同步提示（仅首次同步）
  // store.showFeedback('游戏状态已同步', 'info');
}

function handleDiceResult(msg: ServerMessage) {
  console.log('🎲 骰子结果:', msg);
  
  const store = useGameStore.getState();
  store.showFeedback(`骰子: ${msg.results.join(', ')} = ${msg.sum}`, 'info');
}

// 抽卡结果处理
function handleCardDrawn(msg: ServerMessage) {
  console.log('🃏 抽卡结果:', msg);
  
  const store = useGameStore.getState();
  if (msg.card) {
    store.showFeedback(`抽到: ${msg.card.title || msg.card.name || '卡牌'}`, 'info');
  }
}

// 战斗结算处理
function handleCombatResolved(msg: ServerMessage) {
  console.log('⚔️ 战斗结算:', msg);
  
  const store = useGameStore.getState();
  const result = msg.result as any;
  if (result) {
    store.showFeedback(
      result.attackerWon ? '攻击成功！' : '防御成功！', 
      result.attackerWon ? 'turn' : 'info'
    );
  }
}

function handleError(msg: ServerMessage) {
  console.error('❌ 错误:', msg.code, msg.message);
  
  const store = useGameStore.getState();
  
  // Phase 1: 更好的错误处理
  let errorMessage = msg.message || '发生未知错误';
  
  // 根据错误代码提供更友好的提示
  switch (msg.code) {
    case 'NOT_YOUR_TURN':
      errorMessage = '还没轮到你行动';
      break;
    case 'INVALID_ACTION':
      errorMessage = '当前无法执行此操作';
      break;
    case 'GAME_ERROR':
      // 使用服务器返回的原始消息
      break;
    default:
      // 其他错误使用原始消息
      break;
  }
  
  store.showFeedback(errorMessage, 'error');
}

function handleServerShutdown(msg: ServerMessage) {
  console.log('🛑 服务器关闭');
  
  const store = useGameStore.getState();
  store.showFeedback('服务器已关闭', 'error');
  isNetworkMode = false;
}

// ==================== 玩家操作 ====================

// 创建房间
export function createRoom(roomName: string, playerName: string) {
  const theme = typeof window !== 'undefined' ? localStorage.getItem('gameTheme') || 'original' : 'original';
  wsClient.send({
    type: 'create_room',
    roomName,
    playerName,
    theme
  });
}

// 加入房间
export function joinRoom(roomId: string, playerName: string) {
  wsClient.send({
    type: 'join_room',
    roomId,
    playerName
  });
}

// 离开房间
export function leaveRoom() {
  wsClient.send({
    type: 'leave_room'
  });
  currentRoomId = null;
  currentPlayerId = null;
  isNetworkMode = false;
}

// 设置准备状态
export function setReady(ready: boolean) {
  wsClient.send({
    type: 'set_ready',
    ready
  });
}

// 开始游戏
export function startGame() {
  wsClient.send({
    type: 'start_game'
  });
}

// 获取房间列表
export function listRooms() {
  wsClient.send({
    type: 'list_rooms'
  });
}

// 获取游戏状态
export function getState() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'get_state',
    roomId: roomId
  });
}

// 玩家移动
export function sendMove(direction: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'move',
      direction
    }
  });
}

// 放置房间
export function sendPlaceTile(direction: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'place_tile',
      direction
    }
  });
}

// 结束回合
export function sendEndTurn() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'end_turn'
    }
  });
}

// 投骰子
export function sendRollDice(numDice: number = 1) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'roll_dice',
      numDice
    }
  });
}

// 修改属性 (仅用于调试/GM)
export function sendModifyStat(attribute: string, amount: number) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'modify_stat',
      attribute,
      amount
    }
  });
}

// ==================== 阶段1新增：游戏逻辑操作 ====================

// 抽卡
export function sendDrawCard(cardType: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'draw_card',
      cardType
    }
  });
}

// 解决事件选择
export function sendResolveEvent(choiceIndex: number) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'resolve_event',
      choiceIndex
    }
  });
}

// 开始战斗
export function sendStartCombat(defenderId: string, attribute: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'start_combat',
      defenderId,
      attribute
    }
  });
}

// 战斗结算 - 后端统一生成骰子结果
export function sendResolveCombat() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'resolve_combat'
      // 🔒 后端统一生成骰子结果，不接受前端传入
    }
  });
}

// 使用物品
export function sendUseItem(itemId: string, targetId?: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'use_item',
      itemId,
      targetId: targetId || ''
    }
  });
}

// 执行技能
export function sendExecuteSkill(skillId: string, targetId?: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'execute_skill',
      skillId,
      targetId: targetId || ''
    }
  });
}

// 触发条件buff (攻击时、回合结束时、进入房间时)
export function sendTriggerBuff(trigger: 'ATTACK' | 'END_TURN' | 'ENTER_ROOM') {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'trigger_buff',
      trigger
    }
  });
}

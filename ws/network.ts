// 游戏网络层 - 连接到后端
import { wsClient, ServerMessage } from './client';
import { useGameStore } from '../store/gameStore';
import { logger, trackAction } from './logger';

// 注意：移除单机模式概念，所有游戏请求都发送到后端
// 如果后端不可用，会有前端降级处理
// 页面刷新后，从 sessionStorage 恢复房间信息
let currentRoomId: string | null = sessionStorage.getItem('roomId');
let currentPlayerId: string | null = sessionStorage.getItem('playerId');

// 骰子结果超时管理 - 用于在收到 dice_result 时清除 DiceRoller 设置的超时
let diceRollTimeoutId: number | null = null;

export function setDiceRollTimeoutId(id: number | null) {
  diceRollTimeoutId = id;
}

export function clearDiceRollTimeout() {
  if (diceRollTimeoutId !== null) {
    clearTimeout(diceRollTimeoutId);
    diceRollTimeoutId = null;
  }
}

// 导出房间和玩家ID，供外部组件访问
export function getCurrentRoomId(): string | null {
  return currentRoomId;
}

export function getCurrentPlayerId(): string | null {
  return currentPlayerId;
}

// 检查是否已连接到服务器（用于决定是否需要降级到前端处理）
export function isConnectedToServer(): boolean {
  return wsClient.isConnected() && currentRoomId !== null;
}

// 初始化网络层
export function initNetworkLayer() {
  logger.info('初始化游戏网络层', { url: window.location.href });
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
  // NPC 战斗消息处理
  wsClient.on('npc_attack_result', handleNPCAttackResult);
  wsClient.on('npc_attacked_player', handleNPCAttackedPlayer);
  // 阶段1新增消息处理
  wsClient.on('card_drawn', handleCardDrawn);
  wsClient.on('combat_resolved', handleCombatResolved);
  wsClient.on('error', handleError);
  wsClient.on('server_shutdown', handleServerShutdown);
  // 重连处理
  wsClient.on('reconnect_success', handleReconnectSuccess);
  wsClient.on('player_reconnected', handlePlayerReconnected);
  
  // 连接 WebSocket
  wsClient.connect();
}

// 清理网络层
export function cleanupNetworkLayer() {
  wsClient.disconnect();
}

// 检查是否已连接到服务器（网络模式）
export function isInNetworkMode(): boolean {
  const connected = isConnectedToServer();
  console.log('[isInNetworkMode] wsClient.isConnected():', wsClient.isConnected(), 'currentRoomId:', currentRoomId);
  return connected;
}

// ==================== 消息处理 ====================

function handleRoomCreated(msg: ServerMessage) {
  logger.info('房间已创建', { roomId: msg.roomId, playerId: msg.playerId });
  trackAction('ROOM_CREATED', { roomId: msg.roomId });
  console.log('🏠 房间已创建:', msg);
  currentRoomId = msg.roomId;
  currentPlayerId = msg.playerId;
  
  // 保存到sessionStorage以便刷新后重连
  wsClient.setRoomId(msg.roomId);
  wsClient.setPlayerId(msg.playerId);
  
  const store = useGameStore.getState();
  store.showFeedback(`房间创建成功: ${msg.roomId}`, 'info');
}

function handleRoomJoined(msg: ServerMessage) {
  logger.info('加入房间', { roomId: msg.roomId, playerId: msg.playerId });
  trackAction('ROOM_JOINED', { roomId: msg.roomId });
  console.log('👤 加入房间:', msg);
  currentRoomId = msg.roomId;
  currentPlayerId = msg.playerId;
  
  // 保存到sessionStorage以便刷新后重连
  wsClient.setRoomId(msg.roomId);
  wsClient.setPlayerId(msg.playerId);
  
  const store = useGameStore.getState();
  store.showFeedback('加入房间成功', 'info');
}

function handlePlayerJoined(msg: ServerMessage) {
  logger.info('玩家加入', { playerId: msg.playerId, playerName: msg.playerName });
  trackAction('PLAYER_JOINED', { playerId: msg.playerId, playerName: msg.playerName });
  console.log('👥 玩家加入:', msg);
  const store = useGameStore.getState();
  store.showFeedback(`${msg.playerName} 加入了房间`, 'info');
}

function handlePlayerLeft(msg: ServerMessage) {
  logger.info('玩家离开', { playerId: msg.playerId });
  trackAction('PLAYER_LEFT', { playerId: msg.playerId });
  console.log('👋 玩家离开:', msg);
  const store = useGameStore.getState();
  store.showFeedback(`玩家离开了房间`, 'info');
}

function handlePlayerReady(msg: ServerMessage) {
  console.log('✅ 玩家准备:', msg);
}

function handleGameStarted(msg: ServerMessage) {
  logger.info('游戏开始', { roomId: currentRoomId });
  trackAction('GAME_STARTED', { roomId: currentRoomId });
  console.log('🎮 游戏开始!');
  // 游戏开始时，玩家已连接到服务器，isInNetworkMode() 会自动返回 true
  
  const store = useGameStore.getState();
  store.showFeedback('游戏开始!', 'turn');
  
  // 请求完整游戏状态
  getState();
}

function handleStateSync(msg: ServerMessage) {
  logger.debug('状态同步', { version: msg.version, timestamp: msg.timestamp });
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
  
  // ========== Bug Fix: 合并 players 而非直接替换 ==========
  // 原因：前端玩家有 personalLogs，后端同步时不应丢失
  const oldPlayers = store.players || {};
  const newPlayers = state.players || {};
  
  // 合并每个玩家的数据，保留本地日志
  Object.keys(newPlayers).forEach(pid => {
    if (newPlayers[pid] && oldPlayers[pid]) {
      // 如果后端有 personalLogs 且前端也有，合并它们
      const oldLogIds = new Set((newPlayers[pid].personalLogs || []).map((l: any) => l.id));
      newPlayers[pid] = {
        ...newPlayers[pid],
        personalLogs: [
          ...(newPlayers[pid].personalLogs || []),
          ...((oldPlayers[pid] as any)?.personalLogs || []).filter((l: any) => !oldLogIds.has(l.id))
        ]
      };
    }
  });
  
  // ========== Bug Fix: 保留 lastRollResult 如果后端没发送新值 ==========
  // 原因：后端现在会设置 LastRollResult，但如果 state_sync 先于 dice_result 到达，
  // 我们应该保留本地的 lastRollResult
  const lastRollResult = state.lastRollResult !== undefined ? state.lastRollResult : store.lastRollResult;
  
  // ========== Bug Fix: 直接使用后端日志，避免本地日志无限增长 ==========
  // 后端发送完整日志列表，前端直接使用，不做本地合并
  const mergedLogs = state.logs || [];
  
  // 完整的状态映射
  store.setState({
    // 游戏阶段
    phase: state.phase || 'EXPLORATION',
    turnPhase: state.turnPhase || 'MOVING',
    turnIndex: state.turnIndex || 1,
    
    // 玩家 - 使用合并后的 players
    players: newPlayers,
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
    // Bug Fix: 使用可能保留的 lastRollResult
    lastRollResult: lastRollResult,
    
    // 战斗
    activeCombat: state.activeCombat ? {
      attackerId: state.activeCombat.attackerId,
      defenderId: state.activeCombat.defenderId,
      attribute: state.activeCombat.attribute,
      phase: state.activeCombat.phase,
      attackerRoll: state.activeCombat.attackerRoll,
      defenderRoll: state.activeCombat.defenderRoll,
    } : null,
    
    // Phase X: NPC 系统
    npcs: state.npcs || {},
    
    // Phase 1: 待处理动作
    pendingAction: state.pendingAction ? {
      type: state.pendingAction.type,
      target: state.pendingAction.target,
      data: state.pendingAction.data,
      cardId: state.pendingAction.cardId || undefined,
      message: state.pendingAction.message || undefined,
    } : null,
    
    // 剧本
    currentScenario: state.currentScenario || null,
    lastTriggeredOmen: state.lastTriggeredOmen || null,
    lastTriggeredTile: state.lastTriggeredTile || null,
    
    // 日志 - Bug Fix: 使用合并后的日志
    logs: mergedLogs,
    
    // Phase 2: 目标系统
    heroObjectives: state.heroObjectives || {},
    traitorObjectives: state.traitorObjectives || {},
    turnsSinceHaunt: state.turnsSinceHaunt ?? 0,
    gameWinner: state.gameWinner || null,

    // Phase 3: 房间放置状态同步
    // Bug Fix: 后端 PendingTileRotation 始终为 0（omitempty），若直接覆盖会重置用户旋转。
    // 当 pendingTile 仍存在时，保留前端当前旋转值；tile 清除时才归零。
    pendingTile: state.pendingTile || null,
    pendingTileRotation: (state.pendingTile || null) ? store.pendingTileRotation : 0,
    pendingTargetPosition: state.pendingTargetPos ? { x: state.pendingTargetPos.x, y: state.pendingTargetPos.y } : null,
    pendingMoveDirection: state.pendingMoveDirection || null,
  });
  
  // 显示同步提示（仅首次同步）
  // store.showFeedback('游戏状态已同步', 'info');
}

function handleDiceResult(msg: ServerMessage) {
  console.log('🎲 骰子结果:', msg);

  // 容忍过期请求（后端返回 STALE 类型时不处理）
  if ((msg as any).checkType === 'STALE') {
    console.warn('骰子请求已过期，忽略');
    // 清除可能存在的超时
    clearDiceRollTimeout();
    return;
  }

  const store = useGameStore.getState();
  
  // 清除 DiceRoller 设置的超时，防止结果被超时逻辑清除
  clearDiceRollTimeout();
  
  // 设置骰子结果和检定结果
  const result = (msg as any).actionResult;
  const sum = msg.sum as number;
  const results = msg.results as number[];
  
  // Bug Fix: 正确使用后端返回的 actionResult.success
  // 对于 ATTRIBUTE_CHECK，后端返回的 success 表示检定是否成功
  // 对于 GENERAL/COMBAT 等，success 未定义，使用骰子结果判断
  let isSuccess: boolean;
  let feedbackType: 'turn' | 'info' | 'alert' | 'success';
  
  if (result?.success !== undefined) {
    // 后端返回了明确的成功/失败判定（属性检定）
    isSuccess = result.success;
    feedbackType = isSuccess ? 'turn' : 'info';
  } else {
    // 没有后端判定，使用骰子结果（总和 >= 1 为成功，0 为失败/空白）
    isSuccess = sum > 0;
    feedbackType = isSuccess ? 'turn' : 'info';
  }
  
  // Bug Fix: 不在这里清除 activeRoll，让 DiceRoller 组件在 onComplete 调用时自己清除
  // 这样可以确保 DiceRoller 的 handleDiceResult 先完成动画和显示逻辑
  // 同时保存后端返回的成功/失败判定
  store.setState({
    lastRollResult: sum,
    lastCheckSuccess: result?.success !== undefined ? result.success : (sum > 0)
  });
  
  // 显示反馈 - 使用后端判定的成功/失败文本
  const successText = isSuccess ? '成功！' : '失败...';
  store.showFeedback(`🎲 ${results.join(', ')} = ${sum} (${successText})`, feedbackType);
}

// NPC 攻击结果处理（玩家攻击 NPC）
// 新规则：点数低的一方受伤
function handleNPCAttackResult(msg: ServerMessage) {
  console.log('⚔️ NPC 攻击结果:', msg);
  
  const store = useGameStore.getState();
  const result = (msg as any).result;
  
  if (result) {
    const playerRoll = result.playerRoll;
    const npcRoll = result.npcRoll;
    
    if (result.draw) {
      store.showFeedback(`⚔️ 平局！(${playerRoll} vs ${npcRoll}) 双方无伤`, 'info');
    } else if (result.defeated) {
      store.showFeedback(`🎉 击败了怪物！怪物骰出 ${npcRoll}，你骰出 ${playerRoll}！`, 'success');
    } else if (result.loser === result.npcInstanceId) {
      store.showFeedback(`⚔️ 怪物受伤！骰出 ${npcRoll}，你骰出 ${playerRoll}！造成 ${result.damage} 点伤害！怪物剩余 ${result.npcHealth}/${result.npcMaxHealth} HP`, 'info');
    } else {
      store.showFeedback(`💀 你受伤了！骰出 ${playerRoll}，怪物骰出 ${npcRoll}！受到 ${result.damage} 点理智伤害！`, 'alert');
    }
  }
}

// NPC 攻击玩家结果处理
function handleNPCAttackedPlayer(msg: ServerMessage) {
  console.log('💀 NPC 攻击玩家:', msg);
  
  const store = useGameStore.getState();
  const result = (msg as any).result;
  
  if (result) {
    if (result.draw) {
      store.showFeedback(`⚔️ 平局！(${result.npcRoll} vs ${result.playerRoll}) 双方无伤`, 'info');
    } else if (result.npcDefeated) {
      store.showFeedback(`🎉 击败了怪物！它骰出 ${result.npcRoll}，你骰出 ${result.playerRoll}！`, 'success');
    } else if (result.loser === result.npcInstanceId) {
      store.showFeedback(`⚔️ 怪物受伤！骰出 ${result.npcRoll}，你骰出 ${result.playerRoll}！造成 ${result.damage} 点伤害！`, 'info');
    } else if (result.playerDied) {
      store.showFeedback(`💀 你被击败了！骰出 ${result.playerRoll}，怪物骰出 ${result.npcRoll}！受到 ${result.damage} 点${result.attribute}伤害！`, 'death');
    } else {
      store.showFeedback(`💀 你受伤了！骰出 ${result.playerRoll}，怪物骰出 ${result.npcRoll}！受到 ${result.damage} 点${result.attribute}伤害！`, 'alert');
    }
  }
}

// 抽卡结果处理
function handleCardDrawn(msg: ServerMessage) {
  console.log('🃏 抽卡结果:', msg);
  
  const store = useGameStore.getState();
  const { card, deck } = msg as any;
  
  if (card) {
    // 设置 activeCard 以显示卡牌弹窗
    store.setState({ activeCard: card });
    store.showFeedback(`抽到: ${card.title || card.name || '卡牌'}`, 'info');
  }
}

// 战斗结算处理
function handleCombatResolved(msg: ServerMessage) {
  console.log('⚔️ 战斗结算:', msg);
  
  const store = useGameStore.getState();
  const result = msg.result as any;
  if (result) {
    if (result.draw) {
      store.showFeedback('⚔️ 战斗平局！双方无伤', 'info');
    } else if (result.loser) {
      const loser = store.players[result.loser];
      const loserName = loser?.character?.name || '未知';
      store.showFeedback(
        `⚔️ ${loserName} 受伤！受到 ${result.damage} 点${result.attribute || '力量'}伤害`, 
        'alert'
      );
    } else {
      store.showFeedback('⚔️ 战斗结算完成', 'info');
    }
  }
}

function handleError(msg: ServerMessage) {
  logger.error('游戏错误', { code: msg.code, message: msg.message });
  trackAction('GAME_ERROR', { code: msg.code, message: msg.message });
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

  // 骰子相关错误：清除 activeRoll 防止 UI 卡死
  if (msg.message?.includes('不需要投骰子') || msg.message?.includes('骰子')) {
    store.setState({ activeRoll: null });
  }
}

function handleServerShutdown(msg: ServerMessage) {
  logger.warn('服务器关闭', {});
  console.log('🛑 服务器关闭');
  
  const store = useGameStore.getState();
  store.showFeedback('服务器已关闭', 'error');
  // 服务器关闭时，currentRoomId 会被清除，isInNetworkMode() 会自动返回 false
}

// 处理重连成功
function handleReconnectSuccess(msg: ServerMessage) {
  logger.info('重连成功', { roomId: msg.roomId, playerId: msg.playerId });
  trackAction('RECONNECT_SUCCESS', { roomId: msg.roomId });
  console.log('✅ 重连成功:', msg);
  
  currentRoomId = msg.roomId;
  currentPlayerId = msg.playerId;
  
  // 恢复sessionStorage
  wsClient.setRoomId(msg.roomId);
  wsClient.setPlayerId(msg.playerId);
  
  const store = useGameStore.getState();
  
  // 如果服务器返回了状态，直接使用
  if (msg.state) {
    store.setState({
      phase: msg.state.phase || 'EXPLORATION',
      turnPhase: msg.state.turnPhase || 'MOVING',
      turnIndex: msg.state.turnIndex || 1,
      players: msg.state.players || {},
      playerIds: msg.state.playerIds || [],
      activePlayerId: msg.state.activePlayerId || '',
      map: msg.state.map || {},
      tileDeck: msg.state.tileDeck || [],
      movesRemaining: msg.state.movesRemaining ?? 3,
      omenCount: msg.state.omenCount ?? 0,
      isHauntActive: msg.state.isHauntActive ?? false,
      traitorId: msg.state.traitorId || null,
      activeCard: msg.state.activeCard || null,
      decks: msg.state.decks || { EVENT: [], ITEM: [], OMEN: [] },
      logs: msg.state.logs || [],
    });
    store.showFeedback('已恢复游戏状态', 'info');
  } else {
    // 请求完整状态
    store.showFeedback('正在同步游戏状态...', 'info');
    // 发送 get_state 请求
    wsClient.send({
      type: 'get_state',
      roomId: msg.roomId
    });
  }
}

// 处理其他玩家重连
function handlePlayerReconnected(msg: ServerMessage) {
  logger.info('玩家重连', { playerId: msg.playerId, playerName: msg.playerName });
  const store = useGameStore.getState();
  store.showFeedback(`${msg.playerName} 重新连接了`, 'info');
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
  
  // 清除sessionStorage
  wsClient.setRoomId(null);
  wsClient.setPlayerId(null);
  // 离开房间后，isInNetworkMode() 会自动返回 false
}

// 恢复会话（页面刷新后调用，从 sessionStorage 恢复房间信息）
export function restoreSession() {
  const savedRoomId = sessionStorage.getItem('roomId');
  const savedPlayerId = sessionStorage.getItem('playerId');
  if (savedRoomId) {
    currentRoomId = savedRoomId;
    console.log('[restoreSession] 恢复房间:', savedRoomId);
  }
  if (savedPlayerId) {
    currentPlayerId = savedPlayerId;
  }
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
  // 从 gameStore 读取当前选择的旋转角度
  const { pendingTileRotation } = useGameStore.getState();
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'place_tile',
      direction,
      rotation: pendingTileRotation
    }
  });
}

// 取消房间放置
export function sendCancelTilePlacement() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'cancel_tile_placement'
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

// 解锁技能树节点
export function sendUnlockSkillNode(nodeId: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'unlock_skill_node',
      nodeId,
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

// ==================== 作祟系统 ====================

// 执行作祟检定
export function sendPerformHauntRoll() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'perform_haunt_roll',
    }
  });
}

// 强制触发作祟（调试用）
export function sendForceHaunt() {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'force_haunt',
    }
  });
}

// ==================== Phase 2: 物品与互动操作 ====================

// 捡起物品
export function sendPickupItem(itemId: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'pickup_item',
      itemId
    }
  });
}

// 给予物品
export function sendGiveItem(toPlayerId: string, itemId: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'give_item',
      targetId: toPlayerId,
      itemId
    }
  });
}

// 丢弃物品
export function sendDropItem(itemId: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'drop_item',
      itemId
    }
  });
}

// 破坏墙壁/互动
export function sendInteractWithWall(direction: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'interact_wall',
      direction
    }
  });
}

// ==================== Phase X: NPC 战斗系统 ====================

// 攻击 NPC
export function sendAttackNPC(npcInstanceId: string) {
  const roomId = wsClient.getRoomId();
  if (!roomId) {
    console.error('房间未创建');
    return;
  }
  wsClient.send({
    type: 'game_action',
    roomId: roomId,
    action: {
      actionType: 'attack_npc',
      npcInstanceId
    }
  });
}

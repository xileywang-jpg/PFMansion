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
  console.log('🔄 状态同步:', msg.state);
  
  const state = msg.state as any;
  const store = useGameStore.getState();
  
  // 更新游戏状态
  if (state.phase) {
    // 这里需要将后端状态映射到前端状态
    // 这是一个简化版本
    store.showFeedback('游戏状态已同步', 'info');
  }
}

function handleDiceResult(msg: ServerMessage) {
  console.log('🎲 骰子结果:', msg);
  
  const store = useGameStore.getState();
  store.showFeedback(`骰子: ${msg.results.join(', ')} = ${msg.sum}`, 'info');
}

function handleError(msg: ServerMessage) {
  console.error('❌ 错误:', msg.message);
  
  const store = useGameStore.getState();
  store.showFeedback(msg.message, 'error');
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
  wsClient.send({
    type: 'create_room',
    roomName,
    playerName
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
  wsClient.send({
    type: 'get_state'
  });
}

// 玩家移动
export function sendMove(direction: string) {
  wsClient.send({
    type: 'game_action',
    action: {
      actionType: 'move',
      direction
    }
  });
}

// 放置房间
export function sendPlaceTile(direction: string) {
  wsClient.send({
    type: 'game_action',
    action: {
      actionType: 'place_tile',
      direction
    }
  });
}

// 结束回合
export function sendEndTurn() {
  wsClient.send({
    type: 'game_action',
    action: {
      actionType: 'end_turn'
    }
  });
}

// 投骰子
export function sendRollDice(numDice: number = 1) {
  wsClient.send({
    type: 'game_action',
    action: {
      actionType: 'roll_dice',
      numDice
    }
  });
}

// 修改属性 (仅用于调试/GM)
export function sendModifyStat(attribute: string, amount: number) {
  wsClient.send({
    type: 'game_action',
    action: {
      actionType: 'modify_stat',
      attribute,
      amount
    }
  });
}

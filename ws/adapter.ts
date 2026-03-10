// 网络模式适配器
// 将本地操作转换为网络消息

import { useGameStore } from '../store/gameStore';
import * as network from './network';
import { TileInstance } from '../types';

let isNetworkMode = false;

// 初始化网络模式
export function initNetworkMode() {
  isNetworkMode = true;
  console.log('🌐 网络模式已启用');
}

// 退出网络模式
export function exitNetworkMode() {
  isNetworkMode = false;
  console.log('🌐 网络模式已禁用');
}

// 检查是否在网络模式
export function isInNetworkMode(): boolean {
  return isNetworkMode;
}

// 包装移动操作
export function wrapMovePlayer(direction: string) {
  if (isNetworkMode) {
    // 网络模式：发送网络请求
    network.sendMove(direction);
    return true;
  }
  // 本地模式：返回 false 让原函数执行
  return false;
}

// 包装放置房间
export function wrapPlaceTile(direction: string) {
  if (isNetworkMode) {
    network.sendPlaceTile(direction);
    return true;
  }
  return false;
}

// 包装结束回合
export function wrapEndTurn() {
  if (isNetworkMode) {
    network.sendEndTurn();
    return true;
  }
  return false;
}

// 包装投骰子
export function wrapRollDice(numDice: number = 1) {
  if (isNetworkMode) {
    network.sendRollDice(numDice);
    return true;
  }
  return false;
}

// 包装初始化游戏（单人模式）
export function wrapInitializeGame() {
  if (isNetworkMode) {
    // 网络模式下不应调用本地初始化
    return true;
  }
  return false;
}

// 从网络状态同步到本地 store
export function syncFromNetwork(state: any) {
  const store = useGameStore.getState();
  
  // 同步基本状态
  if (state.phase) store.setState({ phase: state.phase });
  if (state.turnPhase) store.setState({ turnPhase: state.turnPhase });
  if (state.turnIndex) store.setState({ turnIndex: state.turnIndex });
  if (state.activePlayerId) store.setState({ activePlayerId: state.activePlayerId });
  if (state.movesRemaining !== undefined) store.setState({ movesRemaining: state.movesRemaining });
  if (state.omenCount !== undefined) store.setState({ omenCount: state.omenCount });
  if (state.isHauntActive !== undefined) store.setState({ isHauntActive: state.isHauntActive });
  
  // 同步地图
  if (state.map) {
    const map: Record<string, TileInstance> = {};
    for (const [key, tile] of Object.entries(state.map)) {
      map[key] = tile as TileInstance;
    }
    store.setState({ map });
  }
  
  // 同步日志
  if (state.logs) {
    store.setState({ logs: state.logs });
  }
}

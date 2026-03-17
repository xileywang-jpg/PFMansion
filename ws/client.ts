// WebSocket 客户端 for Mansion Protocol
// 用于连接游戏后端
import { logger, trackAction } from './logger';

export type MessageType = 
  | 'room_created'
  | 'room_joined'
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'room_list'
  | 'game_started'
  | 'state_sync'
  | 'dice_result'
  | 'error'
  | 'server_shutdown';

export interface ServerMessage {
  type: MessageType;
  [key: string]: any;
}

export interface WSClient {
  connect: () => void;
  disconnect: () => void;
  send: (message: object) => void;
  isConnected: () => boolean;
  getRoomId: () => string | null;
  getPlayerId: () => string | null;
}

class WebSocketClient implements WSClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectInterval: number = 3000;
  private reconnectTimer: number | null = null;
  private roomId: string | null = null;
  private playerId: string | null = null;
  private messageHandlers: Map<string, (msg: ServerMessage) => void> = new Map();

  constructor(url: string = '') {
    // 自动构建 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = url || `${protocol}//${host}/ws`;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🔌 连接 WebSocket:', this.url);
    logger.info('WebSocket连接中', { url: this.url });
    
    // 检查是否有保存的房间信息用于重连
    const savedRoomId = sessionStorage.getItem('roomId');
    const savedPlayerId = sessionStorage.getItem('playerId');
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket 已连接');
        logger.info('WebSocket已连接', {});
        this.stopReconnect();
        
        // 如果有保存的房间信息，尝试重连
        if (savedRoomId && savedPlayerId) {
          console.log('🔄 尝试恢复房间连接:', savedRoomId);
          logger.info('尝试恢复房间连接', { roomId: savedRoomId, playerId: savedPlayerId });
          // 发送重连请求
          this.send({
            type: 'reconnect',
            roomId: savedRoomId,
            playerId: savedPlayerId
          });
        }
      };

      this.ws.onclose = (event) => {
        console.log('❌ WebSocket 断开:', event.code, event.reason);
        logger.warn('WebSocket断开', { code: event.code, reason: event.reason });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('⚠️ WebSocket 错误:', error);
        logger.error('WebSocket错误', { error: String(error) });
      };

      this.ws.onmessage = (event) => {
        try {
          // 处理多消息（用换行分隔）
          const messages = event.data.split('\n').filter((m: string) => m.trim());
          messages.forEach((dataStr: string) => {
            if (!dataStr.trim()) return;
            
            const msg: ServerMessage = JSON.parse(dataStr);
            this.handleMessage(msg);
          });
        } catch (e) {
          console.error('解析消息失败:', e);
          // 发送错误事件供 UI 监听
          this.handleMessage({ type: 'error', message: '收到无效的服务器消息' });
        }
      };
    } catch (e) {
      console.error('创建 WebSocket 失败:', e);
      // 发送错误事件供 UI 监听
      this.handleMessage({ type: 'error', message: '无法连接到服务器，正在重试...' });
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.stopReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
    this.playerId = null;
  }

  send(message: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (e) {
        console.error('发送消息失败:', e);
        this.handleMessage({ type: 'error', message: '发送消息失败，请重新连接' });
      }
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
      // 提示用户重新连接
      this.handleMessage({ type: 'error', message: '未连接到服务器，请刷新页面' });
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  setRoomId(id: string | null) {
    this.roomId = id;
    if (id) {
      sessionStorage.setItem('roomId', id);
    } else {
      sessionStorage.removeItem('roomId');
    }
  }

  setPlayerId(id: string | null) {
    this.playerId = id;
    if (id) {
      sessionStorage.setItem('playerId', id);
    } else {
      sessionStorage.removeItem('playerId');
    }
  }

  on(type: string, handler: (msg: ServerMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  off(type: string) {
    this.messageHandlers.delete(type);
  }

  private handleMessage(msg: ServerMessage) {
    console.log('📨 收到消息:', msg.type, JSON.stringify(msg).substring(0, 200));

    // 预先处理一些消息
    switch (msg.type) {
      case 'room_created':
      case 'room_joined':
        this.roomId = msg.roomId;
        this.playerId = msg.playerId;
        break;
      case 'reconnect_success':
        // 重连成功，恢复房间和玩家ID
        this.roomId = msg.roomId;
        this.playerId = msg.playerId;
        console.log('✅ 重连成功，恢复房间:', msg.roomId);
        logger.info('重连成功', { roomId: msg.roomId, playerId: msg.playerId });
        break;
      case 'player_left':
        // 处理玩家离开
        break;
    }

    // 调用注册的处理器
    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      handler(msg);
    }

    // 通用处理器
    const genericHandler = this.messageHandlers.get('*');
    if (genericHandler) {
      genericHandler(msg);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    console.log(`⏳ ${this.reconnectInterval / 1000}秒后尝试重连...`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  private stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// 导出单例
export const wsClient = new WebSocketClient();

// 创建新客户端实例（用于测试）
export const createWSClient = (url?: string) => new WebSocketClient(url);

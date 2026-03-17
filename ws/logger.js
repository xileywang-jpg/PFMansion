// 前端日志模块 - 统一日志管理
// 注意：这个日志上报到后端，不依赖游戏WS

class FrontendLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.logLevel = 'DEBUG'; // 默认debug模式
    this.apiEndpoint = '/api/admin/frontend-logs';
    this.enabled = true;

    // 从localStorage读取日志级别设置
    const savedLevel = localStorage.getItem('logLevel');
    if (savedLevel) {
      this.logLevel = savedLevel;
    }

    // 页面加载时记录
    this.info('PAGE_LOAD', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    // 页面卸载时尝试上报日志
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  shouldLog(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  addLog(level, event, data) {
    if (!this.enabled || !this.shouldLog(level)) return;

    const entry = {
      timestamp: Date.now(),
      level,
      event,
      data,
      url: window.location.href
    };

    this.logs.push(entry);

    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 控制台输出
    const prefix = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌'
    };

    console.log(`${prefix[level]} [${level}] ${event}`, data || '');
  }

  // 立即发送到后端
  async sendToBackend(logs) {
    if (logs.length === 0) return;

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs,
          sessionId: this.getSessionId(),
          userId: this.getUserId()
        }),
        // 确保在页面卸载前完成发送
        keepalive: true
      });
    } catch (e) {
      // 静默失败，不影响用户体验
      console.warn('日志上报失败:', e);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user).id || JSON.parse(user).username || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  // 公开日志方法
  debug(event, data) {
    this.addLog('DEBUG', event, data);
  }

  info(event, data) {
    this.addLog('INFO', event, data);
  }

  warn(event, data) {
    this.addLog('WARN', event, data);
  }

  error(event, data) {
    this.addLog('ERROR', event, data);
  }

  // 设置日志级别
  setLevel(level) {
    this.logLevel = level;
    localStorage.setItem('logLevel', level);
    this.info('LOG_LEVEL_CHANGED', { level });
  }

  getLevel() {
    return this.logLevel;
  }

  // 刷新/上报日志
  async flush() {
    if (this.logs.length === 0) return;
    
    const logsToSend = [...this.logs];
    this.logs = [];
    await this.sendToBackend(logsToSend);
  }

  // 获取本地日志（用于调试）
  getLogs() {
    return [...this.logs];
  }

  // 清空本地日志
  clear() {
    this.logs = [];
  }

  // 启用/禁用日志
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // 页面事件日志便捷方法
  pageView(pageName) {
    this.info('PAGE_VIEW', { page: pageName });
  }

  // 用户操作日志
  userAction(action, data) {
    this.info('USER_ACTION', { action, ...data });
  }

  // 错误日志（自动捕获）
  captureError(error, context) {
    this.error('JS_ERROR', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
}

// 导出单例
const logger = new FrontendLogger();

// 页面事件跟踪
function trackPageView(pageName) {
  logger.pageView(pageName);
}

// 用户操作跟踪
function trackAction(action, data) {
  logger.userAction(action, data);
}

// 自动捕获全局错误
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.captureError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.captureError(new Error(event.reason?.message || 'Unhandled Promise Rejection'), {
      reason: event.reason
    });
  });
}

export { logger, trackPageView, trackAction };
export default logger;

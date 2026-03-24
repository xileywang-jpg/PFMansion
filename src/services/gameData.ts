/**
 * 游戏数据服务 - 从后端获取静态卡牌数据
 * 
 * 数据类型:
 * - 卡牌静态数据 (items, omens, skills, events, scenarios, characters, skillTrees, tiles)
 * - 实时状态数据 (通过 WebSocket state_sync 获取)
 * 
 * 日志级别:
 * - INFO: 正常加载
 * - WARN: 使用降级数据
 * - ERROR: 加载失败
 */

import { useGameStore } from '../../store/gameStore';

// API 基础路径
const API_BASE = '/api/game/data';

// 缓存配置
let cachedData: GameDataBundle | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 降级状态标记（用于日志）
let isUsingFallback = false;

// ==================== 类型定义 ====================

export interface GameDataBundle {
  themes: any[];
  tiles: { original: any[]; volantis: any[] };
  items: any[];
  omens: any[];
  skills: any[];
  events: any[];
  scenarios: any[];
  skillTrees: any[];
  characters: { original: any[]; volantis: any[] };
  version: number;
  timestamp: number;
}

// ==================== 日志工具 ====================

const Log = {
  info: (message: string, data?: any) => {
    console.log(`%c[GameData] ${message}`, 'color: #4ade80; font-weight: bold', data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`%c[GameData] ⚠️ ${message}`, 'color: #facc15; font-weight: bold', data || '');
  },
  error: (message: string, data?: any) => {
    console.error(`%c[GameData] ❌ ${message}`, 'color: #f87171; font-weight: bold', data || '');
  },
};

// ==================== 缓存管理 ====================

/**
 * 获取游戏数据（带缓存）
 */
export async function fetchGameData(forceRefresh = false): Promise<GameDataBundle> {
  const now = Date.now();

  // 检查缓存是否有效
  if (!forceRefresh && cachedData && (now - cacheTime) < CACHE_DURATION) {
    if (isUsingFallback) {
      Log.warn('使用过期缓存数据（API仍不可用）');
    }
    return cachedData;
  }

  try {
    const response = await fetch(`${API_BASE}/all`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: GameDataBundle = {
      ...await response.json(),
      version: now,
      timestamp: now,
    };

    // 更新缓存
    cachedData = data;
    cacheTime = now;
    isUsingFallback = false;

    // 同时更新 store
    useGameStore.getState().setGameData(data);

    Log.info('✅ 数据加载成功（API）', {
      items: data.items.length,
      omens: data.omens.length,
      skills: data.skills.length,
      events: data.events.length,
      scenarios: Object.keys(data.scenarios).length,
    });

    return data;
  } catch (error) {
    const err = error as Error;
    Log.error('API加载失败', { error: err.message });

    // 如果有缓存但过期了，返回缓存（降级处理）
    if (cachedData) {
      isUsingFallback = true;
      Log.warn('🔄 使用降级数据（本地缓存）', {
        cachedAt: new Date(cacheTime).toISOString(),
        fallback: true,
      });
      return cachedData;
    }

    // 没有缓存，抛出错误
    isUsingFallback = true;
    Log.error('❗ 无法加载游戏数据，使用空数据', { error: err.message });
    
    // 返回最小化的空数据结构
    const emptyData: GameDataBundle = {
      themes: [],
      tiles: { original: [], volantis: [] },
      items: [],
      omens: [],
      skills: [],
      events: [],
      scenarios: [],
      skillTrees: [],
      characters: { original: [], volantis: [] },
      version: 0,
      timestamp: now,
    };
    
    // 更新 store 为空数据
    useGameStore.getState().setGameData(emptyData);
    
    return emptyData;
  }
}

/**
 * 清除数据缓存
 */
export function clearGameDataCache(): void {
  cachedData = null;
  cacheTime = 0;
  isUsingFallback = false;
  Log.info('缓存已清除');
}

/**
 * 刷新数据（强制重新加载）
 */
export async function refreshGameData(): Promise<GameDataBundle> {
  Log.info('强制刷新游戏数据...');
  clearGameDataCache();
  return fetchGameData(true);
}

/**
 * 检查当前是否使用降级数据
 */
export function isFallbackMode(): boolean {
  return isUsingFallback;
}

// ==================== 便捷访问函数 ====================

/**
 * 获取物品数据
 */
export async function fetchItems() {
  const data = await fetchGameData();
  return data.items;
}

/**
 * 获取厄运数据
 */
export async function fetchOmens() {
  const data = await fetchGameData();
  return data.omens;
}

/**
 * 获取技能数据
 */
export async function fetchSkills() {
  const data = await fetchGameData();
  return data.skills;
}

/**
 * 获取事件数据
 */
export async function fetchEvents() {
  const data = await fetchGameData();
  return data.events;
}

/**
 * 获取剧本数据
 */
export async function fetchScenarios() {
  const data = await fetchGameData();
  return data.scenarios;
}

/**
 * 获取角色数据
 */
export async function fetchCharacters(theme: string = 'original') {
  const data = await fetchGameData();
  return theme === 'volantis' ? data.characters.volantis : data.characters.original;
}

/**
 * 获取技能树数据
 */
export async function fetchSkillTrees() {
  const data = await fetchGameData();
  return data.skillTrees;
}

/**
 * 获取地图数据
 */
export async function fetchTiles(theme: string = 'original') {
  const data = await fetchGameData();
  return theme === 'volantis' ? data.tiles.volantis : data.tiles.original;
}

/**
 * 获取主题列表
 */
export async function fetchThemes() {
  const data = await fetchGameData();
  return data.themes;
}

// ==================== Hook ====================

import { useState, useEffect, useCallback } from 'react';

/**
 * 游戏数据 Hook
 */
export function useGameData() {
  const [data, setData] = useState<GameDataBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gameData = await fetchGameData();
      setData(gameData);
      setUsingFallback(isFallbackMode());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, usingFallback, reload: loadData };
}

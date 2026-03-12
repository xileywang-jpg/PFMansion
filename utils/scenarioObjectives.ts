/**
 * 剧本目标追踪系统
 * 处理多阶段目标、胜利条件检查
 */

import { Scenario, ScenarioObjective, ScenarioPhase, Player } from '../types';

export interface ScenarioState {
  scenarioId: string;
  currentPhase: number;
  objectives: ScenarioObjective[];
  heroObjectives: ScenarioObjective[];
  traitorObjectives: ScenarioObjective[];
  turnsElapsed: number;
  isComplete: boolean;
  winner?: 'HERO' | 'TRAITOR';
}

/**
 * 创建剧本状态
 */
export const createScenarioState = (scenario: Scenario): ScenarioState => {
  const state: ScenarioState = {
    scenarioId: scenario.id,
    currentPhase: 0,
    objectives: [],
    heroObjectives: [],
    traitorObjectives: [],
    turnsElapsed: 0,
    isComplete: false
  };

  // 初始化目标
  if (scenario.heroInfo.objectives) {
    state.heroObjectives = scenario.heroInfo.objectives.map(obj => ({
      ...obj,
      completed: false,
      progress: 0
    }));
  }

  if (scenario.traitorInfo.objectives) {
    state.traitorObjectives = scenario.traitorInfo.objectives.map(obj => ({
      ...obj,
      completed: false,
      progress: 0
    }));
  }

  // 初始化多阶段目标
  if (scenario.phases && scenario.phases.length > 0) {
    state.objectives = [...scenario.phases[0].objectives];
  }

  return state;
};

/**
 * 更新目标进度
 */
export const updateObjectiveProgress = (
  state: ScenarioState,
  objectiveId: string,
  amount: number
): ScenarioState => {
  const updateObjectives = (objectives: ScenarioObjective[]): ScenarioObjective[] => {
    return objectives.map(obj => {
      if (obj.id === objectiveId) {
        const newProgress = Math.min(obj.progress + amount, obj.required);
        return {
          ...obj,
          progress: newProgress,
          completed: newProgress >= obj.required
        };
      }
      return obj;
    });
  };

  return {
    ...state,
    heroObjectives: updateObjectives(state.heroObjectives),
    traitorObjectives: updateObjectives(state.traitorObjectives),
    objectives: updateObjectives(state.objectives)
  };
};

/**
 * 检查胜利条件
 */
export const checkVictoryConditions = (
  state: ScenarioState,
  players: Record<string, Player>,
  traitorId?: string
): { winner: 'HERO' | 'TRAITOR' | null } => {
  // 检查英雄胜利
  const allHeroComplete = state.heroObjectives.every(obj => obj.completed);
  if (allHeroComplete) {
    return { winner: 'HERO' };
  }

  // 检查叛徒胜利
  const allTraitorComplete = state.traitorObjectives.every(obj => obj.completed);
  if (allTraitorComplete && traitorId) {
    const traitor = players[traitorId];
    if (traitor && traitor.isDead) {
      // 叛徒死亡，英雄胜利
      return { winner: 'HERO' };
    }
    return { winner: 'TRAITOR' };
  }

  // 检查生存胜利（时间胜利）
  const heroPlayers = Object.values(players).filter(p => p.team !== 'TRAITOR' && !p.isDead);
  if (heroPlayers.length === 0) {
    return { winner: 'TRAITOR' };
  }

  return { winner: null };
};

/**
 * 获取当前阶段目标描述
 */
export const getCurrentPhaseObjectives = (state: ScenarioState): ScenarioObjective[] => {
  return state.objectives;
};

/**
 * 回合递增
 */
export const incrementTurn = (state: ScenarioState): ScenarioState => {
  return {
    ...state,
    turnsElapsed: state.turnsElapsed + 1
  };
};

/**
 * 切换阶段
 */
export const advancePhase = (
  state: ScenarioState,
  phases: ScenarioPhase[]
): ScenarioState => {
  const nextPhase = state.currentPhase + 1;
  
  if (nextPhase >= phases.length) {
    return {
      ...state,
      isComplete: true
    };
  }

  return {
    ...state,
    currentPhase: nextPhase,
    objectives: [...phases[nextPhase].objectives]
  };
};

/**
 * 获取目标进度文本
 */
export const getObjectiveProgressText = (objective: ScenarioObjective): string => {
  return `${objective.name}: ${objective.progress}/${objective.required}`;
};

/**
 * 获取所有未完成目标
 */
export const getIncompleteObjectives = (state: ScenarioState): ScenarioObjective[] => {
  return state.objectives.filter(obj => !obj.completed);
};

/**
 * 目标类型检测（用于自动更新进度）
 */
export const detectObjectiveType = (
  event: string,
  objectives: ScenarioObjective[]
): string | null => {
  for (const obj of objectives) {
    if (obj.id.includes('defeat') && event.includes('defeat')) {
      return obj.id;
    }
    if (obj.id.includes('collect') && event.includes('item')) {
      return obj.id;
    }
    if (obj.id.includes('reach') && event.includes('tile')) {
      return obj.id;
    }
    if (obj.id.includes('survive') && event.includes('turn')) {
      return obj.id;
    }
  }
  return null;
};

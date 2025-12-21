
/**
 * Haunt Matrix: Omen Card + Room Tile = Scenario
 */

export const getScenarioId = (omenId: string, tileDefId: string): string => {
  // 特殊组合：水晶球 + 图书馆 -> 丧尸崛起
  if (omenId === 'omen_crystal_ball' && tileDefId === 'tile_library') {
    return 'haunt_01';
  }

  // 其他组合可以继续添加...
  // 默认 fallback: 末日决战
  return 'haunt_00';
};

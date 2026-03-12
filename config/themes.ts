/**
 * 服务器主题配置
 * 
 * 在此文件中配置本次服务发布的主题
 * 用户将只能从这些主题中选择
 */

// 可用的主题列表
export const ENABLED_THEMES = [
  {
    id: 'original',
    name: '原版',
    description: '经典山屋惊魂',
    primaryColor: '#8B4513'
  },
  {
    id: 'volantis',
    name: '翁法罗斯',
    description: '崩坏星穹铁道 - 永恒之地',
    primaryColor: '#FFD700'
  }
];

// 默认主题（用户未选择时使用）
export const DEFAULT_THEME = 'original';

// 导出便捷函数
export function getEnabledThemeIds(): string[] {
  return ENABLED_THEMES.map(t => t.id);
}

export function getThemeConfig(id: string) {
  return ENABLED_THEMES.find(t => t.id === id);
}

export function isThemeEnabled(id: string): boolean {
  return ENABLED_THEMES.some(t => t.id === id);
}

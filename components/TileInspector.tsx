/**
 * TileInspector - 地块详情悬窗
 * 
 * 改进：
 * - 始终显示完整地块定义（不受 hasEventTriggered 影响）
 * - 区分一次性事件和可重入事件
 * - 显示 onEnter/onLeave 效果
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { STARTING_TILE } from '../constants';
import { Direction, TileDef, TileTrigger, Card } from '../types';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Zap, AlertTriangle, Sparkles, Package, 
  ArrowRight, ArrowLeft, RefreshCw, Clock, 
  HelpCircle, DoorOpen
} from 'lucide-react';

// ==================== 图标映射 ====================

const EFFECT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  buff: Zap,
  debuff: AlertTriangle,
  trigger: Sparkles,
  item: Package,
};

const EFFECT_COLOR_MAP: Record<string, string> = {
  buff: 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10',
  debuff: 'text-red-400 border-red-900/50 bg-red-900/10',
  trigger: 'text-amber-400 border-amber-900/50 bg-amber-900/10',
  item: 'text-indigo-400 border-indigo-900/50 bg-indigo-900/10',
};

// ==================== 工具函数 ====================

/** 获取边缘方向的中文标签 */
const getEdgeLabel = (dir: Direction): string => {
  switch (dir) {
    case 'N': return '北';
    case 'S': return '南';
    case 'E': return '东';
    case 'W': return '西';
    default: return dir;
  }
};

/** 获取边缘类型的样式 */
const getEdgeStyle = (edge: string): { bg: string; text: string } => {
  switch (edge) {
    case 'OPEN': return { bg: 'bg-zinc-700', text: 'text-zinc-200' };
    case 'RUBBLE': return { bg: 'bg-amber-900/50', text: 'text-amber-500' };
    case 'SECRET_DOOR': return { bg: 'bg-indigo-900/50', text: 'text-indigo-500' };
    default: return { bg: 'bg-zinc-900', text: 'text-zinc-700' };
  }
};

/** 将 Effect 对象转换为可读文本 */
const renderEffectText = (effect: any): string => {
  if (effect.message) return effect.message;
  
  switch (effect.type) {
    case 'MODIFY_STAT':
      return `${effect.stat === 'might' ? '力量' : effect.stat === 'speed' ? '速度' : effect.stat === 'sanity' ? '理智' : effect.stat === 'knowledge' ? '知识' : effect.stat} ${effect.amount > 0 ? '+' : ''}${effect.amount}`;
    case 'DAMAGE':
      return `受到 ${effect.amount} 点伤害`;
    case 'HEAL':
      return `恢复 ${effect.amount} 点生命`;
    case 'DRAW_CARD':
      return `抽取 ${effect.count || 1} 张卡牌`;
    case 'LOG':
      return effect.message || '记录日志';
    case 'MOVE_PLAYER':
      return `移动到 ${effect.location || '指定位置'}`;
    default:
      return effect.type || '未知效果';
  }
};

/** 获取触发器类型的标签 */
const getTriggerTypeLabel = (trigger: TileTrigger): string => {
  if (trigger.type === 'ATTRIBUTE_CHECK') {
    return `属性检定 (${trigger.attribute} ${trigger.difficulty || '?'}+)`;
  }
  if (trigger.type === 'DRAW_CARD') {
    return `抽卡 (${trigger.count || 1}张)`;
  }
  if (trigger.type === 'RANDOM_EVENT') {
    return '随机事件';
  }
  return trigger.type;
};

// ==================== 效果渲染 ====================

interface EffectItemProps {
  text: string;
  type: 'buff' | 'debuff' | 'trigger' | 'item';
  index?: number;
}

const EffectItem: React.FC<EffectItemProps> = ({ text, type, index }) => {
  const Icon = EFFECT_ICON_MAP[type] || Sparkles;
  const colorClass = EFFECT_COLOR_MAP[type] || 'text-zinc-400 border-zinc-700';
  
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${colorClass} mb-1.5`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span className="text-xs leading-snug opacity-90">{text}</span>
    </div>
  );
};

// ==================== 主组件 ====================

const TileInspector: React.FC = () => {
  const { 
    hoveredTileId, 
    map, 
    players, 
    activePlayerId, 
    pendingTile, 
    getTileById,
    gameData 
  } = useGameStore();
  
  const activePlayer = players[activePlayerId];

  // 获取当前显示的地块
  const currentTile = useMemo(() => {
    // 优先 pendingTile（正在放置的地块）
    if (pendingTile) {
      return {
        def: pendingTile as TileDef,
        instance: null,
        label: '正在放置...',
        isPending: true,
      };
    }

    // 其次 hoveredTileId（悬停的地块）
    // 如果没有 hover，则显示当前玩家所在的地块
    const activeTileId = hoveredTileId 
      ? hoveredTileId 
      : (activePlayer ? `${activePlayer.position.x},${activePlayer.position.y}` : null);

    if (!activeTileId) return null;

    const instance = map[activeTileId];
    if (!instance) return null;

    const def = instance.defId === STARTING_TILE.id
      ? STARTING_TILE 
      : getTileById(instance.defId);

    if (!def) return null;

    return {
      def,
      instance,
      label: `坐标: ${instance.x}, ${instance.y}`,
      isPending: false,
      isCurrentPlayer: !hoveredTileId && activePlayer && 
        activePlayer.position.x === instance.x && 
        activePlayer.position.y === instance.y,
    };
  }, [hoveredTileId, map, activePlayer, pendingTile, getTileById]);

  // 获取关联的事件详情
  const eventDetails = useMemo(() => {
    if (!currentTile?.def.eventTrigger || !gameData?.events) {
      return null;
    }
    const event = gameData.events.find((e: Card) => e.id === currentTile.def.eventTrigger);
    return event || null;
  }, [currentTile, gameData]);

  if (!currentTile) return null;

  const { def, instance, label, isPending, isCurrentPlayer } = currentTile;
  
  // 获取图标
  const IconComponent = (def.icon && (Icons as any)[def.icon]) 
    ? (Icons as any)[def.icon] 
    : DoorOpen;

  // 是否显示边缘信息
  const showEdges = !isPending && instance;

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key={isPending ? 'pending' : instance?.instanceId || 'none'} 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: 20 }} 
        transition={{ duration: 0.2 }} 
        className={`
          absolute top-6 right-80 mr-6 w-80 
          backdrop-blur-xl border shadow-2xl rounded-xl 
          overflow-hidden z-30
          ${isPending 
            ? 'bg-indigo-950/90 border-indigo-500/50' 
            : isCurrentPlayer
              ? 'bg-zinc-900/95 border-emerald-500/30'
              : 'bg-zinc-900/95 border-zinc-700/80'
          }
        `}
      >
        {/* ==================== 头部 ==================== */}
        <div className={`
          p-5 pb-4 border-b border-zinc-800/60
          ${isPending ? 'bg-indigo-950/50' : 'bg-gradient-to-br from-zinc-800/50 to-zinc-900/50'}
        `}>
          {/* 状态标签 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isPending && (
                <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-900/50 border border-indigo-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  新放置
                </span>
              )}
              {isCurrentPlayer && (
                <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <MapPin size={10} />
                  当前位置
                </span>
              )}
              {showEdges && instance && (
                <span className="text-[10px] text-zinc-500 font-mono">{label}</span>
              )}
            </div>
          </div>

          {/* 图标和名称 */}
          <div className="flex items-start gap-4">
            <div className={`
              p-3 rounded-xl
              ${isPending 
                ? 'bg-indigo-900/40 text-indigo-400' 
                : isCurrentPlayer
                  ? 'bg-emerald-900/30 text-emerald-400'
                  : 'bg-zinc-800/80 text-zinc-400'
              }
            `}>
              <IconComponent size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`
                text-xl font-serif-display font-bold tracking-wide mb-1
                ${isPending ? 'text-indigo-200' : 'text-zinc-100'}
              `}>
                {def.name}
              </h2>
              <p className="text-xs text-zinc-500 italic leading-relaxed line-clamp-2">
                "{def.description}"
              </p>
            </div>
          </div>
        </div>

        {/* ==================== 内容区 ==================== */}
        <div className="p-4 space-y-4">
          
          {/* ==================== 边缘方向 ==================== */}
          {showEdges && instance && (
            <div className="bg-zinc-950/50 p-3 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                出口方向
              </span>
              <div className="flex gap-1.5">
                {(['N', 'S', 'E', 'W'] as const).map(dir => {
                  const edge = instance.edges[dir];
                  const style = getEdgeStyle(edge);
                  return (
                    <div 
                      key={dir}
                      className={`flex-1 h-7 flex items-center justify-center rounded text-[10px] font-bold ${style.bg} ${style.text}`}
                      title={edge}
                    >
                      {getEdgeLabel(dir)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== 地块效果（onEnter/onLeave/onEnterEffects/effects） ==================== */}
          {(def.effects?.length || def.onEnter || def.onLeave || def.onEnterEffects?.length) && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                地块效果
              </span>
              
              {/* onEnter 效果（可重入） */}
              {def.onEnter && (
                <div className="mb-2 p-2.5 bg-cyan-900/20 border border-cyan-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowRight size={12} className="text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      进入时触发
                    </span>
                    <RefreshCw size={10} className="text-cyan-600 ml-auto" title="可重入" />
                  </div>
                  <p className="text-xs text-cyan-300/80 leading-snug">
                    {getTriggerTypeLabel(def.onEnter)}
                  </p>
                </div>
              )}

              {/* onLeave 效果 */}
              {def.onLeave && (
                <div className="mb-2 p-2.5 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowLeft size={12} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      离开时触发
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/80 leading-snug">
                    {getTriggerTypeLabel(def.onLeave)}
                  </p>
                </div>
              )}

              {/* onEnterEffects 旧版效果（直接生效，可重入） */}
              {def.onEnterEffects && def.onEnterEffects.length > 0 && (
                <div className="mb-2 p-2.5 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowRight size={12} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                      进入时效果
                    </span>
                    <RefreshCw size={10} className="text-purple-600 ml-auto" title="可重入" />
                  </div>
                  <div className="space-y-1">
                    {def.onEnterEffects.map((effect, idx) => (
                      <div key={idx} className="text-xs text-purple-300/80 leading-snug">
                        • {renderEffectText(effect)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 静态效果 */}
              {def.effects?.map((effect, idx) => (
                <EffectItem 
                  key={idx}
                  text={effect.text}
                  type={effect.type as 'buff' | 'debuff' | 'trigger' | 'item'}
                  index={idx}
                />
              ))}
            </div>
          )}

          {/* ==================== 事件卡详情 ==================== */}
          {eventDetails && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                关联事件
              </span>
              <div className={`
                p-3 rounded-lg border
                ${instance?.hasEventTriggered 
                  ? 'bg-zinc-800/50 border-zinc-700/50' 
                  : 'bg-amber-900/20 border-amber-800/30'
                }
              `}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {eventDetails.icon && (Icons as any)[eventDetails.icon] && (
                      <div className="p-1.5 bg-zinc-800 rounded">
                        {(Icons as any)[eventDetails.icon]({ size: 14, className: 'text-zinc-400' })}
                      </div>
                    )}
                    <span className="text-sm font-bold text-zinc-200">{eventDetails.title}</span>
                  </div>
                  
                  {/* 触发状态标签 */}
                  {instance?.hasEventTriggered ? (
                    <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase">
                      <Clock size={10} />
                      已触发
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold uppercase animate-pulse">
                      <Sparkles size={10} />
                      待触发
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-zinc-400 italic leading-relaxed mb-2">
                  "{eventDetails.description}"
                </p>

                {/* 触发类型 */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-zinc-500">触发方式：</span>
                  <span className={`
                    font-bold uppercase tracking-wider
                    ${eventDetails.triggerType === 'ON_ENTER' ? 'text-cyan-400' : 
                      eventDetails.triggerType === 'ON_EXIT' ? 'text-amber-400' : 
                      eventDetails.triggerType === 'MANUAL' ? 'text-indigo-400' : 'text-zinc-400'}
                  `}>
                    {eventDetails.triggerType === 'ON_ENTER' && '进入时触发 (可重入)'}
                    {eventDetails.triggerType === 'ON_EXIT' && '离开时触发'}
                    {eventDetails.triggerType === 'MANUAL' && '手动触发'}
                    {!eventDetails.triggerType && '揭示时触发 (一次性)'}
                  </span>
                  {eventDetails.triggerType === 'ON_ENTER' && (
                    <RefreshCw size={10} className="text-cyan-600" />
                  )}
                </div>

                {/* 互动信息 */}
                {eventDetails.interaction?.type === 'CHOICE' && eventDetails.interaction.options && (
                  <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    <span className="text-[10px] text-zinc-500 block mb-1">可用选项：</span>
                    <div className="flex flex-wrap gap-1">
                      {eventDetails.interaction.options.map((opt: any, idx: number) => (
                        <span 
                          key={idx}
                          className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700/50"
                        >
                          {opt.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 无事件时提示 */}
          {!eventDetails && !def.effects?.length && !def.onEnter && !def.onLeave && (
            <div className="text-center py-4">
              <HelpCircle size={24} className="text-zinc-700 mx-auto mb-2" />
              <span className="text-xs text-zinc-600 italic">无特殊效果</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TileInspector;

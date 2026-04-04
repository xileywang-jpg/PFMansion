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
import { Direction, TileDef, Card } from '../types';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Sparkles, Clock,
  HelpCircle, DoorOpen, RefreshCw, Hand,
} from 'lucide-react';
import { getTileHintEntries, getTileRevealPresentation } from '../utils/tileReveal';

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

// ==================== 主组件 ====================

const TileInspector: React.FC = () => {
  const { 
    ui,
    map, 
    players, 
    activePlayerId, 
    pendingTile, 
    getEventById,
    getTileById,
    openTileInteraction,
    interactionState,
    activeCard,
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
    const activeTileId = ui.hoveredTileId 
      ? ui.hoveredTileId 
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
      isCurrentPlayer: !ui.hoveredTileId && activePlayer && 
        activePlayer.position.x === instance.x && 
        activePlayer.position.y === instance.y,
    };
  }, [ui.hoveredTileId, map, activePlayer, pendingTile, getTileById]);

  // 获取关联的事件详情
  const eventDetails = useMemo(() => {
    if (!currentTile?.def.eventTrigger) {
      return null;
    }
    const tileTheme = currentTile.def.id.startsWith('vol_') ? 'volantis' : 'original';
    const event = getEventById(currentTile.def.eventTrigger, tileTheme) as Card | undefined;
    return event || null;
  }, [currentTile, getEventById]);

  if (!currentTile) return null;

  const { def, instance, label, isPending, isCurrentPlayer } = currentTile;
  
  // 获取图标
  const IconComponent = (def.icon && (Icons as any)[def.icon]) 
    ? (Icons as any)[def.icon] 
    : DoorOpen;

  // 是否显示边缘信息
  const showEdges = !isPending && instance;
  const revealPresentation = getTileRevealPresentation(def.cardSymbol);
  const CardSymbolIcon = revealPresentation?.icon;
  const tileHintEntries = getTileHintEntries(def);
  const nonRevealHintEntries = tileHintEntries.filter(entry => entry.kind !== 'reveal');
  const isRoomInteractionBlocked = !!interactionState || !!activeCard || ui.roomInteractionDialog.kind !== 'CLOSED';

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
                {([Direction.North, Direction.South, Direction.East, Direction.West] as const).map(dir => {
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

          {/* ==================== 抽牌/揭示提示 ==================== */}
          {revealPresentation && CardSymbolIcon && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                揭示奖励
              </span>
              <div className={`p-3 rounded-lg border ${revealPresentation.panelClassName}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CardSymbolIcon size={14} className={revealPresentation.accentClassName} />
                    <span className={`text-sm font-bold ${revealPresentation.accentClassName}`}>
                      {revealPresentation.label}
                    </span>
                  </div>
                  {instance?.hasEventTriggered ? (
                    <span className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase">
                      <Clock size={10} />
                      已触发
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase ${revealPresentation.accentClassName} ${isPending ? '' : 'animate-pulse'}`}>
                      <Sparkles size={10} />
                      {isPending ? '放置后触发' : '首次进入触发'}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed">
                  {isPending ? revealPresentation.pendingDescription : revealPresentation.description}
                </p>
              </div>
            </div>
          )}

          {/* ==================== 地块效果（onEnter/onLeave/onEnterEffects/effects） ==================== */}
          {nonRevealHintEntries.length > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                房间提示
              </span>

              {nonRevealHintEntries.map(entry => {
                const EntryIcon = entry.icon;
                return (
                  <div key={entry.key} className={`mb-2 p-2.5 border rounded-lg ${entry.containerClassName}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <EntryIcon size={12} className={entry.colorClassName} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${entry.colorClassName}`}>
                        {entry.label}
                      </span>
                      {entry.repeatable && (
                        <span className="ml-auto opacity-70" title="可重复触发">
                          <RefreshCw size={10} className={entry.colorClassName} />
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-snug ${entry.bodyClassName}`}>
                      {entry.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {def.interact && isCurrentPlayer && !isPending && (
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">
                房间互动
              </span>
              <div className="p-3 rounded-lg border bg-indigo-950/20 border-indigo-800/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                      <Hand size={14} />
                      {def.interact.type}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {def.interact.description}
                    </p>
                  </div>
                  <button
                    onClick={() => openTileInteraction(def.interact!, def.id)}
                    disabled={isRoomInteractionBlocked}
                    className="shrink-0 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    {isRoomInteractionBlocked ? '等待中' : '执行'}
                  </button>
                </div>
              </div>
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
          {!revealPresentation && !eventDetails && nonRevealHintEntries.length === 0 && (
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

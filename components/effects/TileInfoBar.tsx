/**
 * TileInfoBar - 底部常驻地块信息栏
 * 
 * 方案 C：保留 TileInspector（右侧悬浮）+ 新增底部常驻摘要栏
 * 
 * 始终显示当前玩家所在地块的简要信息：
 * - 地块图标 + 名称
 * - 效果摘要（最多 2 项）
 * - 点击可展开/聚焦到完整详情
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { STARTING_TILE } from '../../constants';
import * as Icons from 'lucide-react';
import { 
  MapPin,        // 当前位置指示
  ChevronUp,     // 展开指示
  DoorOpen       // 默认图标
} from 'lucide-react';
import { getTileHintEntries } from '../../utils/tileReveal';

const TileInfoBar: React.FC = () => {
  const { 
    map, 
    players, 
    activePlayerId, 
    hoveredTileId,
    pendingTile,
    getTileById,
    setHoveredTileId 
  } = useGameStore();

  const activePlayer = players[activePlayerId];

  // 计算当前显示的地块信息
  const currentTileInfo = useMemo(() => {
    // 优先显示 pendingTile（正在放置的地块）
    if (pendingTile) {
      return {
        tileDef: pendingTile,
        instance: null,
        label: '正在放置...',
        isPending: true,
      };
    }

    // 其次显示 hoveredTileId（悬停的地块）
    if (hoveredTileId) {
      const instance = map[hoveredTileId];
      if (instance) {
        const def = instance.defId === STARTING_TILE.id
          ? STARTING_TILE
          : getTileById(instance.defId);
        if (def) {
          return {
            tileDef: def,
            instance,
            label: `坐标: ${instance.x}, ${instance.y}`,
            isPending: false,
            isHovered: true,
          };
        }
      }
    }

    // 最后显示当前玩家所在的地块（常驻显示）
    if (activePlayer) {
      const posKey = `${activePlayer.position.x},${activePlayer.position.y}`;
      const instance = map[posKey];
      if (instance) {
        const def = instance.defId === STARTING_TILE.id
          ? STARTING_TILE
          : getTileById(instance.defId);
        if (def) {
          return {
            tileDef: def,
            instance,
            label: `当前位置`,
            isPending: false,
            isHovered: false,
            isCurrentPlayer: true,
          };
        }
      }
    }

    return null;
  }, [map, players, activePlayerId, hoveredTileId, pendingTile, getTileById]);

  if (!currentTileInfo) {
    return null;
  }

  const { tileDef, label, isPending, isHovered, isCurrentPlayer } = currentTileInfo;

  // 获取图标组件
  const IconComponent = (() => {
    if (!tileDef.icon) return DoorOpen;
    return (Icons as any)[tileDef.icon] || DoorOpen;
  })();

  // 获取效果摘要（最多显示 2 个）
  const tileHintEntries = getTileHintEntries(tileDef);
  const displayEffects = tileHintEntries.slice(0, 2);
  const hiddenEffectsCount = tileHintEntries.length - displayEffects.length;

  // 处理点击：聚焦到该地块的详情
  const handleClick = () => {
    if (currentTileInfo.instance) {
      // 设置 hoveredTileId 使 TileInspector 显示
      const posKey = `${currentTileInfo.instance.x},${currentTileInfo.instance.y}`;
      setHoveredTileId(posKey);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 30,
          // 每次当前地块变化时也触发入场动画
        }}
        key={currentTileInfo.instance?.instanceId || 'pending'}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[45] cursor-pointer"
        onClick={handleClick}
      >
        <div className={`
          flex items-center gap-4 px-5 py-3 
          bg-zinc-950/95 border rounded-2xl shadow-2xl backdrop-blur-md
          transition-all duration-300 hover:bg-zinc-900/95 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]
          ${isPending 
            ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' 
            : isHovered 
              ? 'border-indigo-400/50 ring-1 ring-indigo-400/30' 
              : isCurrentPlayer 
                ? 'border-zinc-700/50' 
                : 'border-zinc-800/50'
          }
        `}>
          {/* 左侧：图标 + 名称 */}
          <div className="flex items-center gap-3">
            <div className={`
              p-2.5 rounded-xl
              ${isPending 
                ? 'bg-indigo-900/30 text-indigo-400' 
                : isHovered 
                  ? 'bg-indigo-900/20 text-indigo-300' 
                  : 'bg-zinc-800/80 text-zinc-400'
              }
            `}>
              <IconComponent size={22} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`
                  font-serif-display font-bold text-base leading-none
                  ${isPending || isHovered ? 'text-indigo-200' : 'text-zinc-200'}
                `}>
                  {tileDef.name}
                </span>
                {isCurrentPlayer && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400/70 font-bold uppercase tracking-wider">
                    <MapPin size={10} />
                    {label}
                  </span>
                )}
                {!isCurrentPlayer && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {label}
                  </span>
                )}
              </div>
              {tileDef.description && (
                <span className="text-[10px] text-zinc-500 italic mt-0.5 max-w-[200px] truncate">
                  "{tileDef.description}"
                </span>
              )}
            </div>
          </div>

          {/* 分隔线 */}
          {displayEffects.length > 0 && (
            <div className="w-px h-10 bg-zinc-700/50 mx-1" />
          )}

          {/* 右侧：效果摘要 */}
          {displayEffects.length > 0 && (
            <div className="flex items-center gap-3">
              {displayEffects.map((effect, idx) => {
                const EffectIcon = effect.icon;
                const colorClass = effect.colorClassName;
                
                return (
                  <div 
                    key={idx}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      bg-zinc-800/50 border border-zinc-700/30
                      ${effect.type === 'buff' ? 'border-emerald-900/30 bg-emerald-900/10' : ''}
                      ${effect.type === 'debuff' ? 'border-red-900/30 bg-red-900/10' : ''}
                      ${effect.type === 'trigger' ? 'border-amber-900/30 bg-amber-900/10' : ''}
                      ${effect.type === 'item' ? 'border-indigo-900/30 bg-indigo-900/10' : ''}
                    `}
                    title={effect.text}
                  >
                    <EffectIcon size={12} className={colorClass} />
                    <span className="text-[10px] text-zinc-300 max-w-[120px] truncate">
                      {effect.summaryText}
                    </span>
                  </div>
                );
              })}
              
              {hiddenEffectsCount > 0 && (
                <span className="text-[10px] text-zinc-500">
                  +{hiddenEffectsCount}
                </span>
              )}
            </div>
          )}

          {/* 点击提示 */}
          <div className="flex items-center gap-1 text-zinc-600 ml-2">
            <ChevronUp size={14} className="opacity-50" />
            <span className="text-[9px] uppercase tracking-wider">详情</span>
          </div>
        </div>

        {/* 底部装饰线 */}
        <div className={`
          absolute -bottom-px left-1/2 -translate-x-1/2 w-24 h-0.5 rounded-full
          ${isPending ? 'bg-indigo-500/50' : isHovered ? 'bg-indigo-400/50' : 'bg-zinc-700/30'}
        `} />
      </motion.div>
    </AnimatePresence>
  );
};

export default TileInfoBar;

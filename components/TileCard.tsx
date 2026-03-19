
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TileInstance, Direction, AttributeName, Player } from '../types';
import { STARTING_TILE, PLAYER_COLORS, getTilesForGame } from '../constants';
import { useGameStore } from '../store/gameStore';
import * as Icons from 'lucide-react';
import { Hammer, Search, Ghost, Ban, Package, Skull } from 'lucide-react';

interface TileCardProps {
  tile: TileInstance;
  isActive: boolean;
  playersOnTile: Player[];
}

const TileCard: React.FC<TileCardProps> = ({ tile, isActive, playersOnTile }) => {
  const { players, activePlayerId, interactWithWall, pickupItemFromTile, playerIds, openInspection } = useGameStore();
  
  // 使用动态获取的地图块数据（根据主题）
  const tileDeck = getTilesForGame();
  const def = tile.defId === STARTING_TILE.id 
    ? STARTING_TILE 
    : tileDeck.find(t => t.id === tile.defId);

  if (!def) return null;

  // 安全获取 icon 组件，不存在的 icon 使用默认的 HelpCircle
  const IconComponent = def.icon && (Icons as any)[def.icon] ? (Icons as any)[def.icon] : Icons.HelpCircle;
  const hasActivePlayer = playersOnTile.some(p => p.id === activePlayerId);

  // 根据玩家状态判断可进行的墙壁动作
  const getWallAction = () => {
      const currentPlayer = players[activePlayerId];
      if (!currentPlayer || currentPlayer.isDead) return { type: 'NONE', icon: Ban, label: '无法行动', color: 'text-zinc-600' };

      const hasPickaxe = currentPlayer.items.some(i => i.id === 'item_pickaxe');
      const might = currentPlayer.character.attributes[AttributeName.Might].current;
      const knowledge = currentPlayer.character.attributes[AttributeName.Knowledge].current;
      const phasing = currentPlayer.buffs.includes('PHASING');

      // 优先级：穿墙 > 破坏 > 调查
      if (phasing) return { type: 'PHASE', icon: Ghost, label: '穿墙', color: 'text-cyan-400' };
      if (hasPickaxe || might > 5) return { type: 'BREAK', icon: Hammer, label: '破坏', color: 'text-red-500' };
      if (knowledge > 4) return { type: 'SEARCH', icon: Search, label: '调查', color: 'text-indigo-400' };

      return { type: 'NONE', icon: Ban, label: '封闭', color: 'text-zinc-600' };
  };

  const wallAction = getWallAction();

  const getEdgePosition = (dir: Direction) => {
    switch(dir) {
      case Direction.North: return 'top-0 left-1/2 -translate-x-1/2 w-full h-8 -mt-4';
      case Direction.South: return 'bottom-0 left-1/2 -translate-x-1/2 w-full h-8 -mb-4';
      case Direction.West: return 'left-0 top-1/2 -translate-y-1/2 h-full w-8 -ml-4';
      case Direction.East: return 'right-0 top-1/2 -translate-y-1/2 h-full w-8 -mr-4';
    }
  };

  const getVisualPosition = (dir: Direction) => {
      switch(dir) {
        case Direction.North: return 'top-[-2px] left-1/2 -translate-x-1/2 w-12 h-1';
        case Direction.South: return 'bottom-[-2px] left-1/2 -translate-x-1/2 w-12 h-1';
        case Direction.West: return 'left-[-2px] top-1/2 -translate-y-1/2 h-12 w-1';
        case Direction.East: return 'right-[-2px] top-1/2 -translate-y-1/2 h-12 w-1';
      }
  };

  const renderEdge = (dir: Direction) => {
    const edgeType = tile.edges[dir];
    const posClass = getEdgePosition(dir);
    const visualClass = getVisualPosition(dir);

    // 基础视觉呈现
    let Visual = null;
    if (edgeType === 'OPEN') {
        Visual = <div className={`absolute bg-zinc-900 ${visualClass} z-10`} />;
    } else if (edgeType === 'RUBBLE') {
        Visual = (
             <div className={`absolute ${visualClass} z-10 flex items-center justify-center`}>
                 <div className="w-full h-full bg-zinc-900 flex items-center justify-center gap-0.5">
                     <div className="w-1 h-1 bg-amber-700/50 rounded-full" />
                 </div>
             </div>
        );
    } else if (edgeType === 'SECRET_DOOR') {
        Visual = <div className={`absolute bg-indigo-950/80 ${visualClass} z-10 border border-indigo-500/30`} />;
    }

    // 墙壁交互图标逻辑
    let Interaction = null;
    if (hasActivePlayer && edgeType === 'WALL') {
        const ActionIcon = wallAction.icon;
        const canInteract = wallAction.type !== 'NONE';

        Interaction = (
            <div 
              className={`absolute ${posClass} z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer group`} 
              onClick={(e) => { 
                  e.stopPropagation(); 
                  if (canInteract) interactWithWall(dir); 
              }}
            >
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`bg-black/90 backdrop-blur-md p-2 rounded-full border shadow-2xl flex flex-col items-center gap-1 min-w-[40px] ${canInteract ? 'border-zinc-500' : 'border-zinc-800'}`}
                >
                    <ActionIcon size={16} className={wallAction.color} />
                    <span className={`text-[8px] font-bold uppercase tracking-tighter ${wallAction.color}`}>
                      {wallAction.label}
                    </span>
                </motion.div>
            </div>
        );
    }

    return <React.Fragment key={dir}>{Visual}{Interaction}</React.Fragment>;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }} 
      animate={{ 
        opacity: 1, 
        scale: hasActivePlayer ? 1.05 : 1,
        borderColor: hasActivePlayer ? 'rgba(99,102,241,0.8)' : 'rgba(39,39,42,1)',
        boxShadow: hasActivePlayer 
            ? "0 0 40px rgba(99,102,241,0.3)" 
            : "0 0 0 rgba(0,0,0,0)"
      }} 
      whileHover={{ 
        scale: hasActivePlayer ? 1.08 : 1.03,
        borderColor: hasActivePlayer ? 'rgba(99,102,241,1)' : 'rgba(161,161,170,0.5)', // zinc-400 equivalent
        boxShadow: hasActivePlayer 
            ? "0 0 50px rgba(99,102,241,0.5)" 
            : "0 0 25px rgba(255,255,255,0.05)"
      }}
      transition={{ duration: 0.3 }}
      className={`
        relative w-32 h-32 
        bg-gradient-to-br from-zinc-900 to-zinc-950 
        flex flex-col items-center justify-center text-center p-2 rounded-md 
        group/tile border-2
        
        ${/* Active Player Ring Structure */ ''}
        ${hasActivePlayer ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-black z-20' : 'z-0'}
        
        ${/* Selection Highlight */ ''}
        ${isActive ? 'z-10' : ''}
      `}
    >
      {/* 边缘渲染 */}
      {Object.values(Direction).map(dir => renderEdge(dir))}
      
      {/* 中心内容 */}
      <div className="text-zinc-500 mb-1 z-0 transition-transform group-hover/tile:scale-110">
        {IconComponent && <IconComponent size={24} />}
      </div>
      
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 leading-tight z-0">
        {def.name}
      </h3>
      
      {/* 掉落物品图标 */}
      {tile.droppedItems.length > 0 && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-20">
             <div 
                className={`p-1 bg-amber-900/40 border border-amber-600/50 rounded-full text-amber-500 cursor-pointer hover:bg-amber-800 transition-colors shadow-lg ${hasActivePlayer ? 'animate-bounce' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasActivePlayer) {
                        pickupItemFromTile(tile.droppedItems[0].id);
                    }
                }}
                title={hasActivePlayer ? `拾取: ${tile.droppedItems[0].name}` : "这里有掉落物"}
             >
                <Package size={12} />
             </div>
             {tile.droppedItems.length > 1 && (
                 <span className="text-[8px] bg-black/80 text-amber-500 font-bold px-1 rounded-full border border-amber-900/50">
                    +{tile.droppedItems.length - 1}
                 </span>
             )}
          </div>
      )}

      {/* 玩家标记 - 现在可点击查看 */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-30 pointer-events-none">
        <div className="flex flex-wrap items-center justify-center gap-1 pointer-events-auto">
            {playersOnTile.map(p => {
                const playerIndex = playerIds.indexOf(p.id);
                const pColor = playerIndex !== -1 ? PLAYER_COLORS[playerIndex] : '#ffffff';
                return (
                    <motion.div 
                        key={p.id}
                        layoutId={`player-${p.id}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            openInspection(p.id);
                        }}
                        className={`w-4 h-4 rounded-full border border-white/50 shadow-lg relative flex items-center justify-center overflow-hidden cursor-pointer hover:scale-125 transition-transform`}
                        style={{ backgroundColor: pColor }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        title={`查看 ${p.character.name}`}
                    >
                        {p.isDead && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Icons.Skull size={10} className="text-white opacity-80" />
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
      </div>
      
      {/* 事件指示器 */}
      {def.cardSymbol && !tile.hasEventTriggered && (
        <div className="absolute top-1 right-1 flex items-center justify-center z-10">
           <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)] ${
             def.cardSymbol === 'OMEN' ? 'bg-emerald-500' : 
             def.cardSymbol === 'ITEM' ? 'bg-indigo-500' : 'bg-yellow-600'
           }`} />
        </div>
      )}
    </motion.div>
  );
};

export default TileCard;

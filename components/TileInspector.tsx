
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { STARTING_TILE } from '../constants';
import { Direction, TileDef } from '../types';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TileInspector: React.FC = () => {
  const { hoveredTileId, map, players, activePlayerId, pendingTile, getTileById } = useGameStore();
  
  // 使用从后端API获取的地图块数据
  const activePlayer = players[activePlayerId];

  // Prioritize pendingTile (New room being placed), then hovered tile, then current player position
  let def: TileDef | undefined;
  let coordinateLabel = "";
  let isPending = false;
  let tileInstance = null;

  if (pendingTile) {
      def = pendingTile;
      coordinateLabel = "正在放置...";
      isPending = true;
  } else {
      const activeTileId = hoveredTileId 
        ? hoveredTileId 
        : (activePlayer ? `${activePlayer.position.x},${activePlayer.position.y}` : null);

      tileInstance = activeTileId ? map[activeTileId] : null;
      
      if (tileInstance) {
          def = tileInstance.defId === STARTING_TILE.id 
            ? STARTING_TILE 
            : getTileById(tileInstance.defId);
          coordinateLabel = `坐标: ${tileInstance.x}, ${tileInstance.y}`;
      }
  }

  if (!def) return null;
  // 安全获取 icon 组件，不存在的 icon 使用默认的 HelpCircle
  const IconComponent = def.icon && (Icons as any)[def.icon] ? (Icons as any)[def.icon] : Icons.HelpCircle;

  const renderEffect = (effect: any, idx: number) => {
    // 安全获取 icon 组件，不存在的 icon 使用默认的 Zap
    const EffectIcon = effect.icon && (Icons as any)[effect.icon] ? (Icons as any)[effect.icon] : Icons.Zap;
    let colorClass = 'text-zinc-400 border-zinc-700';
    if (effect.type === 'buff') colorClass = 'text-emerald-400 border-emerald-900/50 bg-emerald-900/10';
    if (effect.type === 'debuff') colorClass = 'text-red-400 border-red-900/50 bg-red-900/10';
    if (effect.type === 'trigger') colorClass = 'text-amber-400 border-amber-900/50 bg-amber-900/10';
    if (effect.type === 'item') colorClass = 'text-indigo-400 border-indigo-900/50 bg-indigo-900/10';

    return (
      <div key={idx} className={`flex items-start gap-3 p-3 rounded border ${colorClass} mb-2`}>
        <EffectIcon size={16} className="mt-0.5 shrink-0" />
        <span className="text-xs font-medium leading-snug opacity-90">{effect.text}</span>
      </div>
    );
  };

  return (
    <AnimatePresence mode='wait'>
      <motion.div 
        key={isPending ? 'pending' : tileInstance?.instanceId || 'none'} 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: 20 }} 
        transition={{ duration: 0.2 }} 
        className={`absolute top-6 right-80 mr-6 w-72 backdrop-blur-xl border shadow-2xl rounded-lg overflow-hidden z-30 ${isPending ? 'bg-indigo-900/80 border-indigo-500' : 'bg-zinc-900/80 border-zinc-700'}`}
      >
        <div className={`h-32 flex flex-col items-center justify-center relative p-4 border-b ${isPending ? 'bg-indigo-950/50 border-indigo-800' : 'bg-gradient-to-br from-zinc-800 to-zinc-950 border-zinc-800'}`}>
           <IconComponent size={48} className={`z-10 ${isPending ? 'text-indigo-400' : 'text-zinc-500'}`} />
           <div className={`absolute bottom-2 right-2 text-[10px] font-mono ${isPending ? 'text-indigo-300 animate-pulse' : 'text-zinc-600'}`}>{coordinateLabel}</div>
           {isPending && <div className="absolute top-2 left-2 text-[9px] uppercase font-bold text-indigo-400 border border-indigo-500/50 px-1.5 rounded bg-indigo-900/50">新发现</div>}
        </div>
        <div className="p-5">
            <h2 className="text-xl font-serif-display text-zinc-100 mb-2">{def.name}</h2>
            <p className="text-xs text-zinc-500 italic mb-4 font-serif-display border-b border-zinc-800 pb-4">"{def.description}"</p>
            
            {/* Edge Info - Only show for existing tiles as pending ones rotate */}
            {!isPending && tileInstance && (
                <div className="flex items-center justify-between mb-4 bg-zinc-950/50 p-3 rounded">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">出口方向</span>
                    <div className="flex gap-1">
                        {['N', 'S', 'E', 'W'].map(dir => {
                            const edge = tileInstance.edges[dir as Direction];
                            let bgClass = 'bg-zinc-900 text-zinc-700'; 
                            if (edge === 'OPEN') bgClass = 'bg-zinc-700 text-zinc-200';
                            if (edge === 'RUBBLE') bgClass = 'bg-amber-900/50 text-amber-500';
                            if (edge === 'SECRET_DOOR') bgClass = 'bg-indigo-900/50 text-indigo-500';
                            return <div key={dir} className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded ${bgClass}`}>{dir === 'N' ? '北' : dir === 'S' ? '南' : dir === 'E' ? '东' : '西'}</div>;
                        })}
                    </div>
                </div>
            )}

            <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">特殊属性</span>
                {def.effects && def.effects.length > 0 ? def.effects.map(renderEffect) : <div className="p-3 text-center border border-dashed border-zinc-800 rounded text-zinc-600 text-xs">无特殊属性。</div>}
            </div>
            
            {tileInstance && def.eventTrigger && (
                <div className={`mt-3 text-xs flex items-center gap-2 ${tileInstance.hasEventTriggered ? 'text-zinc-500' : 'text-amber-500'}`}>
                    <Icons.AlertTriangle size={14} />
                    {tileInstance.hasEventTriggered ? '事件已结算' : '事件待发'}
                </div>
            )}
             {isPending && def.eventTrigger && (
                <div className="mt-3 text-xs flex items-center gap-2 text-amber-500">
                    <Icons.AlertTriangle size={14} />
                    <span className="animate-pulse">放置后触发事件</span>
                </div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TileInspector;

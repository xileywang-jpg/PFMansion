
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { TILE_DECK, STARTING_TILE } from '../constants';
import { Direction, TileDef } from '../types';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TileInspector: React.FC = () => {
  const { hoveredTileId, map, players, activePlayerId } = useGameStore();
  const activePlayer = players[activePlayerId];

  const activeTileId = hoveredTileId 
    ? hoveredTileId 
    : (activePlayer ? `${activePlayer.position.x},${activePlayer.position.y}` : null);

  const tileInstance = activeTileId ? map[activeTileId] : null;
  if (!tileInstance) return null;

  const def: TileDef | undefined = tileInstance.defId === STARTING_TILE.id 
    ? STARTING_TILE 
    : TILE_DECK.find(t => t.id === tileInstance.defId);

  if (!def) return null;
  const IconComponent = def.icon ? (Icons as any)[def.icon] : Icons.HelpCircle;

  const renderEffect = (effect: any, idx: number) => {
    const EffectIcon = effect.icon ? (Icons as any)[effect.icon] : Icons.Zap;
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
      <motion.div key={tileInstance.instanceId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="absolute top-6 right-80 mr-6 w-72 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 shadow-2xl rounded-lg overflow-hidden z-30">
        <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center relative p-4 border-b border-zinc-800">
           <IconComponent size={48} className="text-zinc-500 z-10" />
           <div className="absolute bottom-2 right-2 text-[10px] text-zinc-600 font-mono">坐标: {tileInstance.x}, {tileInstance.y}</div>
        </div>
        <div className="p-5">
            <h2 className="text-xl font-serif-display text-zinc-100 mb-2">{def.name}</h2>
            <p className="text-xs text-zinc-500 italic mb-4 font-serif-display border-b border-zinc-800 pb-4">"{def.description}"</p>
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
            <div className="mt-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-2">特殊属性</span>
                {def.effects && def.effects.length > 0 ? def.effects.map(renderEffect) : <div className="p-3 text-center border border-dashed border-zinc-800 rounded text-zinc-600 text-xs">无特殊属性。</div>}
            </div>
            {def.eventTrigger && (
                <div className={`mt-3 text-xs flex items-center gap-2 ${tileInstance.hasEventTriggered ? 'text-zinc-500' : 'text-amber-500'}`}>
                    <Icons.AlertTriangle size={14} />
                    {tileInstance.hasEventTriggered ? '事件已结算' : '事件待发'}
                </div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TileInspector;


import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Footprints, ArrowRightCircle, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';

const TurnControl: React.FC = () => {
  const { 
    movesRemaining, 
    nextTurn, 
    turnPhase, 
    players, 
    activePlayerId,
    activeCard 
  } = useGameStore();
  
  const activePlayer = players[activePlayerId];
  if (!activePlayer) return null;

  const maxMoves = activePlayer.character.attributes.speed.current;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={activePlayerId}
        className="flex items-center gap-3 px-6 py-2 bg-zinc-900/90 border border-zinc-700 rounded-full shadow-2xl backdrop-blur-md"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-bold tracking-widest text-zinc-300">
          {activePlayer.character.name}
        </span>
        <span className="text-zinc-600">|</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${
          turnPhase === 'EVENT_RESOLVING' ? 'text-red-400' :
          turnPhase === 'DONE' ? 'text-zinc-500' : 
          'text-indigo-400'
        }`}>
          {turnPhase === 'EVENT_RESOLVING' ? '事件结算中' : 
           turnPhase === 'DONE' ? '回合已结束' : '行动阶段'}
        </span>
      </motion.div>

      <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-2 rounded-xl shadow-2xl">
        <div className="px-4 flex flex-col items-center justify-center min-w-[100px]">
          <div className="flex items-center gap-1 mb-1">
            <Footprints size={14} className="text-zinc-500" />
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">移动力</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: maxMoves }).map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-4 rounded-sm transition-all duration-300 ${
                  i < movesRemaining 
                    ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                    : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-10 bg-zinc-800 mx-2" />

        <button
          onClick={nextTurn}
          disabled={turnPhase === 'EVENT_RESOLVING' || !!activeCard}
          className={`
            group relative px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm flex items-center gap-2 transition-all
            ${turnPhase === 'EVENT_RESOLVING' || !!activeCard
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                : 'bg-zinc-100 hover:bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            }
          `}
        >
          {turnPhase === 'DONE' ? (
             <>
               <span>确认结束</span>
               <ArrowRightCircle size={18} className="group-hover:translate-x-1 transition-transform" />
             </>
          ) : (
             <>
               <span>结束回合</span>
               <Hourglass size={18} className="text-zinc-400 group-hover:text-black transition-colors" />
             </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TurnControl;

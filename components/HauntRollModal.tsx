
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types';
import { Dice6, Skull } from 'lucide-react';
import { motion } from 'framer-motion';

const HauntRollModal: React.FC = () => {
  const { phase, omenCount, performHauntRoll, lastRollResult, activeRoll } = useGameStore();

  if (phase !== GamePhase.HauntRoll) return null;

  const handleRoll = () => {
    performHauntRoll();
  };

  const isRolling = !!activeRoll && activeRoll.attributeName === 'Haunt Roll';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
       <motion.div 
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="w-full max-w-lg bg-zinc-900 border-2 border-zinc-800 rounded-lg p-8 shadow-2xl flex flex-col items-center text-center"
       >
          <Skull size={48} className="text-zinc-600 mb-4 animate-pulse" />
          
          <h2 className="text-3xl font-serif-display text-zinc-100 mb-2">The Haunt Roll</h2>
          <p className="text-zinc-500 mb-8 italic">
            With each omen, the mansion's grip tightens. Will you survive the night?
          </p>

          <div className="flex justify-center gap-12 mb-8 w-full">
             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-zinc-600 font-bold mb-2">Omens Revealed</span>
                <span className="text-4xl font-bold text-indigo-500">{omenCount}</span>
             </div>

             <div className="w-px bg-zinc-800 h-full" />

             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-zinc-600 font-bold mb-2">You Rolled</span>
                {isRolling ? (
                    <span className="text-4xl font-bold text-zinc-400 font-serif-display animate-pulse">...</span>
                ) : lastRollResult !== null ? (
                    <span className={`text-4xl font-bold font-serif-display ${lastRollResult < omenCount ? 'text-red-500' : 'text-emerald-500'}`}>
                        {lastRollResult}
                    </span>
                ) : (
                    <span className="text-4xl font-bold text-zinc-800 font-serif-display">?</span>
                )}
             </div>
          </div>

          <div className="bg-zinc-950/50 p-4 rounded border border-zinc-800 mb-8 w-full text-left">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Rules</h3>
              <p className="text-sm text-zinc-400">
                  Roll 6 dice (0-2 each). <br/>
                  If the total is <span className="text-white font-bold">less than {omenCount}</span>, the Haunt begins.
              </p>
          </div>

          {!lastRollResult && (
              <button
                onClick={handleRoll}
                disabled={isRolling}
                className={`
                    w-full py-4 rounded font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all
                    ${isRolling 
                        ? 'bg-zinc-800 text-zinc-500 cursor-wait' 
                        : 'bg-zinc-100 hover:bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                `}
              >
                {isRolling ? 'Rolling...' : <><Dice6 size={18} /> Roll for your life</>}
              </button>
          )}
       </motion.div>
    </div>
  );
};

export default HauntRollModal;


import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { rollDice, DIE_FACES } from '../utils/dice';
import { Dices } from 'lucide-react';

const DiceRoller: React.FC = () => {
  const { activeRoll } = useGameStore();
  const [currentValues, setCurrentValues] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    if (activeRoll) {
      // Initialize with random faces
      setCurrentValues(Array(activeRoll.numberOfDice).fill(0).map(() => DIE_FACES[Math.floor(Math.random() * 6)]));
      setShowResult(false);
      setFinalTotal(0);
    }
  }, [activeRoll]);

  if (!activeRoll) return null;

  const handleRoll = () => {
    setIsRolling(true);
    
    // Animation Loop
    const interval = setInterval(() => {
       setCurrentValues(prev => prev.map(() => DIE_FACES[Math.floor(Math.random() * 6)]));
    }, 80);

    // Stop and Show Result
    setTimeout(() => {
      clearInterval(interval);
      const { total, results } = rollDice(activeRoll.numberOfDice);
      setCurrentValues(results);
      setFinalTotal(total);
      setIsRolling(false);
      setShowResult(true);
    }, 1500);
  };

  const handleComplete = () => {
    activeRoll.onComplete(finalTotal);
  };

  // Render a single die face
  const renderDie = (value: number, index: number) => {
    // Style variations based on value
    const isZero = value === 0;
    const isOne = value === 1;
    const isTwo = value === 2;

    return (
      <motion.div
        key={index}
        layout
        initial={{ scale: 0.8, rotate: Math.random() * 360 }}
        animate={{ 
            scale: 1, 
            rotate: isRolling ? Math.random() * 360 : 0,
            y: isRolling ? [0, -10, 0] : 0,
            backgroundColor: isTwo ? '#064e3b' : isOne ? '#18181b' : '#09090b', // emerald-900 vs zinc-900 vs zinc-950
            borderColor: isTwo ? '#10b981' : isOne ? '#52525b' : '#27272a', // emerald-500 vs zinc-600 vs zinc-800
        }}
        transition={{ duration: 0.2 }}
        className="w-16 h-16 border-2 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden"
      >
        {/* Value 0: Explicit 0 or distinct Empty symbol */}
        {value === 0 && (
           <div className="text-zinc-700 font-serif-display text-2xl font-bold opacity-50 select-none">0</div>
        )}
        
        {/* Value 1: Single Pip */}
        {value === 1 && (
             <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        )}
        
        {/* Value 2: Two Pips + Glow */}
        {value === 2 && (
            <>
                <div className="absolute top-3 left-3 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,1)]" />
                <div className="absolute bottom-3 right-3 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,1)]" />
            </>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full flex flex-col items-center shadow-2xl relative"
      >
        {/* Header */}
        <h2 className="text-2xl font-serif-display text-zinc-100 mb-2 uppercase tracking-widest">
            {activeRoll.attributeName} Check
        </h2>
        <p className="text-zinc-500 mb-8 text-sm">
            Rolling {activeRoll.numberOfDice} dice {activeRoll.targetValue ? `vs Target ${activeRoll.targetValue}` : ''}
        </p>

        {/* Dice Grid */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
            {currentValues.map((val, idx) => renderDie(val, idx))}
        </div>

        {/* Result & Controls */}
        <AnimatePresence mode='wait'>
            {showResult ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center w-full"
                >
                    <div className="text-6xl font-serif-display font-bold text-white mb-2">{finalTotal}</div>
                    
                    {activeRoll.targetValue !== undefined && (
                        <div className={`
                            text-sm font-bold uppercase tracking-widest mb-6 px-4 py-1 rounded
                            ${finalTotal >= activeRoll.targetValue ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-red-900/50 text-red-400 border border-red-800'}
                        `}>
                            {finalTotal >= activeRoll.targetValue ? 'Success' : 'Failed'}
                        </div>
                    )}

                    <button
                        onClick={handleComplete}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded uppercase tracking-wider text-sm transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        Continue
                    </button>
                </motion.div>
            ) : (
                <button
                    onClick={handleRoll}
                    disabled={isRolling}
                    className={`
                        w-full py-4 rounded font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all
                        ${isRolling 
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                            : 'bg-zinc-100 hover:bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'}
                    `}
                >
                    {isRolling ? 'Rolling...' : <><Dices size={20} /> ROLL DICE</>}
                </button>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DiceRoller;

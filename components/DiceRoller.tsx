
import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { rollDice, DIE_FACES } from '../utils/dice';
import { Dices, X } from 'lucide-react';

const DiceRoller: React.FC = () => {
  const { activeRoll, cancelActiveRoll } = useGameStore();
  const [currentValues, setCurrentValues] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    if (activeRoll) {
      setCurrentValues(Array(activeRoll.numberOfDice).fill(0).map(() => DIE_FACES[Math.floor(Math.random() * 6)]));
      setShowResult(false);
      setFinalTotal(0);
    }
  }, [activeRoll]);

  if (!activeRoll) return null;

  const handleRoll = () => {
    setIsRolling(true);
    const interval = setInterval(() => {
       setCurrentValues(prev => prev.map(() => DIE_FACES[Math.floor(Math.random() * 6)]));
    }, 80);
    setTimeout(() => {
      clearInterval(interval);
      const { total, results } = rollDice(activeRoll.numberOfDice);
      setCurrentValues(results);
      setFinalTotal(total);
      setIsRolling(false);
      setShowResult(true);
    }, 1500);
  };

  const renderDie = (value: number, index: number) => {
    const isTwo = value === 2;
    const isOne = value === 1;
    return (
      <motion.div key={index} layout initial={{ scale: 0.8 }} animate={{ scale: 1, rotate: isRolling ? Math.random() * 360 : 0, backgroundColor: isTwo ? '#064e3b' : isOne ? '#18181b' : '#09090b', borderColor: isTwo ? '#10b981' : isOne ? '#52525b' : '#27272a' }} className="w-16 h-16 border-2 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden">
        {value === 0 && <div className="text-zinc-700 font-serif-display text-2xl font-bold opacity-50">0</div>}
        {value === 1 && <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />}
        {value === 2 && <><div className="absolute top-3 left-3 w-3 h-3 bg-emerald-400 rounded-full" /><div className="absolute bottom-3 right-3 w-3 h-3 bg-emerald-400 rounded-full" /></>}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full flex flex-col items-center shadow-2xl relative">
        <h2 className="text-2xl font-serif-display text-zinc-100 mb-2 uppercase tracking-widest">{activeRoll.attributeName} 检定</h2>
        <p className="text-zinc-500 mb-8 text-sm">正在投掷 {activeRoll.numberOfDice} 枚骰子 {activeRoll.targetValue ? `(目标值为 ${activeRoll.targetValue})` : ''}</p>
        <div className="flex flex-wrap justify-center gap-4 mb-10">{currentValues.map((val, idx) => renderDie(val, idx))}</div>
        <AnimatePresence mode='wait'>
            {showResult ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
                    <div className="text-6xl font-serif-display font-bold text-white mb-2">{finalTotal}</div>
                    {activeRoll.targetValue !== undefined && (
                        <div className={`text-sm font-bold uppercase tracking-widest mb-6 px-4 py-1 rounded ${finalTotal >= activeRoll.targetValue ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                            {finalTotal >= activeRoll.targetValue ? '成功' : '失败'}
                        </div>
                    )}
                    <button onClick={() => activeRoll.onComplete(finalTotal)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded uppercase tracking-wider text-sm transition-colors shadow-lg">继续</button>
                </motion.div>
            ) : (
                <div className="w-full flex flex-col gap-3">
                    <button onClick={handleRoll} disabled={isRolling} className="w-full py-4 rounded font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all bg-zinc-100 hover:bg-white text-black">
                        {isRolling ? '投掷中...' : <><Dices size={20} /> 开始投掷</>}
                    </button>
                    {activeRoll.isCancellable && (
                        <button onClick={cancelActiveRoll} disabled={isRolling} className="w-full py-3 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors">
                            <X size={16} /> 放弃检定
                        </button>
                    )}
                </div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DiceRoller;


import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types';
import { Dice6, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentPlayerId } from '../ws/network';

const HauntRollModal: React.FC = () => {
  const { phase, omenCount, performHauntRoll, lastRollResult, activeRoll, activePlayerId } = useGameStore();
  const isCurrentPlayer = getCurrentPlayerId() === activePlayerId;

  // 只有在作祟检定阶段且没有 activeRoll 时显示
  // 如果有 activeRoll，说明 DiceRoller 正在处理，交给 DiceRoller 显示
  if (phase !== GamePhase.HauntRoll) return null;
  if (activeRoll !== null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
       <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg bg-zinc-900 border-2 border-zinc-800 rounded-lg p-8 shadow-2xl flex flex-col items-center text-center">
          <Skull size={48} className="text-zinc-600 mb-4 animate-pulse" />
          <h2 className="text-3xl font-serif-display text-zinc-100 mb-2">作祟检定</h2>
          <p className="text-zinc-500 mb-8 italic">随着预兆不断显现，大厦的阴影也愈发浓烈。你能逃出生天吗？</p>
          <div className="flex justify-center gap-12 mb-8 w-full">
             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-zinc-600 font-bold mb-2">当前预兆数</span>
                <span className="text-4xl font-bold text-indigo-500">{omenCount}</span>
             </div>
             <div className="w-px bg-zinc-800 h-full" />
             <div className="flex flex-col items-center">
                <span className="text-xs uppercase tracking-widest text-zinc-600 font-bold mb-2">你的投掷结果</span>
                {lastRollResult !== null ? (
                    <span className={`text-4xl font-bold ${lastRollResult < omenCount ? 'text-red-500' : 'text-emerald-500'}`}>{lastRollResult}</span>
                ) : <span className="text-4xl font-bold text-zinc-800">?</span>}
             </div>
          </div>
          <div className="bg-zinc-950/50 p-4 rounded border border-zinc-800 mb-8 w-full text-left">
              <h3 className="text-xs font-bold text-zinc-500 mb-2">规则说明</h3>
              <p className="text-sm text-zinc-400">投掷 6 颗骰子。如果结果 <span className="text-white font-bold">小于 {omenCount}</span>，则作祟正式爆发。</p>
          </div>

          {/* 只有没有投掷结果时才显示按钮 */}
            {lastRollResult === null && isCurrentPlayer && (
              <button onClick={performHauntRoll} className="w-full py-4 rounded font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all bg-zinc-100 hover:bg-white text-black">
                <Dice6 size={18} /> 挑战命运
              </button>
          )}

            {lastRollResult === null && !isCurrentPlayer && (
              <div className="w-full py-4 rounded border border-zinc-800 bg-zinc-950/60 text-zinc-500 text-sm text-center uppercase tracking-widest">
                等待当前玩家进行作祟检定...
              </div>
            )}

          {/* 如果有了结果但相位没切换（容错显示），增加一个关闭按钮 */}
          {lastRollResult !== null && (
              <div className="text-zinc-500 text-xs animate-pulse">
                  正在处理检定结果...
              </div>
          )}
       </motion.div>
    </div>
  );
};

export default HauntRollModal;

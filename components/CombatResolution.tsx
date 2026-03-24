
import React from 'react';
import { useGameStore } from '../store/gameStore';
import * as network from '../ws/network';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, X, User } from 'lucide-react';
import { PLAYER_COLORS } from '../constants';

const CombatResolution: React.FC = () => {
  const { activeCombat, players, playerIds, showFeedback } = useGameStore();

  if (!activeCombat || activeCombat.phase !== 'RESOLUTION') return null;

  const attacker = players[activeCombat.attackerId];
  const defender = players[activeCombat.defenderId];
  const attackerRoll = activeCombat.attackerRoll || 0;
  const defenderRoll = activeCombat.defenderRoll || 0;
  
  const damage = Math.max(0, attackerRoll - defenderRoll);

  const attackerColor = PLAYER_COLORS[playerIds.indexOf(attacker.id)];
  const defenderColor = PLAYER_COLORS[playerIds.indexOf(defender.id)];

  const handleResolveCombat = () => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接，无法结算战斗", "error");
        return;
    }
    network.sendResolveCombat();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} 
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-2xl bg-zinc-950 border-2 border-red-900/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 bg-red-950/20 border-b border-red-900/20 flex items-center justify-between">
            <h2 className="text-2xl font-serif-display text-red-500 flex items-center gap-3 tracking-tighter">
              <Swords size={24} />
              战斗结算
            </h2>
            <div className="p-2 text-zinc-600">
              <X size={20} />
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between gap-8 mb-12 relative">
              {/* Versus Line */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent z-0" />
              
              {/* Attacker */}
              <div className="flex flex-col items-center gap-4 z-10 w-1/3">
                <div 
                  className="w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-xl"
                  style={{ borderColor: attackerColor, backgroundColor: `${attackerColor}20` }}
                >
                  <User size={40} style={{ color: attackerColor }} />
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">进攻者</div>
                  <div className="text-lg font-serif-display text-white">{attacker.character.name}</div>
                </div>
                <div className="text-5xl font-bold font-serif-display text-white">{attackerRoll}</div>
              </div>

              {/* VS Divider */}
              <div className="bg-zinc-900 border border-zinc-700 w-12 h-12 rounded-full flex items-center justify-center z-10">
                <span className="text-xs font-bold text-zinc-500 italic">VS</span>
              </div>

              {/* Defender */}
              <div className="flex flex-col items-center gap-4 z-10 w-1/3">
                <div 
                  className="w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-xl"
                  style={{ borderColor: defenderColor, backgroundColor: `${defenderColor}20` }}
                >
                  <User size={40} style={{ color: defenderColor }} />
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">防御者</div>
                  <div className="text-lg font-serif-display text-white">{defender.character.name}</div>
                </div>
                <div className="text-5xl font-bold font-serif-display text-white">{defenderRoll}</div>
              </div>
            </div>

            {/* Outcome */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center mb-8">
              {damage > 0 ? (
                <>
                  <div className="text-sm uppercase tracking-[0.2em] text-red-400 font-bold mb-2">压制成功</div>
                  <div className="text-4xl font-serif-display text-white mb-4">点数领先: {damage}</div>
                  <div className="text-xs text-zinc-500 max-w-xs mx-auto italic">
                    你的力量盖过了对手。你可以对他造成物理伤害。
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">平局或失败</div>
                  <div className="text-4xl font-serif-display text-zinc-300 mb-4">进攻失败</div>
                  <div className="text-xs text-zinc-600 max-w-xs mx-auto italic">
                    你的攻势被巧妙地化解了。这次战斗没有造成实质性的影响。
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <button 
              onClick={handleResolveCombat}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-900/20"
            >
              <Heart size={18} /> 结算战斗
            </button>
          </div>

          <div className="p-4 bg-zinc-950/80 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-mono">
             结算结果将立即应用并结束当前回合。
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CombatResolution;

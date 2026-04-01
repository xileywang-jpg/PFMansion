import React from 'react';
import { useGameStore } from '../store/gameStore';
import * as network from '../ws/network';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Heart, X, User, AlertTriangle } from 'lucide-react';
import { PLAYER_COLORS } from '../constants';

const CombatResolution: React.FC = () => {
  const { interactionState, players, playerIds, activePlayerId, showFeedback, dismissCombatResult } = useGameStore();
  const localPlayerId = network.getCurrentPlayerId();

  const combatInteraction = interactionState?.type === 'COMBAT' ? interactionState : null;

  if (!combatInteraction) return null;

  const attackerId = combatInteraction.attackerId;
  const defenderId = combatInteraction.defenderId;
  if (!attackerId || !defenderId) return null;

  const attacker = players[attackerId];
  const defender = players[defenderId];
  if (!attacker || !defender) return null;

  const interactionPhase = combatInteraction.combatPhase;
  const isResolutionView = interactionPhase === 'RESULT';
  const attackerRolls = combatInteraction.attackerRolls || [];
  const defenderRolls = combatInteraction.defenderRolls || [];
  const attackerSum = combatInteraction.attackerSum ?? attackerRolls.reduce((sum, value) => sum + value, 0);
  const defenderSum = combatInteraction.defenderSum ?? defenderRolls.reduce((sum, value) => sum + value, 0);
  const damage = combatInteraction.damage ?? 0;
  const isDraw = combatInteraction.draw ?? false;
  const loser = combatInteraction.loser;
  const winner = loser && !isDraw
    ? (loser === attacker.id ? defender.id : attacker.id)
    : null;
  const canResolveCombat = !isResolutionView && localPlayerId === attackerId;
  const canDismissResult = isResolutionView && (localPlayerId === attackerId || localPlayerId === activePlayerId);

  const attackerColor = PLAYER_COLORS[playerIds.indexOf(attacker.id) % PLAYER_COLORS.length];
  const defenderColor = PLAYER_COLORS[playerIds.indexOf(defender.id) % PLAYER_COLORS.length];

  const handleResolveCombat = () => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接，无法结算战斗", "error");
        return;
    }
    network.sendResolveCombat();
  };

  const handleCloseResult = () => {
    dismissCombatResult();
  };

  const renderRolls = (rolls: number[]) => {
    if (rolls.length === 0) {
      return <div className="text-xs text-zinc-600 uppercase tracking-[0.2em]">等待服务器掷骰</div>;
    }

    return <div className="text-xs text-zinc-500">{rolls.join(' + ')}</div>;
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
            <h2 className="text-2xl font-serif-display text-red-500 flex items-center gap-3 tracking-tight">
              <Swords size={24} />
              战斗结算
            </h2>
            <div className="p-2 text-zinc-600">
              <X size={20} />
            </div>
          </div>

          <div className="p-8">
            {/* 骰子对比 */}
            <div className="flex items-center justify-between gap-8 mb-12 relative">
              {/* 分隔线 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent z-0" />
              
              {/* 攻击方（骰子点数高者显示在上面） */}
              <div className="flex flex-col items-center gap-4 z-10 w-1/3">
                <div 
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-xl ${loser === attacker.id ? 'border-red-500 animate-pulse' : 'border-green-500'}`}
                  style={{ backgroundColor: `${attackerColor}20` }}
                >
                  <User size={40} style={{ color: attackerColor }} />
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">{winner === attacker.id ? '胜者' : '攻击者'}</div>
                  <div className="text-lg font-serif-display text-white">{attacker.character.name}</div>
                  {renderRolls(attackerRolls)}
                </div>
                <div className={`text-5xl font-bold font-serif-display ${winner === attacker.id ? 'text-green-400' : 'text-white'}`}>
                  {attackerSum}
                </div>
              </div>

              {/* VS */}
              <div className="bg-zinc-900 border border-zinc-700 w-12 h-12 rounded-full flex items-center justify-center z-10">
                <span className="text-xs font-bold text-zinc-500 italic">VS</span>
              </div>

              {/* 防御方（骰子点数低者显示在上面） */}
              <div className="flex flex-col items-center gap-4 z-10 w-1/3">
                <div 
                  className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-xl ${loser === defender.id ? 'border-red-500 animate-pulse' : 'border-green-500'}`}
                  style={{ backgroundColor: `${defenderColor}20` }}
                >
                  <User size={40} style={{ color: defenderColor }} />
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase font-bold text-zinc-500 tracking-widest mb-1">{winner === defender.id ? '胜者' : '防御者'}</div>
                  <div className="text-lg font-serif-display text-white">{defender.character.name}</div>
                  {renderRolls(defenderRolls)}
                </div>
                <div className={`text-5xl font-bold font-serif-display ${winner === defender.id ? 'text-green-400' : 'text-white'}`}>
                  {defenderSum}
                </div>
              </div>
            </div>

            {/* 战斗结果 */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center mb-8">
              {!isResolutionView ? (
                <>
                  <div className="text-sm uppercase tracking-[0.2em] text-indigo-400 font-bold mb-2">等待结算</div>
                  <div className="text-4xl font-serif-display text-white mb-4">服务器将进行权威战斗检定</div>
                  <div className="text-xs text-zinc-500 max-w-xs mx-auto italic">
                    {combatInteraction.message || `当前交互已进入战斗阶段，等待 ${attacker.character.name} 发起服务器结算。`}
                  </div>
                </>
              ) : isDraw ? (
                <>
                  <div className="text-sm uppercase tracking-[0.2em] text-yellow-400 font-bold mb-2">平局</div>
                  <div className="text-4xl font-serif-display text-yellow-400 mb-4">势均力敌</div>
                  <div className="text-xs text-zinc-500 max-w-xs mx-auto italic">
                    双方骰出相同点数，这次交锋不分胜负。
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] text-red-400 font-bold mb-2">
                    <AlertTriangle size={16} />
                    {damage} 点伤害
                  </div>
                  <div className="text-2xl font-serif-display text-white mb-2">
                    {loser === attacker.id ? attacker.character.name : defender.character.name} 受伤
                  </div>
                  <div className="text-xs text-zinc-500 max-w-xs mx-auto">
                    服务器已完成结算。{loser === attacker.id ? attacker.character.name : defender.character.name} 骰出较低总和 {Math.min(attackerSum, defenderSum)}，受到 {damage} 点伤害。
                  </div>
                </>
              )}
            </div>

            {/* 结算按钮 */}
            {isResolutionView ? (
              <button 
                onClick={handleCloseResult}
                disabled={!canDismissResult}
                className="w-full bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-lg"
              >
                <X size={18} /> {canDismissResult ? '关闭结果' : '等待攻击方确认'}
              </button>
            ) : (
              <button 
                onClick={handleResolveCombat}
                disabled={!canResolveCombat}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-900/20"
              >
                <Heart size={18} /> {canResolveCombat ? '请求服务器结算' : '等待攻击方结算'}
              </button>
            )}
          </div>

          <div className="p-4 bg-zinc-950/80 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-mono">
             {isResolutionView ? '战斗结果已进入显式交互状态，等待权威关闭。' : '正式战斗结果以后端权威同步状态为准。'}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CombatResolution;

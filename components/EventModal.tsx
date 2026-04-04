
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useEventSystem } from '../hooks/useEventSystem';
import { Dice5, MousePointerClick } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttributeName, Interaction } from '../types';

function isAttributeCheckInteraction(
    interaction: Interaction | undefined,
): interaction is Interaction & { type: 'ATTRIBUTE_CHECK'; attribute: AttributeName } {
    return interaction?.type === 'ATTRIBUTE_CHECK' && interaction.attribute !== undefined;
}

function isChoiceInteraction(
    interaction: Interaction | undefined,
): interaction is Interaction & { type: 'CHOICE' } {
    return interaction?.type === 'CHOICE';
}

const CardResolutionModal: React.FC = () => {
    const { activeCard, players, activePlayerId, lastRollResult, lastCheckSuccess, activeRoll, resolveEventChoice } = useGameStore();
    const { initiateEventRoll } = useEventSystem();
  const [choiceMade, setChoiceMade] = useState(false);
  const player = players[activePlayerId];
  
  if (!activeCard) return null;

    const cardTitle = activeCard.title || '未知卡牌';
    const interaction = activeCard.interaction;
    const attributeCheckInteraction = isAttributeCheckInteraction(interaction)
        ? interaction
        : null;
    const choiceInteraction = isChoiceInteraction(interaction)
        ? interaction
        : null;
    const isAttributeCheck = attributeCheckInteraction !== null;
    const isChoice = choiceInteraction !== null;

    const currentStatValue = attributeCheckInteraction && player
        ? player.character.attributes[attributeCheckInteraction.attribute].current
        : 0;

    const threshold = attributeCheckInteraction?.difficulty ?? 0;
    const attributeNameMap: Record<AttributeName, string> = {
        might: '力量',
        speed: '速度',
        sanity: '理智',
        knowledge: '知识',
    };
    const attributeLabel = attributeCheckInteraction
        ? attributeNameMap[attributeCheckInteraction.attribute]
        : '';

  return (
    <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-md bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b flex items-center gap-3 relative bg-zinc-950">
                    <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">事件</div>
                        <h2 className="text-2xl font-serif-display text-white tracking-wide">{cardTitle}</h2>
                    </div>
                </div>
                <div className="p-8 flex-1">
                    <p className="font-serif-display text-lg text-zinc-300 italic mb-8 leading-relaxed">"{activeCard.description}"</p>
                    
                    {isAttributeCheck && (
                        <div className="bg-zinc-800/30 p-4 rounded border border-zinc-700/50 mb-6">
                            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex justify-between">
                                <span>需要检定</span>
                                <span className="text-indigo-400 font-bold">{attributeLabel} ({currentStatValue} 颗骰子)</span>
                            </div>
                            <div className="text-center py-4 bg-zinc-900/50 rounded border border-zinc-800">
                                {activeRoll ? <div className="text-xs uppercase font-bold tracking-widest text-zinc-500 animate-pulse">投掷中...</div> : lastRollResult !== null ? (
                                    <>
                                        <div className="text-5xl font-serif-display font-bold text-white mb-2">{lastRollResult}</div>
                                        <div className={`text-xs uppercase font-bold ${lastCheckSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {lastCheckSuccess ? '成功' : '失败'}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 mt-1">目标值: {threshold}+</div>
                                    </>
                                ) : <div className="text-xs text-zinc-600">等待投掷... (目标: {threshold}+)</div>}
                            </div>
                        </div>
                    )}

                    {isChoice && (
                        <div className="space-y-3">
                            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                                <MousePointerClick size={12} /> 做出选择
                            </div>
                            {(choiceInteraction.options ?? []).map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        if (choiceMade) return;
                                        setChoiceMade(true);
                                        resolveEventChoice(option.effects, idx);
                                    }}
                                    disabled={choiceMade}
                                    className={`w-full text-left p-4 bg-zinc-800 border border-zinc-700 rounded-lg transition-all group ${choiceMade ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-700 hover:border-indigo-500'}`}
                                >
                                    <div className="text-sm font-bold text-zinc-200 group-hover:text-white mb-1">{option.label}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50 flex justify-end">
                    {isAttributeCheck && lastRollResult === null ? (
                        <button onClick={() => { if (choiceMade) return; setChoiceMade(true); initiateEventRoll(activeCard); }} disabled={!!activeRoll || choiceMade} className={`w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 ${choiceMade ? 'opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400' : 'bg-zinc-100 hover:bg-white text-black'}`}>
                            <Dice5 size={16} /> 进行 {attributeLabel} 检定
                        </button>
                    ) : isChoice ? (
                        // Choice handling is inside the options buttons above
                        null
                    ) : (
                        <div className="w-full px-6 py-4 rounded text-center font-bold uppercase tracking-wider text-xs bg-zinc-800 text-zinc-400">
                            等待服务器结算...
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default CardResolutionModal;

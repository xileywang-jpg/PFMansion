
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useEventSystem } from '../hooks/useEventSystem';
import { Dice5, Skull, Gem, CheckCircle, XCircle, MousePointerClick } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Item } from '../types';
import * as network from '../ws/network';

const CardResolutionModal: React.FC = () => {
  const { activeCard, players, activePlayerId, lastRollResult, lastCheckSuccess, activeRoll, eventOutcome, acknowledgeEventOutcome, resolveEventChoice } = useGameStore();
  const { initiateEventRoll, resolveItemPickup } = useEventSystem();
  const [choiceMade, setChoiceMade] = useState(false);
  const player = players[activePlayerId];
  
  // Bug Fix: 当显示 outcome 时重置 choiceMade，这样"继续探索"按钮可以点击
  useEffect(() => {
    if (eventOutcome) {
      setChoiceMade(false);
    }
  }, [eventOutcome]);
  
  if (!activeCard) return null;

  const isItem = 'usage' in activeCard || ['ITEM', 'OMEN', 'WEAPON', 'PASSIVE', 'CONSUMABLE'].includes(activeCard.type);
  const cardTitle = 'name' in activeCard ? activeCard.name : activeCard.title || '未知卡牌';
  const cardType = activeCard.type;
  const isEvent = activeCard.type === 'EVENT';
  const interaction = isEvent ? activeCard.interaction : null;
  const isAttributeCheck = interaction?.type === 'ATTRIBUTE_CHECK';
  const isChoice = interaction?.type === 'CHOICE';

  const currentStatValue = isAttributeCheck && interaction && player 
    ? player.character.attributes[interaction.attribute].current 
    : 0;
  
  const threshold = isAttributeCheck && interaction ? interaction.difficulty : 0;
  const attributeNameMap: any = { might: '力量', speed: '速度', sanity: '理智', knowledge: '知识' };
  const attributeLabel = isAttributeCheck && interaction ? attributeNameMap[interaction.attribute] : '';

  const getCardTypeLabel = (type: string) => {
      switch(type) {
          case 'OMEN': return '预兆';
          case 'ITEM': return '物品';
          case 'EVENT': return '事件';
          default: return type;
      }
  };

  // If we have an outcome, show the resolution screen
  if (eventOutcome) {
      const isSuccess = eventOutcome.type === 'success';
      return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <motion.div initial={{ y: 20, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className={`w-full max-w-md bg-zinc-900 border shadow-2xl rounded-lg overflow-hidden flex flex-col ${isSuccess ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
                    <div className={`p-6 border-b flex items-center gap-3 ${isSuccess ? 'bg-emerald-950/30 border-emerald-900/30' : 'bg-red-950/30 border-red-900/30'}`}>
                        {isSuccess ? <CheckCircle className="text-emerald-400" size={28} /> : <XCircle className="text-red-400" size={28} />}
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">事件结算</div>
                            <h2 className={`text-2xl font-serif-display tracking-wide ${isSuccess ? 'text-emerald-100' : 'text-red-100'}`}>{eventOutcome.title}</h2>
                        </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col items-center">
                        <div className="flex items-center gap-8 mb-8 w-full justify-center">
                             <div className="flex flex-col items-center">
                                 <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1">你的点数</span>
                                 <span className={`text-4xl font-bold font-serif-display ${isSuccess ? 'text-white' : 'text-red-400'}`}>{eventOutcome.roll}</span>
                             </div>
                             <div className="text-zinc-700 text-2xl font-thin">/</div>
                             <div className="flex flex-col items-center">
                                 <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1">目标值</span>
                                 <span className="text-4xl font-bold font-serif-display text-zinc-400">{eventOutcome.target}</span>
                             </div>
                        </div>
                        
                        <div className="bg-zinc-950/50 p-6 rounded-lg border border-zinc-800 w-full text-center">
                            <p className="text-lg text-zinc-300 italic leading-relaxed">"{eventOutcome.description}"</p>
                        </div>
                    </div>
                    <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50">
                        {isAttributeCheck ? (
                            // 对于属性检定，点击后应用效果并关闭
                            <button 
                                onClick={() => {
                                    // lastCheckSuccess: true = 成功(choiceIndex=0), false = 失败(choiceIndex=1)
                                    const choiceIndex = lastCheckSuccess ? 0 : 1;
                                    network.sendResolveEvent(choiceIndex);
                                    acknowledgeEventOutcome();
                                }} 
                                className={`w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs transition-colors ${
                                    isSuccess 
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                        : 'bg-red-600 hover:bg-red-500 text-white'
                                }`}
                            >
                                {isSuccess ? '接受成功效果' : '接受失败后果'}
                            </button>
                        ) : (
                            <button onClick={acknowledgeEventOutcome} className="w-full bg-zinc-100 hover:bg-white text-black px-6 py-4 rounded font-bold uppercase tracking-wider text-xs transition-colors">
                                继续探索
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
      );
  }

  return (
    <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} className={`w-full max-w-md bg-zinc-900 border shadow-2xl rounded-lg overflow-hidden flex flex-col ${cardType === 'OMEN' ? 'border-emerald-900/50' : isItem ? 'border-indigo-900/50' : 'border-zinc-700'}`}>
                <div className={`p-6 border-b flex items-center gap-3 relative ${cardType === 'OMEN' ? 'bg-emerald-950/30' : isItem ? 'bg-indigo-950/30' : 'bg-zinc-950'}`}>
                    {cardType === 'OMEN' && <Skull className="text-emerald-400" />}
                    {isItem && cardType !== 'OMEN' && <Gem className="text-indigo-400" />}
                    <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">{getCardTypeLabel(cardType)}</div>
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
                            {interaction.options.map((option, idx) => (
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
                        <button onClick={() => { if (choiceMade) return; setChoiceMade(true); initiateEventRoll(activeCard as any); }} disabled={!!activeRoll || choiceMade} className={`w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 ${choiceMade ? 'opacity-50 cursor-not-allowed bg-zinc-700 text-zinc-400' : 'bg-zinc-100 hover:bg-white text-black'}`}>
                            <Dice5 size={16} /> 进行 {attributeLabel} 检定
                        </button>
                    ) : isChoice ? (
                        // Choice handling is inside the options buttons above
                        null
                    ) : (
                        <button onClick={() => { if (choiceMade) return; setChoiceMade(true); if (isItem) resolveItemPickup(activeCard as Item); }} disabled={!!activeRoll || choiceMade} className={`w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs ${choiceMade ? 'opacity-50 cursor-not-allowed' : isItem ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-100 text-black'}`}>
                            {isItem ? '捡起道具' : '继续'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default CardResolutionModal;

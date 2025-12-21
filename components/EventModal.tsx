
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useEventSystem } from '../hooks/useEventSystem';
import { Dice5, Skull, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Item } from '../types';

const CardResolutionModal: React.FC = () => {
  const { activeCard, players, activePlayerId, lastRollResult, activeRoll } = useGameStore();
  const { initiateEventRoll, resolveItemPickup } = useEventSystem();
  const player = players[activePlayerId];
  if (!activeCard) return null;

  const isItem = 'usage' in activeCard || ['OMEN', 'WEAPON', 'PASSIVE', 'CONSUMABLE'].includes(activeCard.type);
  const cardTitle = 'title' in activeCard ? activeCard.title : activeCard.name;
  const cardType = activeCard.type;
  const isEvent = activeCard.type === 'EVENT';
  const interaction = isEvent ? activeCard.interaction : null;
  const isAttributeCheck = interaction?.type === 'ATTRIBUTE_CHECK';

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
                                        <div className={`text-xs uppercase font-bold ${lastRollResult >= (threshold || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {lastRollResult >= (threshold || 0) ? '成功' : '失败'}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 mt-1">目标值: {threshold}+</div>
                                    </>
                                ) : <div className="text-xs text-zinc-600">等待投掷... (目标: {threshold}+)</div>}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50 flex justify-end">
                    {isAttributeCheck && lastRollResult === null ? (
                        <button onClick={() => initiateEventRoll(activeCard as any)} disabled={!!activeRoll} className="w-full bg-zinc-100 hover:bg-white text-black px-6 py-4 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                            <Dice5 size={16} /> 进行 {attributeLabel} 检定
                        </button>
                    ) : (
                        <button onClick={() => isItem ? resolveItemPickup(activeCard as Item) : null} disabled={!!activeRoll} className={`w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs ${isItem ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-100 text-black'}`}>
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

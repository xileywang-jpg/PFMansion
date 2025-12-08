
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useEventSystem } from '../hooks/useEventSystem';
import { Dice5, Skull, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Item } from '../types';

const CardResolutionModal: React.FC = () => {
  const { 
    activeCard, 
    players, 
    currentPlayerIndex,
    lastRollResult, 
    activeRoll
  } = useGameStore();

  const { initiateEventRoll, resolveItemPickup } = useEventSystem();
  
  const player = players[currentPlayerIndex];

  if (!activeCard) return null;

  // Determine if it is an Item/Omen (Object) or Event (CardDef)
  const isItem = 'usage' in activeCard || activeCard.type === 'OMEN' || activeCard.type === 'WEAPON' || activeCard.type === 'PASSIVE' || activeCard.type === 'CONSUMABLE';
  
  // Safe Accessors
  const cardTitle = 'title' in activeCard ? activeCard.title : activeCard.name;
  const cardType = activeCard.type;

  // Extract Event Logic if applicable
  const isEvent = activeCard.type === 'EVENT';
  const interaction = isEvent ? activeCard.interaction : null;
  const isAttributeCheck = interaction?.type === 'ATTRIBUTE_CHECK';

  const handleRollClick = () => {
    if (isEvent && activeCard) {
        initiateEventRoll(activeCard);
    }
  };

  const handleContinue = () => {
      if (isItem) {
          resolveItemPickup(activeCard as Item);
      } else {
          // Fallback for non-check events without items (narrative only)
          // For now, assume Event System handles logic if it wasn't a roll
      }
  };

  const currentStatValue = isAttributeCheck && interaction && player 
    ? player.character.attributes[interaction.attribute].current 
    : 0;
  
  const threshold = isAttributeCheck && interaction ? interaction.difficulty : 0;
  const attributeName = isAttributeCheck && interaction ? interaction.attribute : '';

  return (
    <AnimatePresence>
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        >
            <motion.div 
                initial={{ y: 50, scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                className={`
                    w-full max-w-md bg-zinc-900 border shadow-2xl rounded-lg overflow-hidden flex flex-col
                    ${cardType === 'OMEN' ? 'border-emerald-900/50 shadow-emerald-900/20' : 
                      isItem ? 'border-indigo-900/50 shadow-indigo-900/20' : 
                      'border-zinc-700'}
                `}
            >
                {/* Header */}
                <div className={`
                    p-6 border-b flex items-center gap-3 relative overflow-hidden
                    ${cardType === 'OMEN' ? 'bg-emerald-950/30 border-emerald-900/30' : 
                      isItem ? 'bg-indigo-950/30 border-indigo-900/30' : 
                      'bg-zinc-950 border-zinc-800'}
                `}>
                    <div className="z-10 flex items-center gap-3">
                        {cardType === 'OMEN' && <Skull className="text-emerald-400" />}
                        {isItem && cardType !== 'OMEN' && <Gem className="text-indigo-400" />}
                        {cardType === 'EVENT' && <Skull className="text-zinc-400" />}
                        
                        <div>
                            <div className="text-[10px] uppercase font-bold tracking-widest opacity-50 mb-1">
                                {cardType}
                            </div>
                            <h2 className="text-2xl font-serif-display text-white tracking-wide leading-none">
                                {cardTitle}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 flex-1">
                    <p className="font-serif-display text-lg text-zinc-300 italic mb-8 leading-relaxed opacity-90">
                        "{activeCard.description}"
                    </p>

                    {/* Passive Effects (Items/Omens) */}
                    {'passiveEffects' in activeCard && activeCard.passiveEffects && activeCard.passiveEffects.length > 0 && (
                        <div className="space-y-2 mb-6">
                             {activeCard.passiveEffects.map((eff, i) => (
                                 <div key={i} className="text-xs uppercase tracking-wider font-bold text-zinc-500 bg-zinc-950/50 p-3 rounded border border-zinc-800">
                                     {eff.text}
                                 </div>
                             ))}
                        </div>
                    )}

                    {/* Event Roll UI */}
                    {isAttributeCheck && (
                        <div className="bg-zinc-800/30 p-4 rounded border border-zinc-700/50 mb-6">
                            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-4 flex justify-between">
                                <span>Test Required</span>
                                <span className="text-indigo-400 font-bold">{attributeName} ({currentStatValue} Dice)</span>
                            </div>
                            
                            {/* Roll Result Display */}
                            <div className="text-center py-4 bg-zinc-900/50 rounded border border-zinc-800">
                                {activeRoll ? (
                                    <div className="flex flex-col items-center justify-center h-16 text-zinc-500 animate-pulse">
                                        <span className="text-xs uppercase font-bold tracking-widest">Rolling...</span>
                                    </div>
                                ) : lastRollResult !== null ? (
                                    <>
                                        <div className="text-5xl font-serif-display font-bold text-white mb-2">{lastRollResult}</div>
                                        <div className={`text-xs uppercase tracking-widest font-bold ${
                                            lastRollResult >= (threshold || 0) ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {lastRollResult >= (threshold || 0) ? 'Passed' : 'Failed'}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 mt-1">Target: {threshold}+</div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-16 text-zinc-600">
                                        <span className="text-xs">Waiting to roll...</span>
                                        <span className="text-[10px] opacity-50">Target: {threshold}+</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-zinc-950/50 border-t border-zinc-800/50 flex justify-end">
                    {/* State: Needs to Roll */}
                    {isAttributeCheck && lastRollResult === null ? (
                        <button 
                            onClick={handleRollClick}
                            disabled={!!activeRoll} // Disable if already rolling globally
                            className="w-full bg-zinc-100 hover:bg-white text-black px-6 py-4 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {activeRoll ? 'Consulting the dice...' : (
                                <>
                                    <Dice5 size={16} /> Roll {currentStatValue} Dice
                                </>
                            )}
                        </button>
                    ) : (
                        /* State: Result Ready or Item Pickup */
                        <button 
                            onClick={handleContinue}
                            disabled={!!activeRoll}
                            className={`
                                w-full px-6 py-4 rounded font-bold uppercase tracking-wider text-xs transition-all
                                ${isItem
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                                    : 'bg-zinc-100 hover:bg-white text-black'}
                            `}
                        >
                            {isItem ? 'Collect Item' : 'Continue'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default CardResolutionModal;

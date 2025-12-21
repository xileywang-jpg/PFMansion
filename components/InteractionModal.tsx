
import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Gift, Gem, Skull, Crosshair, Syringe, User, Swords } from 'lucide-react';
import { Item, Player, AttributeName, GamePhase } from '../types';
import { PLAYER_COLORS } from '../constants';

const InteractionModal: React.FC = () => {
  const { 
    isInteractionModalOpen, 
    toggleInteractionModal, 
    players, 
    activePlayerId, 
    giveItem,
    startCombat,
    playerIds,
    phase
  } = useGameStore();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const activePlayer = players[activePlayerId];

  // Reset selection when modal opens
  useEffect(() => {
    if (isInteractionModalOpen) {
      setSelectedPartnerId(null);
    }
  }, [isInteractionModalOpen]);

  // Get other living players in the same room
  const otherPlayersInRoom = useMemo(() => {
    if (!activePlayer) return [];
    return Object.values(players).filter(p => 
      p.id !== activePlayerId && 
      !p.isDead && 
      p.position.x === activePlayer.position.x && 
      p.position.y === activePlayer.position.y
    );
  }, [players, activePlayer, activePlayerId]);

  // Validate selected partner exists in the room
  const partner = useMemo(() => {
      if (!selectedPartnerId) return null;
      const p = players[selectedPartnerId];
      const isValid = otherPlayersInRoom.some(op => op.id === selectedPartnerId);
      return isValid ? p : null;
  }, [selectedPartnerId, players, otherPlayersInRoom]);

  if (!isInteractionModalOpen || !activePlayer) return null;

  const getItemIcon = (item: Item, size: number = 20) => {
    switch (item.type) {
        case 'WEAPON': return <Crosshair size={size} />;
        case 'CONSUMABLE': return <Syringe size={size} />;
        case 'OMEN': return <Skull size={size} />;
        default: return <Gem size={size} />;
    }
  };

  const handleGive = (itemId: string) => {
    if (!partner) return;
    giveItem(activePlayerId, partner.id, itemId);
    setSelectedPartnerId(null);
  };

  const handleAttack = () => {
    if (!partner) return;
    // Default to Might combat
    startCombat(activePlayerId, partner.id, AttributeName.Might);
  };

  const isHaunt = phase === GamePhase.Haunt;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        onClick={toggleInteractionModal}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }} 
          className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
            <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3">
              <Users size={20} className="text-indigo-400" />
              房间内交互
            </h2>
            <button onClick={toggleInteractionModal} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left: Partner Selection */}
            <div className="w-1/2 border-r border-zinc-800 p-6 overflow-y-auto">
              <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-4">选择同伴</h3>
              <div className="space-y-3">
                {otherPlayersInRoom.length === 0 ? (
                  <div className="text-xs text-zinc-600 italic py-8 text-center border border-dashed border-zinc-800 rounded">
                    房间内没有其他生还者
                  </div>
                ) : (
                  otherPlayersInRoom.map(p => {
                    const color = PLAYER_COLORS[playerIds.indexOf(p.id)];
                    const isSelected = selectedPartnerId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPartnerId(p.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group
                          ${isSelected ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'}
                        `}
                      >
                        <div 
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: color, backgroundColor: `${color}20` }}
                        >
                          <User size={18} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-400' : 'text-zinc-200'}`}>
                            {p.character.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            持有 {p.items.length} 件物品
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Item Selection & Actions */}
            <div className="w-1/2 p-6 flex flex-col bg-zinc-950/20 overflow-y-auto">
              {!partner ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center px-6">
                  <Gift size={32} className="mb-4 opacity-20" />
                  <p className="text-sm italic">请在左侧选择一个交互对象</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">与 {partner.character.name} 交互</h3>
                    {isHaunt && (
                      <button 
                        onClick={handleAttack}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-900/20 animate-pulse"
                      >
                        <Swords size={14} /> 攻击
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">赠送物品</span>
                    {activePlayer.items.length === 0 ? (
                      <div className="text-xs text-zinc-600 italic py-8 text-center border border-dashed border-zinc-800 rounded">
                        你没有任何可赠送的物品
                      </div>
                    ) : (
                      activePlayer.items.map(item => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-zinc-600 transition-all"
                        >
                          <div className={`p-2 rounded ${item.type === 'OMEN' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                            {getItemIcon(item, 18)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-zinc-200 truncate">{item.name}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">{item.type}</div>
                          </div>
                          <button 
                            onClick={() => handleGive(item.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            给予
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-4 bg-zinc-950/80 border-t border-zinc-800 text-[10px] text-zinc-600 text-center font-mono">
            {isHaunt ? "注意: 作祟已爆发，你可以攻击其他玩家。" : "提示: 赠送物品不消耗移动力，但必须在同一房间。"}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InteractionModal;

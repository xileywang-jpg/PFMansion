import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Backpack, Crosshair, Syringe, Gem, Skull, Zap, Trash2, ArrowUpCircle } from 'lucide-react';
import { Item } from '../types';

const InventoryModal: React.FC = () => {
  const { isInventoryOpen, toggleInventory, players, currentPlayerIndex, useItem, dropItem } = useGameStore();
  const player = players[currentPlayerIndex];
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  if (!isInventoryOpen || !player) return null;

  const selectedItem = player.items.find(i => i.id === selectedItemId);

  // Helper to render icon
  const getItemIcon = (item: Item, size: number = 24) => {
    switch (item.type) {
        case 'WEAPON': return <Crosshair size={size} />;
        case 'CONSUMABLE': return <Syringe size={size} />;
        case 'OMEN': return <Skull size={size} />;
        default: return <Gem size={size} />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={toggleInventory}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-[800px] h-[500px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* LEFT: Grid */}
          <div className="w-1/2 border-r border-zinc-800 flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3">
                    <Backpack size={20} className="text-zinc-500" />
                    Inventory
                </h2>
                <span className="text-xs uppercase font-bold text-zinc-600 tracking-wider">
                    {player.items.length} Items
                </span>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
                {player.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                        <Backpack size={48} className="mb-4" />
                        <span className="text-sm">Bag is empty</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {player.items.map((item) => (
                            <button 
                                key={item.id}
                                onClick={() => setSelectedItemId(item.id)}
                                className={`
                                    aspect-square rounded-lg border flex items-center justify-center transition-all relative group
                                    ${selectedItemId === item.id 
                                        ? 'bg-indigo-900/30 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500'}
                                `}
                            >
                                <div className={`
                                    ${item.type === 'OMEN' ? 'text-emerald-500' : 'text-zinc-300'}
                                    ${selectedItemId === item.id ? 'scale-110' : 'group-hover:scale-105'}
                                    transition-transform
                                `}>
                                    {getItemIcon(item, 24)}
                                </div>
                                
                                {item.usage && (
                                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" title="Usable" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* RIGHT: Details */}
          <div className="w-1/2 flex flex-col bg-zinc-950/50">
            {/* Close Btn */}
            <div className="absolute top-4 right-4">
                <button 
                    onClick={toggleInventory}
                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {selectedItem ? (
                <div className="flex flex-col h-full p-8">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className={`
                            p-4 rounded-xl border
                            ${selectedItem.type === 'OMEN' 
                                ? 'bg-emerald-900/20 border-emerald-900 text-emerald-500' 
                                : 'bg-zinc-900 border-zinc-700 text-zinc-300'}
                        `}>
                            {getItemIcon(selectedItem, 40)}
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                                {selectedItem.type}
                            </div>
                            <h3 className="text-2xl font-serif-display text-white mb-2 leading-none">
                                {selectedItem.name}
                            </h3>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1">
                        <p className="text-sm text-zinc-400 italic mb-6 leading-relaxed">
                            "{selectedItem.description}"
                        </p>

                        {/* Passive Effects */}
                        {selectedItem.passiveEffects && selectedItem.passiveEffects.length > 0 && (
                            <div className="mb-4">
                                <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider block mb-2">Passive</span>
                                {selectedItem.passiveEffects.map((eff, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                        <Zap size={14} className="text-yellow-500" />
                                        {eff.text}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Active Usage */}
                        {selectedItem.usage && (
                            <div className="mb-4">
                                <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider block mb-2">Active</span>
                                <div className="text-xs text-zinc-300 bg-indigo-900/10 p-2 rounded border border-indigo-900/30">
                                    Action: <span className="font-bold text-indigo-400">{selectedItem.usage.actionLabel}</span>
                                    {selectedItem.usage.isConsumable && <span className="ml-2 text-[10px] text-zinc-500 uppercase">(Consumable)</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-zinc-800">
                        {selectedItem.usage && (
                            <button 
                                onClick={() => useItem(selectedItem.id)}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
                            >
                                <ArrowUpCircle size={16} />
                                {selectedItem.usage.actionLabel}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => {
                                dropItem(selectedItem.id);
                                setSelectedItemId(null);
                            }}
                            className="px-4 py-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors"
                            title="Drop Item"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                    <span className="text-sm font-serif-display italic">Select an item to view details</span>
                </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InventoryModal;
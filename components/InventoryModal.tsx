
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Backpack, Crosshair, Syringe, Gem, Skull, Zap, Trash2, ArrowUpCircle } from 'lucide-react';
import { Item } from '../types';

const InventoryModal: React.FC = () => {
  const { isInventoryOpen, toggleInventory, players, activePlayerId, useItem, dropItem } = useGameStore();
  const player = players[activePlayerId];
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  if (!isInventoryOpen || !player) return null;
  const selectedItem = selectedItemIndex !== null ? player.items[selectedItemIndex] : null;

  const getItemIcon = (item: Item, size: number = 24) => {
    switch (item.type) {
        case 'WEAPON': return <Crosshair size={size} />;
        case 'CONSUMABLE': return <Syringe size={size} />;
        case 'OMEN': return <Skull size={size} />;
        default: return <Gem size={size} />;
    }
  };

  const getItemTypeLabel = (type: string) => {
      switch(type) {
          case 'WEAPON': return '武器';
          case 'CONSUMABLE': return '消耗品';
          case 'OMEN': return '预兆';
          case 'PASSIVE': return '被动道具';
          default: return type;
      }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={toggleInventory}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-[800px] h-[500px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="w-1/2 border-r border-zinc-800 flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3"><Backpack size={20} className="text-zinc-500" />我的背包</h2>
                <span className="text-xs uppercase font-bold text-zinc-600 tracking-wider">{player.items.length} 件物品</span>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
                {player.items.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50"><Backpack size={48} className="mb-4" /><span className="text-sm">背包是空的</span></div> : (
                    <div className="grid grid-cols-4 gap-3">
                        {player.items.map((item, idx) => (
                            <button key={`${item.id}-${idx}`} onClick={() => setSelectedItemIndex(idx)} className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${selectedItemIndex === idx ? 'bg-indigo-900/30 border-indigo-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'}`}>
                                <div className={`${item.type === 'OMEN' ? 'text-emerald-500' : 'text-zinc-300'}`}>{getItemIcon(item, 24)}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>
          <div className="w-1/2 flex flex-col bg-zinc-950/50 p-8 relative">
            <button onClick={toggleInventory} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            {selectedItem ? (
                <div className="flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-6">
                        <div className={`p-4 rounded-xl border ${selectedItem.type === 'OMEN' ? 'bg-emerald-900/20 text-emerald-500' : 'bg-zinc-900 text-zinc-300'}`}>{getItemIcon(selectedItem, 40)}</div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{getItemTypeLabel(selectedItem.type)}</div>
                            <h3 className="text-2xl font-serif-display text-white mb-2 leading-none">{selectedItem.name}</h3>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-zinc-400 italic mb-6">"{selectedItem.description}"</p>
                        {selectedItem.passiveEffects && selectedItem.passiveEffects.length > 0 && (
                            <div className="mb-4">
                                <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider block mb-2">被动效果</span>
                                {selectedItem.passiveEffects.map((eff, i) => <div key={i} className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded mb-1"><Zap size={14} className="text-yellow-500" />{eff.text}</div>)}
                            </div>
                        )}
                        {selectedItem.usage && (
                            <div className="mb-4">
                                <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider block mb-2">主动效果</span>
                                <div className="text-xs text-zinc-300 bg-indigo-900/10 p-2 rounded border border-indigo-900/30">动作: <span className="font-bold text-indigo-400">{selectedItem.usage.actionLabel}</span></div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-6 border-t border-zinc-800">
                        {selectedItem.usage && <button onClick={() => useItem(selectedItem.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"><ArrowUpCircle size={16} />{selectedItem.usage.actionLabel}</button>}
                        <button onClick={() => { dropItem(selectedItem.id); setSelectedItemIndex(null); }} className="px-4 py-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded transition-colors" title="丢弃物品"><Trash2 size={16} /></button>
                    </div>
                </div>
            ) : <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic text-sm">选择一件物品以查看详情</div>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InventoryModal;

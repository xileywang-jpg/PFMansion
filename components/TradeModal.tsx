import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Crosshair, Syringe, Gem, Skull, User } from 'lucide-react';
import { Item } from '../types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose }) => {
  const { players, activePlayerId, addLog, executeScript, playerIds } = useGameStore();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedMyItemIdx, setSelectedMyItemIdx] = useState<number | null>(null);
  const [selectedPartnerItemIdx, setSelectedPartnerItemIdx] = useState<number | null>(null);

  const currentPlayer = players[activePlayerId];
  const partnerPlayer = selectedPartnerId ? players[selectedPartnerId] : null;

  // 其他玩家（排除自己）
  const otherPlayers = playerIds
    .filter(id => id !== activePlayerId && !players[id]?.isDead)
    .map(id => players[id])
    .filter(Boolean);

  const getItemIcon = (item: Item, size: number = 20) => {
    switch (item.type) {
      case 'WEAPON': return <Crosshair size={size} />;
      case 'CONSUMABLE': return <Syringe size={size} />;
      case 'OMEN': return <Skull size={size} />;
      default: return <Gem size={size} />;
    }
  };

  const handleTrade = () => {
    if (!selectedPartnerId || selectedMyItemIdx === null || selectedPartnerItemIdx === null) {
      addLog('请选择交易对象和物品', 'alert');
      return;
    }

    const myItem = currentPlayer.items[selectedMyItemIdx];
    const partnerItem = partnerPlayer?.items[selectedPartnerItemIdx];

    if (!myItem || !partnerItem) {
      addLog('选择的物品不存在', 'alert');
      return;
    }

    executeScript([{
      type: 'trade_items',
      playerId1: activePlayerId,
      itemId1: myItem.id,
      playerId2: selectedPartnerId,
      itemId2: partnerItem.id
    }]);

    addLog(`与 ${partnerPlayer?.character.name} 交换了物品`, 'success');
    onClose();
  };

  if (!isOpen || !currentPlayer) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-[700px] max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3">
              <ArrowLeftRight size={20} className="text-emerald-500" />
              物品交易
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* 选择交易玩家 */}
            <div className="w-1/3 border-r border-zinc-800 p-4">
              <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-3">选择交易对象</h3>
              {otherPlayers.length === 0 ? (
                <div className="text-zinc-500 text-sm">没有其他玩家</div>
              ) : (
                <div className="space-y-2">
                  {otherPlayers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPartnerId(p.id);
                        setSelectedMyItemIdx(null);
                        setSelectedPartnerItemIdx(null);
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedPartnerId === p.id
                          ? 'bg-emerald-900/30 border-emerald-500'
                          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-zinc-400" />
                        <span className="text-zinc-200 font-medium">{p.character.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 物品选择 */}
            <div className="flex-1 flex">
              {/* 我的物品 */}
              <div className="flex-1 p-4 border-r border-zinc-800">
                <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-3">我的物品</h3>
                {currentPlayer.items.length === 0 ? (
                  <div className="text-zinc-500 text-sm">背包为空</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {currentPlayer.items.map((item, idx) => (
                      <button
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelectedMyItemIdx(idx)}
                        className={`p-2 rounded-lg border flex flex-col items-center transition-all ${
                          selectedMyItemIdx === idx
                            ? 'bg-amber-900/30 border-amber-500'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <div className={`${item.type === 'OMEN' ? 'text-emerald-500' : 'text-zinc-300'}`}>
                          {getItemIcon(item, 20)}
                        </div>
                        <span className="text-xs text-zinc-400 mt-1 truncate w-full text-center">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 对方物品 */}
              <div className="flex-1 p-4">
                <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-3">
                  {partnerPlayer?.character.name || '对方'} 的物品
                </h3>
                {!partnerPlayer ? (
                  <div className="text-zinc-500 text-sm">请先选择交易对象</div>
                ) : partnerPlayer.items.length === 0 ? (
                  <div className="text-zinc-500 text-sm">对方背包为空</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {partnerPlayer.items.map((item, idx) => (
                      <button
                        key={`${item.id}-${idx}`}
                        onClick={() => setSelectedPartnerItemIdx(idx)}
                        className={`p-2 rounded-lg border flex flex-col items-center transition-all ${
                          selectedPartnerItemIdx === idx
                            ? 'bg-emerald-900/30 border-emerald-500'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                        }`}
                      >
                        <div className={`${item.type === 'OMEN' ? 'text-emerald-500' : 'text-zinc-300'}`}>
                          {getItemIcon(item, 20)}
                        </div>
                        <span className="text-xs text-zinc-400 mt-1 truncate w-full text-center">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleTrade}
              disabled={!selectedPartnerId || selectedMyItemIdx === null || selectedPartnerItemIdx === null}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeftRight size={18} />
              确认交易
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TradeModal;

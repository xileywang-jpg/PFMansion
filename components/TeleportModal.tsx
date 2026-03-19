import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ArrowRight } from 'lucide-react';

interface TeleportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeleportModal: React.FC<TeleportModalProps> = ({ isOpen, onClose }) => {
  const { map, players, activePlayerId, addLog, executeScript } = useGameStore();
  const player = players[activePlayerId];
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  if (!isOpen || !player) return null;

  // 获取已揭示的房间列表
  const revealedTiles = Object.values(map).filter(tile => 
    tile.visibility === 'VISIBLE' && (tile.x !== player.position.x || tile.y !== player.position.y)
  );

  const handleTeleport = () => {
    if (!selectedTile) return;
    
    const tile = map[selectedTile];
    if (tile) {
      executeScript([{
        type: 'teleport_to_revealed',
        target: activePlayerId,
        locationId: tile.defId
      }]);
      addLog(`你传送到了 ${selectedTile}`, 'success');
      onClose();
    }
  };

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
          className="w-[500px] max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3">
              <MapPin size={20} className="text-amber-500" />
              传送到已探索区域
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {revealedTiles.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                还没有发现任何可传送的区域
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {revealedTiles.map(tile => (
                  <button
                    key={`${tile.x},${tile.y}`}
                    onClick={() => setSelectedTile(`${tile.x},${tile.y}`)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedTile === `${tile.x},${tile.y}` 
                        ? 'bg-amber-900/30 border-amber-500' 
                        : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <div className="text-zinc-200 font-medium text-sm">
                      {tile.defId || `位置 (${tile.x}, ${tile.y})`}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      坐标: {tile.x}, {tile.y}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleTeleport}
              disabled={!selectedTile}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowRight size={18} />
              确认传送
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

export default TeleportModal;

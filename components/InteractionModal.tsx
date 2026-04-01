import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import TeleportModal from './TeleportModal';
import TradeModal from './TradeModal';
import DivinationModal from './DivinationModal';
import * as network from '../ws/network';

export const InteractionModal: React.FC = () => {
  const { 
    activePlayerId, 
    players, 
    addLog,
    showFeedback,
    ui,
    setRoomInteractionDialog,
    closeRoomInteraction,
  } = useGameStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const dialog = ui.roomInteractionDialog;

  if (dialog.kind === 'CLOSED') return null;

  if (dialog.kind === 'TRADE') {
    return <TradeModal isOpen={true} onClose={closeRoomInteraction} />;
  }

  if (dialog.kind === 'TELEPORT') {
    return <TeleportModal isOpen={true} onClose={closeRoomInteraction} />;
  }

  if (dialog.kind === 'DIVINATION') {
    return <DivinationModal isOpen={true} onClose={closeRoomInteraction} />;
  }

  const resolvedInteraction = dialog.interaction;

  const handleInteraction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const player = players[activePlayerId];
    if (!player) {
      setIsProcessing(false);
      return;
    }

    if (!network.isInNetworkMode()) {
      showFeedback('网络未连接，无法执行互动', 'error');
      setIsProcessing(false);
      return;
    }

    // 执行互动效果
    addLog(`你开始了: ${resolvedInteraction.description}`, 'info');

    switch (resolvedInteraction.type) {
      case 'TRADE':
        setRoomInteractionDialog({ kind: 'TRADE' });
        setIsProcessing(false);
        return;

      case 'TELEPORT': {
        setRoomInteractionDialog({ kind: 'TELEPORT', interaction: resolvedInteraction, tileId: dialog.tileId ?? null });
        setIsProcessing(false);
        return;
      }

      case 'DIVINATION':
        setRoomInteractionDialog({ kind: 'DIVINATION', interaction: resolvedInteraction, tileId: dialog.tileId ?? null });
        setIsProcessing(false);
        return;

      default:
        network.sendExecuteTileInteraction(resolvedInteraction.type);
        addLog(`等待服务器处理互动：${resolvedInteraction.description}`, 'info');
        setIsProcessing(false);
        closeRoomInteraction();
        return;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full mx-4 border border-slate-600">
        <h2 className="text-xl font-bold text-amber-400 mb-4">
          {resolvedInteraction.description}
        </h2>
        
        <div className="space-y-4">
          {resolvedInteraction.cost && (
            <div className="text-slate-300 text-sm">
              消耗: {resolvedInteraction.cost.amount} 点 {resolvedInteraction.cost.type}
            </div>
          )}

          {resolvedInteraction.attribute && typeof resolvedInteraction.difficulty === 'number' && (
            <div className="text-slate-300 text-sm">
              检定: {resolvedInteraction.attribute} / 难度 {resolvedInteraction.difficulty}
            </div>
          )}
          
          {resolvedInteraction.condition && (
            <div className="text-slate-400 text-sm italic">
				需要满足特定条件，最终由服务器校验
            </div>
          )}

          {dialog.tileId && (
            <div className="text-slate-500 text-xs uppercase tracking-wider">
              房间 ID: {dialog.tileId}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleInteraction}
            disabled={isProcessing}
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white py-2 px-4 rounded transition-colors"
          >
            {isProcessing ? '处理中...' : '确认'}
          </button>
          <button
            onClick={closeRoomInteraction}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default InteractionModal;

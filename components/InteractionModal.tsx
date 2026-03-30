import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { TileInteraction } from '../types';
import TeleportModal from './TeleportModal';
import TradeModal from './TradeModal';
import DivinationModal from './DivinationModal';
import * as network from '../ws/network';

interface InteractionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  interaction?: TileInteraction | null;
}

export const InteractionModal: React.FC<InteractionModalProps> = ({
  isOpen,
  onClose,
  interaction
}) => { 
  const { 
    activePlayerId, 
    players, 
    addLog,
    showFeedback,
    isInteractionModalOpen,
    setState,
  } = useGameStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTeleportModal, setShowTeleportModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showDivinationModal, setShowDivinationModal] = useState(false);

  const resolvedOpen = isOpen ?? isInteractionModalOpen;
  const resolvedClose = onClose ?? (() => setState({ isInteractionModalOpen: false }));
  const resolvedInteraction = interaction ?? null;

  if (!resolvedOpen) return null;

  if (!resolvedInteraction) {
    return <TradeModal isOpen={resolvedOpen} onClose={resolvedClose} />;
  }

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
        setShowTradeModal(true);
        setIsProcessing(false);
        return;

      case 'TELEPORT': {
        setShowTeleportModal(true);
        setIsProcessing(false);
        return;
      }

      case 'DIVINATION':
        setShowDivinationModal(true);
        setIsProcessing(false);
        return;

      default:
        network.sendExecuteTileInteraction(resolvedInteraction.type);
        addLog(`等待服务器处理互动：${resolvedInteraction.description}`, 'info');
        setIsProcessing(false);
        resolvedClose();
        return;
    }

    setIsProcessing(false);
    resolvedClose();
  };

  const handleSubModalClose = () => {
    setShowTeleportModal(false);
    setShowTradeModal(false);
    setShowDivinationModal(false);
    resolvedClose();
  };

  return (
    <>
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
            
            {resolvedInteraction.condition && (
              <div className="text-slate-400 text-sm italic">
				需要满足特定条件，最终由服务器校验
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
              onClick={resolvedClose}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <TeleportModal 
        isOpen={showTeleportModal} 
        onClose={handleSubModalClose} 
      />
      <TradeModal 
        isOpen={showTradeModal} 
        onClose={handleSubModalClose} 
      />
      <DivinationModal 
        isOpen={showDivinationModal} 
        onClose={handleSubModalClose} 
      />
    </>
  );
};

export default InteractionModal;

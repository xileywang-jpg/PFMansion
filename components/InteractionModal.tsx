import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { handleTileInteraction, canInteractWithTile } from '../utils/logicEngine';
import { TileInteraction, AttributeName } from '../types';
import { GameContext } from '../utils/logicEngine';

interface InteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  interaction: TileInteraction | null;
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
    executeScript,
    drawCard
  } = useGameStore();
  
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !interaction) return null;

  const handleInteraction = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const player = players[activePlayerId];
    if (!player) {
      setIsProcessing(false);
      return;
    }

    const context: GameContext = {
      state: useGameStore.getState(),
      activePlayerId
    };

    // 检查条件
    if (interaction.condition) {
      // TODO: 实现条件检查
    }

    // 检查消耗
    if (interaction.cost) {
      const attrValue = player.character.attributes[interaction.cost.type as any]?.current ?? 0;
      if (attrValue < interaction.cost.amount) {
        addLog(`需要 ${interaction.cost.amount} 点 ${interaction.cost.type}`, 'alert');
        setIsProcessing(false);
        return;
      }
      // 扣除消耗
      executeScript([{
        type: 'modify_stat',
        target: activePlayerId,
        attribute: interaction.cost.type as any,
        amount: -interaction.cost.amount
      }]);
    }

    // 执行互动效果
    addLog(`你开始了: ${interaction.description}`, 'info');

    switch (interaction.type) {
      case 'TRADE':
        // TODO: 打开交易面板
        addLog('交易功能开发中...', 'info');
        break;

      case 'HEAL':
        executeScript([{
          type: 'heal',
          target: activePlayerId,
          attribute: AttributeName.Might,
          amount: 999
        }, {
          type: 'heal',
          target: activePlayerId,
          attribute: AttributeName.Sanity,
          amount: 999
        }]);
        addLog('你在圣泉中恢复了全部状态！', 'success');
        break;

      case 'TELEPORT':
        // TODO: 打开传送选择面板
        addLog('传送功能开发中...', 'info');
        break;

      case 'REVEAL_MAP':
        // TODO: 实现揭示全图
        addLog('你揭示了地图上所有的隐藏区域！', 'success');
        break;

      case 'DIVINATION':
        addLog('你预知了下一个事件...（功能开发中）', 'info');
        break;

      case 'MIRROR':
        addLog('你在镜中看到了自己的命运...（功能开发中）', 'info');
        break;

      case 'TIME_REWIND':
        addLog('时间回溯！先攻顺序重置...（功能开发中）', 'info');
        break;

      case 'FORGE':
        addLog('你在泰坦锻铁炉中打造了一件武器！', 'success');
        drawCard('ITEM');
        break;

      default:
        addLog(`互动: ${interaction.description}`, 'info');
    }

    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full mx-4 border border-slate-600">
        <h2 className="text-xl font-bold text-amber-400 mb-4">
          {interaction.description}
        </h2>
        
        <div className="space-y-4">
          {interaction.cost && (
            <div className="text-slate-300 text-sm">
              消耗: {interaction.cost.amount} 点 {interaction.cost.type}
            </div>
          )}
          
          {interaction.condition && (
            <div className="text-slate-400 text-sm italic">
              需要满足特定条件
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
            onClick={onClose}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 检测当前地块是否可以互动，并打开UI
 */
export const checkAndOpenInteraction = (
  tileDef: { interact?: TileInteraction },
  context: GameContext
): boolean => {
  if (!tileDef.interact) return false;
  
  if (canInteractWithTile(tileDef, context)) {
    useGameStore.getState().addLog(`你可以与这个地点互动: ${tileDef.interact.description}`, 'info');
    return true;
  }
  
  return false;
};

export default InteractionModal;

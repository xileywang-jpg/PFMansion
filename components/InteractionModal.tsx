import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { canInteractWithTile, evaluateCondition } from '../utils/logicEngine';
import { TileInteraction, AttributeName, ActiveRoll } from '../types';
import { GameContext, resolveTargets } from '../utils/logicEngine';
import { generateId } from '../utils/idGenerator';
import TeleportModal from './TeleportModal';
import TradeModal from './TradeModal';
import DivinationModal from './DivinationModal';
import * as network from '../ws/network';

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
    drawCard,
    getEffectiveAttributeValue,
    setState,
    map,
  } = useGameStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTeleportModal, setShowTeleportModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showDivinationModal, setShowDivinationModal] = useState(false);

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
      const canProceed = evaluateCondition(interaction.condition, context);
      if (!canProceed) {
        addLog(`条件不满足，无法进行此互动`, 'alert');
        setIsProcessing(false);
        return;
      }
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
        setShowTradeModal(true);
        setIsProcessing(false);
        return;

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

      case 'CROSS': {
        // CROSS 是跳过障碍的检定，类似事件检定
        const attr = interaction.attribute || 'speed';
        const difficulty = interaction.difficulty || 4;
        const diceCount = getEffectiveAttributeValue(activePlayerId, attr);
        
        const attrNameMap: Record<string, string> = { might: '力量', speed: '速度', sanity: '理智', knowledge: '知识' };
        const attrLabel = attrNameMap[attr] || attr;
        
        // 创建投掷任务
        const rollData: ActiveRoll = {
          id: generateId(`cross_${interaction.type}`),
          attributeName: `跳过障碍 (${attrLabel})`,
          numberOfDice: diceCount,
          targetValue: difficulty,
          onComplete: (total) => {
            const isSuccess = total >= difficulty;
            if (isSuccess && interaction.successMessage) {
              addLog(`✓ ${interaction.successMessage}`, 'success');
            } else if (!isSuccess && interaction.failureMessage) {
              addLog(`✕ ${interaction.failureMessage}`, 'alert');
              // Bug Fix: 网络模式下，伤害应由后端处理，不在前端直接修改
              if (!network.isInNetworkMode()) {
                // 仅在单机模式下前端处理伤害
                const newState = useGameStore.getState();
                const newPlayer = newState.players[activePlayerId];
                const mightAttr = newPlayer.character.attributes.might;
                mightAttr.current = Math.max(mightAttr.floor, mightAttr.current - 2);
                addLog(`你受到 2 点伤害！`, 'alert');
              } else {
                addLog(`等待服务器处理伤害...`, 'info');
              }
            }
            // 关闭互动模态框
            useGameStore.getState().setState({ isInteractionModalOpen: false });
          }
        };
        
        setState({ activeRoll: rollData });
        setIsProcessing(false);
        return;
      }

      case 'TELEPORT': {
        const destination = interaction.destination;
        
        // 如果是 any_revealed，直接传送到随机已揭示地块
        if (destination === 'any_revealed') {
          const availableTiles = Object.entries(map)
            .filter(([_, tile]) => tile.visibility === 'VISIBLE')
            .filter(([key]) => {
              const [x, y] = key.split(',').map(Number);
              return !Object.values(players).some(p => p.position.x === x && p.position.y === y && !p.isDead);
            });
          
          if (availableTiles.length > 0) {
            const randomTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
            const [tx, ty] = randomTile[0].split(',').map(Number);
            
            const newPlayers = { ...players };
            newPlayers[activePlayerId] = {
              ...newPlayers[activePlayerId],
              position: { x: tx, y: ty }
            };
            setState({ players: newPlayers });
            addLog(`你被传送到 ${tx},${ty}！`, 'success');
          } else {
            addLog(`没有可用的传送目标！`, 'alert');
          }
        } else {
          // 其他类型打开传送选择界面
          setShowTeleportModal(true);
          setIsProcessing(false);
          return;
        }
        break;
      }

      case 'REVEAL_MAP':
        executeScript([{ type: 'reveal_all_tiles' }]);
        addLog('你揭示了地图上所有的隐藏区域！', 'success');
        break;

      case 'DIVINATION':
        // 预知：打开占卜界面，占卜结束后执行额外效果
        // 保存互动效果以便在占卜后执行
        const divinationEffects = interaction.effects || [];
        
        // 临时存储效果到全局状态
        setState({ pendingInteractionEffects: divinationEffects });
        setShowDivinationModal(true);
        setIsProcessing(false);
        return;

      case 'MIRROR': {
        const duration = interaction.mirrorDuration || 3;
        const mirrorEffects = interaction.effects || [];
        
        // 添加镜子反射状态
        executeScript([{ 
          type: 'add_status_effect',
          target: activePlayerId,
          effect: 'MIRROR_REFLECT',
          duration: duration
        }]);
        
        // 执行其他效果（如额外的理智损失）
        mirrorEffects.forEach(effect => {
          if (effect.type === 'MODIFY_STAT' || effect.type === 'modify_stat') {
            executeScript([{
              type: 'modify_stat',
              target: activePlayerId,
              attribute: effect.stat || effect.attribute,
              amount: effect.amount
            }]);
          }
        });
        
        addLog(`你在命运之镜中看到了一丝未来... 镜子反射效果已施加，持续 ${duration} 回合！`, 'alert');
        break;
      }

      case 'TIME_REWIND': {
        // 时间回溯 - 清空上一次的骰子结果，触发新的投掷
        // 首先扣除理智消耗（已在前面处理）
        
        // 创建新的投掷任务
        const rollData: ActiveRoll = {
          id: generateId('time_rewind'),
          attributeName: '时间回溯 (重新投掷)',
          numberOfDice: 6, // 使用全部6颗骰子
          onComplete: (total) => {
            addLog(`时间回溯投掷结果: ${total}`, 'info');
            // 时间回溯不关闭互动模态框，让玩家继续
            useGameStore.getState().setState({ isInteractionModalOpen: false });
          }
        };
        
        setState({ activeRoll: rollData });
        addLog('时间回溯！所有骰子将重新投掷...', 'warning');
        setIsProcessing(false);
        return;
      }

      case 'FORGE': {
        // 锻造 - 检查条件，然后给予传奇物品
        // 条件检查已在前面处理
        const tier = interaction.effects?.[0]?.tier || 'normal';
        
        // 给予传奇武器（简化实现：随机给予一件武器）
        const legendaryWeapons = [
          { id: 'vol_weapon_athena_spear', name: '雅典娜之矛', description: '智慧与力量的象征', type: 'WEAPON' as const },
          { id: 'vol_weapon_arrowsun', name: '太阳神弓', description: '光明之箭，百发百中', type: 'WEAPON' as const },
          { id: 'vol_weapon_ares_sword', name: '战神之剑', description: '嗜血好战，无坚不摧', type: 'WEAPON' as const },
          { id: 'vol_weapon_hermes_wings', name: '赫尔墨斯之翼', description: '风之神速，来去如风', type: 'WEAPON' as const },
          { id: 'vol_weapon_dionysus_cup', name: '酒神金杯', description: '醉生梦死，忘却伤痛', type: 'WEAPON' as const },
          { id: 'vol_weapon_zeus_shield', name: '雷霆神盾', description: '万钧雷霆，坚不可摧', type: 'WEAPON' as const },
        ];
        
        const weapon = legendaryWeapons[Math.floor(Math.random() * legendaryWeapons.length)];
        
        executeScript([{
          type: 'add_item',
          target: activePlayerId,
          itemId: weapon.id
        }]);
        
        addLog(`你在泰坦锻铁炉中打造了「${weapon.name}」！`, 'success');
        break;
      }

      default:
        addLog(`互动: ${interaction.description}`, 'info');
    }

    setIsProcessing(false);
    onClose();
  };

  const handleSubModalClose = () => {
    setShowTeleportModal(false);
    setShowTradeModal(false);
    setShowDivinationModal(false);
    onClose();
  };

  return (
    <>
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

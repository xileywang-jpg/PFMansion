import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Eye, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import * as network from '../ws/network';

interface DivinationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DivinationModal: React.FC<DivinationModalProps> = ({ isOpen, onClose }) => {
  const { decks, addLog, showFeedback, setState } = useGameStore();
  const [selectedAction, setSelectedAction] = useState<'toTop' | 'toBottom' | null>(null);

  // 获取事件堆顶的牌
  const nextEvent = decks.EVENT?.[0];

  const handleConfirm = () => {
    if (!selectedAction) return;
    if (!network.isInNetworkMode()) {
      showFeedback('网络未连接，无法执行占卜', 'error');
      return;
    }

    network.sendDivination(selectedAction);

    addLog(
      selectedAction === 'toTop' 
        ? '你将预知的卡牌放回堆顶' 
        : '你把预知的卡牌放到了堆底',
      'info'
    );

    // 清空待执行效果
    setState({ pendingInteractionEffects: null });
    onClose();
  };

  const handleClose = () => {
    // 如果没有确认选择就关闭，清空待执行效果
    setState({ pendingInteractionEffects: null });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-[500px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-purple-900/30 to-zinc-900">
            <h2 className="text-xl font-serif-display text-zinc-100 flex items-center gap-3">
              <Sparkles size={20} className="text-purple-500" />
              星兆占卜
            </h2>
            <button onClick={handleClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* 预知结果 */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider mb-3 flex items-center gap-2">
                <Eye size={14} />
                预知到的下一张事件牌
              </h3>
              
              {nextEvent ? (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="text-lg font-serif-display text-amber-400 mb-2">
                    {nextEvent.title || '未知事件'}
                  </div>
                  <p className="text-sm text-zinc-400 italic">
                    {nextEvent.description || '这张卡牌的内容不可知'}
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 text-center text-zinc-500">
                  事件牌堆为空
                </div>
              )}
            </div>

            {/* 选择操作 */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                你要如何处置这张卡牌？
              </h3>
              
              <button
                onClick={() => setSelectedAction('toTop')}
                className={`w-full p-4 rounded-lg border flex items-center gap-4 transition-all ${
                  selectedAction === 'toTop'
                    ? 'bg-purple-900/30 border-purple-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <ArrowUpFromLine size={24} className="text-purple-400" />
                <div className="text-left">
                  <div className="text-zinc-200 font-medium">放回堆顶</div>
                  <div className="text-xs text-zinc-500">保持原顺序，进入下一地块时触发此事件</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedAction('toBottom')}
                className={`w-full p-4 rounded-lg border flex items-center gap-4 transition-all ${
                  selectedAction === 'toBottom'
                    ? 'bg-purple-900/30 border-purple-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <ArrowDownToLine size={24} className="text-amber-400" />
                <div className="text-left">
                  <div className="text-zinc-200 font-medium">放到堆底</div>
                  <div className="text-xs text-zinc-500">换一张卡牌，下一个事件将不同</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!selectedAction}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles size={18} />
              确认占卜
            </button>
            <button
              onClick={handleClose}
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

export default DivinationModal;

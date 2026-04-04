/**
 * CardRevealModal - 卡牌揭示动画弹窗
 * 
 * 功能：
 * - 预兆/物品抽取时的翻牌动画
 * - 显示卡牌类型、名称、描述
 * - 用户手动确认后关闭
 */

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Skull, Gem,
  Sparkles, Check, ChevronRight, Loader2
} from 'lucide-react';

// ==================== 图标映射 ====================

type CardTypeConfig = {
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  borderColor: string;
  label: string;
};

const CARD_TYPE_CONFIG: Record<string, CardTypeConfig> = {
  'OMEN': { 
    icon: Skull, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-900/30',
    borderColor: '#10b981',
    label: '预兆'
  },
  'ITEM': { 
    icon: Gem, 
    color: 'text-amber-400', 
    bg: 'bg-amber-900/30',
    borderColor: '#f59e0b',
    label: '物品'
  },
  'EVENT': { 
    icon: Sparkles, 
    color: 'text-indigo-400', 
    bg: 'bg-indigo-900/30',
    borderColor: '#6366f1',
    label: '事件'
  },
};

// ==================== 翻牌动画组件 ====================

interface FlipCardProps {
  card: any;
  cardType: string;
  isRevealed: boolean;
}

const FlipCard: React.FC<FlipCardProps> = ({ card, cardType, isRevealed }) => {
  const typeConfig = CARD_TYPE_CONFIG[cardType] || CARD_TYPE_CONFIG['ITEM'];
  const IconComponent = typeConfig.icon;

  return (
    <div className="relative w-64 h-96">
      <motion.div
        className="relative w-full h-full"
        initial={{ rotateY: 0 }}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* 背面（卡背） */}
        <div 
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black rounded-2xl border-2 border-zinc-700 flex items-center justify-center shadow-2xl"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* 装饰图案 */}
          <div className="absolute inset-4 border border-zinc-700/50 rounded-xl" />
          <div className="absolute inset-8 border border-zinc-600/30 rounded-lg" />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
              揭示中...
            </span>
          </div>
        </div>

        {/* 正面（卡面） */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl border-2 flex flex-col overflow-hidden shadow-2xl"
          style={{ 
            backfaceVisibility: 'hidden', 
            transform: 'rotateY(180deg)',
            borderColor: typeConfig.borderColor,
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)'
          }}
        >
          {/* 卡牌类型标签 */}
          <div className={`p-3 flex items-center gap-2 ${typeConfig.bg} border-b border-zinc-800/50`}>
            <IconComponent size={16} className={typeConfig.color} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
          </div>

          {/* 卡牌图标区 */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className={`
              p-8 rounded-2xl border-2
              ${typeConfig.bg} border-current/20
            `}>
              <IconComponent size={64} className={typeConfig.color} />
            </div>
          </div>

          {/* 卡牌名称 */}
          <div className="p-4 text-center border-t border-zinc-800/50">
            <h3 className="text-xl font-serif-display font-bold text-white mb-2">
              {card.title || card.name || '未知卡牌'}
            </h3>
            <p className="text-xs text-zinc-400 italic leading-relaxed">
              {card.description || card.flavorText || ''}
            </p>
          </div>

          {/* 卡牌ID */}
          {card.id && (
            <div className="px-4 py-2 bg-black/30 text-center">
              <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter">
                {card.id}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ==================== 主组件 ====================

const CardRevealModal: React.FC = () => {
  const { ui, closeCardReveal } = useGameStore();
  const cardRevealModal = ui.cardRevealModal;
  const [isRevealed, setIsRevealed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 重置状态当弹窗打开
  useEffect(() => {
    if (cardRevealModal) {
      setIsRevealed(false);
      setShowConfirm(false);
      // 自动触发揭示
      const timer = setTimeout(() => {
        setIsRevealed(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [cardRevealModal]);

  // 揭示后延迟显示确认按钮
  useEffect(() => {
    if (isRevealed && cardRevealModal) {
      const timer = setTimeout(() => {
        setShowConfirm(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isRevealed, cardRevealModal]);

  if (!cardRevealModal) return null;

  const { card, deck, onConfirmAction } = cardRevealModal;
  const typeConfig = CARD_TYPE_CONFIG[deck] || CARD_TYPE_CONFIG['ITEM'];
  const IconComponent = typeConfig.icon;

  const handleConfirm = () => {
    // 执行确认动作（如果存在）
    if (onConfirmAction) {
      onConfirmAction();
    }
    closeCardReveal();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at center, ${typeConfig.borderColor}40 0%, transparent 70%)`
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* 标题 */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <div className={`flex items-center justify-center gap-3 mb-2 ${typeConfig.color}`}>
            <IconComponent size={24} />
            <h2 className="text-2xl font-serif-display font-bold tracking-wide">
              {deck === 'OMEN' ? '预兆揭示' : deck === 'ITEM' ? '获得物品' : '事件触发'}
            </h2>
          </div>
          <p className="text-zinc-500 text-sm italic">
            {deck === 'OMEN' ? '命运的齿轮开始转动...' : 
             deck === 'ITEM' ? '你在废墟中发现了有用的东西！' : 
             '一个事件被触发了'}
          </p>
        </motion.div>

        {/* 翻牌 */}
        <FlipCard 
          card={card} 
          cardType={deck} 
          isRevealed={isRevealed} 
        />

        {/* 确认按钮 */}
        <AnimatePresence>
          {showConfirm && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={handleConfirm}
              className={`
                px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm
                flex items-center gap-3 transition-all shadow-lg
                ${deck === 'OMEN' 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : deck === 'ITEM'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }
              `}
            >
              <Check size={20} />
              我已知晓，继续
              <ChevronRight size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600 text-xs">
        {!isRevealed && '即将揭示...'}
        {isRevealed && !showConfirm && '揭示中...'}
      </div>
    </motion.div>
  );
};

export default CardRevealModal;

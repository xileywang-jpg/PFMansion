/**
 * PlayerInspectionModal - 角色详情弹窗（方案A）
 * 
 * 布局：左侧大立绘 + 右侧详细信息
 * 默认使用翁法罗斯（Volantis）卡组设计
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Zap, Brain, Eye, Dumbbell, 
  ShieldAlert, Shield, Skull, Lock, 
  Sparkles, Star, Cross, Moon, Wind, Heart,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { PLAYER_COLORS } from '../constants';
import { AttributeName } from '../types';
import { CharacterPortrait } from './effects/CardImage';

// ==================== 图标映射 ====================

const TRAIT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  '领袖': Star,
  '光辉': Sparkles,
  '迅捷': Wind,
  '盗寇': Star,
  '时间': Moon,
  '分裂': Star,
  '好战': Heart,
  '坚韧': Shield,
  '死亡': Skull,
  '灵媒': Moon,
  '锻造': Star,
  '音乐': Star,
  '迷惑': Moon,
  '智慧': Brain,
  '预知': Eye,
  '毁灭': Heart,
  '狂暴': Zap,
  '隐身': Moon,
  '梦境': Moon,
  '治愈': Heart,
  '牺牲': Cross,
};

const TRAIT_COLOR_MAP: Record<string, string> = {
  '领袖': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  '光辉': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  '迅捷': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  '盗寇': 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  '时间': 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  '分裂': 'text-pink-400 border-pink-500/30 bg-pink-500/10',
  '好战': 'text-red-400 border-red-500/30 bg-red-500/10',
  '坚韧': 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  '死亡': 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
  '灵媒': 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  '锻造': 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  '音乐': 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  '迷惑': 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
  '智慧': 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  '预知': 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  '毁灭': 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  '狂暴': 'text-red-500 border-red-600/30 bg-red-600/10',
  '隐身': 'text-gray-400 border-gray-500/30 bg-gray-500/10',
  '梦境': 'text-violet-300 border-violet-400/30 bg-violet-400/10',
  '治愈': 'text-green-400 border-green-500/30 bg-green-500/10',
  '牺牲': 'text-amber-300 border-amber-400/30 bg-amber-400/10',
};

// ==================== 属性行组件 ====================

interface AttributeRowProps {
  label: string;
  value: number;
  max: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isDead: boolean;
  bonus?: number;
}

const AttributeRow: React.FC<AttributeRowProps> = ({ 
  label, value, max, icon: Icon, isDead, bonus = 0 
}) => {
  const hasBonus = bonus > 0;
  const hasPenalty = bonus < 0;
  
  return (
    <div className={`flex items-center gap-3 py-2 ${isDead ? 'opacity-50' : ''}`}>
      <div className={`p-2 rounded-lg border ${isDead ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-800/80 border-zinc-700'}`}>
        <Icon size={16} className={isDead ? 'text-zinc-600' : 'text-zinc-400'} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-[11px] uppercase tracking-widest font-bold ${isDead ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold tabular-nums ${isDead ? 'text-zinc-700' : 'text-zinc-200'}`}>
              {value}
            </span>
            {hasBonus && !isDead && (
              <span className="text-[10px] text-emerald-400 font-bold">+{bonus}</span>
            )}
            {hasPenalty && !isDead && (
              <span className="text-[10px] text-red-400 font-bold">{bonus}</span>
            )}
            <span className="text-[10px] text-zinc-600">/ {max}</span>
          </div>
        </div>
        {/* 属性条 */}
        <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full ${isDead ? 'bg-zinc-700' : hasBonus ? 'bg-gradient-to-r from-zinc-500 to-emerald-500' : 'bg-zinc-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(value / max) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};

// ==================== 技能卡组件 ====================

interface SkillCardProps {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const SkillCard: React.FC<SkillCardProps> = ({ name, description }) => (
  <div className="bg-gradient-to-br from-zinc-800/60 to-zinc-900/80 border border-zinc-700/50 rounded-lg p-3 hover:border-indigo-500/30 hover:bg-zinc-800/70 transition-all">
    <div className="flex items-center gap-2 mb-1.5">
      <div className="p-1.5 bg-indigo-900/30 rounded-md">
        <Zap size={12} className="text-indigo-400" />
      </div>
      <span className="text-sm font-bold text-indigo-200">{name}</span>
    </div>
    <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>
  </div>
);

// ==================== 主组件 ====================

const PlayerInspectionModal: React.FC = () => {
  const { 
    ui,
    closeInspection, 
    players, 
    playerIds, 
    isHauntActive,
    getCharacterById,
    getSkillById
  } = useGameStore();
  
  const player = ui.inspectPlayerId ? players[ui.inspectPlayerId] : null;

  // 获取角色完整定义
  const characterDef = useMemo(() => {
    if (!player) return null;
    return getCharacterById(player.character.id);
  }, [player, getCharacterById]);

  // 技能列表
  const playerSkills = useMemo(() => {
    if (!player) return [];
    const itemSkills = player.items.flatMap(item => item.grantedSkills || []);
    const characterSkills = player.character.initialSkills || [];
    const acquiredSkills = player.skills || [];
    const allSkillIds = Array.from(new Set([...itemSkills, ...characterSkills, ...acquiredSkills]));
    return allSkillIds.map(id => getSkillById(id)).filter(Boolean);
  }, [player, getSkillById]);

  if (!player) return null;

  const playerColor = PLAYER_COLORS[playerIds.indexOf(player.id)];
  const isHauntPhase = isHauntActive;
  const isTraitor = player.team === 'TRAITOR';

  // 团队标签
  const teamBadge = isHauntPhase && !player.isDead ? (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
      ${isTraitor 
        ? 'bg-red-900/30 text-red-400 border-red-500/30' 
        : 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30'
      }
    `}>
      {isTraitor ? <Skull size={12} /> : <ShieldAlert size={12} />}
      {isTraitor ? '叛徒' : '英雄'}
    </span>
  ) : null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={closeInspection}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-[900px] max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_80px_rgba(99,102,241,0.15)] overflow-hidden flex"
          onClick={e => e.stopPropagation()}
        >
          {/* ==================== 左侧：立绘区域 ==================== */}
          <div className="w-[280px] shrink-0 relative bg-gradient-to-b from-zinc-900 to-zinc-950 border-r border-zinc-800/80 flex flex-col">
            {/* 关闭按钮 */}
            <button 
              onClick={closeInspection} 
              className="absolute top-4 right-4 z-20 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-700/50 backdrop-blur-sm transition-all"
            >
              <X size={18} />
            </button>

            {/* 立绘占位符 */}
            <div className="flex-1 flex items-center justify-center p-6 pt-12">
              <CharacterPortrait
                src={characterDef?.portraitUrl}
                name={player.character.name}
                className="shadow-[0_0_40px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* 角色 ID 标识 */}
            <div className="p-4 border-t border-zinc-800/50 text-center">
              <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                {characterDef?.id || player.character.id}
              </span>
            </div>
          </div>

          {/* ==================== 右侧：详细信息 ==================== */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800/60 bg-gradient-to-r from-zinc-900/50 to-transparent">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className={`
                      text-2xl font-serif-display font-bold tracking-wide
                      ${player.isDead ? 'text-zinc-500 line-through' : 'text-white'}
                    `}>
                      {player.character.name}
                    </h2>
                    {teamBadge}
                    {player.isDead && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded font-bold uppercase">
                        阵亡
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 italic leading-relaxed max-w-lg">
                    "{player.character.description}"
                  </p>
                </div>
              </div>

              {/* 特质标签 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {player.character.traits?.map(trait => {
                  const TraitIcon = TRAIT_ICON_MAP[trait] || Star;
                  const colorClass = TRAIT_COLOR_MAP[trait] || 'text-zinc-400 border-zinc-600/30 bg-zinc-800/30';
                  return (
                    <span 
                      key={trait} 
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                        ${colorClass}
                      `}
                    >
                      <TraitIcon size={10} />
                      {trait}
                    </span>
                  );
                })}
              </div>

              {/* 主动技能 */}
              {characterDef?.ability && (
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-900/10 to-transparent border-l-2 border-amber-500/50 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">主动技能</span>
                  </div>
                  <p className="text-sm text-amber-200/90 leading-relaxed">
                    {characterDef.ability}
                  </p>
                </div>
              )}
            </div>

            {/* 属性与技能 */}
            <div className="p-6 space-y-6">
              {/* 属性区 */}
              <div>
                <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Star size={12} />
                  基础属性
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <AttributeRow 
                    label="力量" 
                    value={player.character.attributes[AttributeName.Might].current}
                    max={8}
                    icon={Dumbbell}
                    isDead={player.isDead}
                    bonus={player.character.attributes[AttributeName.Might].current - player.character.attributes[AttributeName.Might].base}
                  />
                  <AttributeRow 
                    label="速度" 
                    value={player.character.attributes[AttributeName.Speed].current}
                    max={8}
                    icon={Zap}
                    isDead={player.isDead}
                    bonus={player.character.attributes[AttributeName.Speed].current - player.character.attributes[AttributeName.Speed].base}
                  />
                  <AttributeRow 
                    label="理智" 
                    value={player.character.attributes[AttributeName.Sanity].current}
                    max={8}
                    icon={Brain}
                    isDead={player.isDead}
                    bonus={player.character.attributes[AttributeName.Sanity].current - player.character.attributes[AttributeName.Sanity].base}
                  />
                  <AttributeRow 
                    label="知识" 
                    value={player.character.attributes[AttributeName.Knowledge].current}
                    max={8}
                    icon={Eye}
                    isDead={player.isDead}
                    bonus={player.character.attributes[AttributeName.Knowledge].current - player.character.attributes[AttributeName.Knowledge].base}
                  />
                </div>
              </div>

              {/* 已习得技能 */}
              {playerSkills.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={12} />
                    已习得技能
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {playerSkills.slice(0, 4).map(skill => (
                      <SkillCard 
                        key={skill.id}
                        id={skill.id}
                        name={skill.name}
                        description={skill.description}
                        icon={skill.icon}
                      />
                    ))}
                  </div>
                  {playerSkills.length > 4 && (
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">
                      还有 {playerSkills.length - 4} 个技能...
                    </p>
                  )}
                </div>
              )}

              {/* 状态效果 */}
              {player.buffs.length > 0 && (
                <div>
                  <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Shield size={12} />
                    状态效果
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {player.buffs.map((buff, i) => (
                      <span 
                        key={i} 
                        className="text-xs px-3 py-1.5 bg-emerald-900/20 text-emerald-400 border border-emerald-800/30 rounded-lg"
                      >
                        {buff}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 背包隐私提示 */}
              <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-zinc-600">
                <Lock size={12} />
                <span className="text-[10px] font-mono uppercase tracking-wider">背包内容不可见</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlayerInspectionModal;


import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Zap, Brain, Eye, Dumbbell, ShieldAlert, Shield, Skull, Lock } from 'lucide-react';
import { PLAYER_COLORS } from '../constants';
import { AttributeName } from '../types';
import { SKILLS_DB } from '../data/skills';

// Shared attribute row component (could be extracted, but kept here for self-containment)
const ReadOnlyAttributeRow: React.FC<{ label: string, value: number, max: number, icon: any }> = ({ label, value, max, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-2">
    <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400">
      <Icon size={14} />
    </div>
    <div className="flex-1">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
            <span>{label}</span>
            <span className="font-bold text-zinc-300">{value}</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-zinc-500"
                style={{ width: `${(value / 8) * 100}%` }} 
            />
        </div>
    </div>
  </div>
);

const PlayerInspectionModal: React.FC = () => {
  const { inspectPlayerId, closeInspection, players, playerIds, isHauntActive } = useGameStore();
  
  const player = inspectPlayerId ? players[inspectPlayerId] : null;

  const playerSkills = useMemo(() => {
    if (!player) return [];
    
    // Include skills from items (even if we don't show the item itself)
    const itemSkills = player.items.flatMap(item => item.grantedSkills || []);
    // Intrinsic and Acquired skills
    const characterSkills = player.character.initialSkills || [];
    const acquiredSkills = player.skills || [];

    const allSkillIds = Array.from(new Set([...itemSkills, ...characterSkills, ...acquiredSkills]));
    return allSkillIds.map(id => SKILLS_DB[id]).filter(Boolean);
  }, [player]);

  if (!player) return null;

  const playerColor = PLAYER_COLORS[playerIds.indexOf(player.id)];
  
  // Show team badge only if Haunt is active
  const teamBadge = isHauntActive && !player.isDead ? (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 border ${
          player.team === 'TRAITOR' 
          ? 'bg-red-900/30 text-red-500 border-red-900/50' 
          : 'bg-indigo-900/30 text-indigo-400 border-indigo-900/50'
      }`}>
          {player.team === 'TRAITOR' ? <ShieldAlert size={10} /> : <Shield size={10} />}
          {player.team === 'TRAITOR' ? '叛徒' : '英雄'}
      </span>
  ) : null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={closeInspection}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0 }} 
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-zinc-900 to-zinc-950 border-b border-zinc-800">
                <button 
                    onClick={closeInspection} 
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-5">
                    <div 
                        className="w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-lg"
                        style={{ borderColor: player.isDead ? '#52525b' : playerColor, backgroundColor: player.isDead ? '#27272a' : `${playerColor}20` }}
                    >
                        {player.isDead ? <Skull size={32} className="text-zinc-500" /> : <User size={32} style={{ color: playerColor }} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className={`text-2xl font-serif-display leading-none ${player.isDead ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                {player.character.name}
                            </h2>
                            {teamBadge}
                        </div>
                        <p className="text-xs text-zinc-400 italic">{player.character.description}</p>
                        <div className="flex gap-2 mt-2">
                             {player.character.traits.map(t => (
                                <span key={t} className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase">{t}</span>
                             ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Attributes */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={12} /> 基础属性
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <ReadOnlyAttributeRow label="力量" value={player.character.attributes[AttributeName.Might].current} max={8} icon={Dumbbell} />
                        <ReadOnlyAttributeRow label="速度" value={player.character.attributes[AttributeName.Speed].current} max={8} icon={Zap} />
                        <ReadOnlyAttributeRow label="理智" value={player.character.attributes[AttributeName.Sanity].current} max={8} icon={Brain} />
                        <ReadOnlyAttributeRow label="知识" value={player.character.attributes[AttributeName.Knowledge].current} max={8} icon={Eye} />
                    </div>
                </div>

                {/* Skills */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap size={12} /> 已习得技能
                    </h3>
                    {playerSkills.length > 0 ? (
                        <div className="space-y-3">
                            {playerSkills.map(skill => (
                                <div key={skill.id} className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-indigo-300">{skill.name}</span>
                                        {/* Since items are private, we don't explicitly say "From Dagger", but we show the skill exists */}
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">{skill.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-600 italic border border-dashed border-zinc-800 rounded p-3 text-center">
                            暂无特殊技能
                        </div>
                    )}
                </div>

                {/* Passive Buffs */}
                {player.buffs.length > 0 && (
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ShieldAlert size={12} /> 状态效果
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {player.buffs.map((buff, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-emerald-900/10 text-emerald-400 border border-emerald-900/30 rounded">
                                    {buff}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Inventory Privacy Notice */}
                <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-zinc-600">
                    <Lock size={12} />
                    <span className="text-[10px] font-mono uppercase">背包内容不可见</span>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PlayerInspectionModal;

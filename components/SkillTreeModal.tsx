
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Brain, Shield, Wind, Zap, Book, Heart, Cross, Moon } from 'lucide-react';
import { SKILL_TREES } from '../data/skillTrees';
import { SkillNode } from '../types';

const SkillTreeModal: React.FC = () => {
  const { isSkillTreeOpen, toggleSkillTree, players, activePlayerId, unlockSkillNode } = useGameStore();
  const player = players[activePlayerId];

  if (!isSkillTreeOpen || !player) return null;

  const getIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'Wind': return <Wind size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'Shield': return <Shield size={size} />;
      case 'Heart': return <Heart size={size} />;
      case 'Book': return <Book size={size} />;
      case 'Moon': return <Moon size={size} />;
      case 'Cross': return <Cross size={size} />;
      default: return <Brain size={size} />;
    }
  };

  const renderNode = (node: SkillNode, treeNodes: SkillNode[]) => {
    const isUnlocked = player.unlockedSkillNodes.includes(node.id);
    const parentUnlocked = !node.prerequisites || node.prerequisites.every(pid => player.unlockedSkillNodes.includes(pid));
    const hasTrait = !node.requiredTrait || player.character.traits.includes(node.requiredTrait);
    const canUnlock = !isUnlocked && parentUnlocked && hasTrait && player.skillPoints >= node.cost;

    // Node Visuals
    let borderColor = 'border-zinc-700';
    let bgColor = 'bg-zinc-900';
    let textColor = 'text-zinc-500';

    if (isUnlocked) {
        borderColor = 'border-indigo-500';
        bgColor = 'bg-indigo-900/30';
        textColor = 'text-indigo-400';
    } else if (canUnlock) {
        borderColor = 'border-emerald-500';
        bgColor = 'bg-zinc-800';
        textColor = 'text-zinc-200';
    } else if (!parentUnlocked) {
        bgColor = 'bg-black/50';
    }

    return (
      <div 
        key={node.id} 
        className="relative flex flex-col items-center group"
        style={{ 
            gridRow: node.position.row + 1, 
            gridColumn: node.position.col + 1 
        }}
      >
        {/* Connection Lines (Simplistic Vertical) */}
        {node.prerequisites && node.prerequisites.map(pid => {
            const parent = treeNodes.find(n => n.id === pid);
            if (!parent) return null;
            // Only drawing vertical simplified connections for this grid layout
            // In a complex layout, SVG lines would be better
            return (
                <div 
                    key={`line-${pid}-${node.id}`} 
                    className={`absolute w-0.5 bg-zinc-800 -z-10`}
                    style={{ 
                        height: '40px', 
                        top: '-40px',
                        left: '50%',
                        backgroundColor: player.unlockedSkillNodes.includes(pid) ? '#4f46e5' : '#27272a'
                    }} 
                />
            );
        })}

        <button
            onClick={() => canUnlock && unlockSkillNode(node.id)}
            disabled={!canUnlock && !isUnlocked}
            className={`
                w-16 h-16 rounded-full border-2 flex items-center justify-center relative transition-all shadow-xl
                ${borderColor} ${bgColor} ${canUnlock ? 'hover:scale-110 hover:border-white cursor-pointer' : 'cursor-default'}
            `}
        >
            {isUnlocked ? (
                <Check size={24} className="text-indigo-400" />
            ) : !parentUnlocked ? (
                <Lock size={20} className="text-zinc-600" />
            ) : (
                <div className={textColor}>{getIcon(node.icon)}</div>
            )}

            {/* Trait Requirement Badge */}
            {node.requiredTrait && !hasTrait && (
                <div className="absolute -top-2 -right-2 bg-red-900 text-red-200 text-[9px] px-1.5 py-0.5 rounded border border-red-500 font-bold uppercase whitespace-nowrap z-20">
                    需 {node.requiredTrait}
                </div>
            )}
            
            {/* Cost Badge */}
            {!isUnlocked && (
                <div className={`absolute -bottom-2 bg-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded border ${canUnlock ? 'text-emerald-400 border-emerald-900' : 'text-zinc-600 border-zinc-800'}`}>
                    {node.cost} SP
                </div>
            )}
        </button>

        {/* Tooltipish Info */}
        <div className="mt-2 text-center max-w-[120px]">
            <div className={`text-xs font-bold ${isUnlocked ? 'text-indigo-300' : 'text-zinc-400'}`}>{node.name}</div>
            <div className="text-[9px] text-zinc-600 leading-tight mt-1">{node.description}</div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={toggleSkillTree}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 30 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.9, y: 30 }} 
          className="w-full max-w-5xl h-[80vh] bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div>
                <h2 className="text-2xl font-serif-display text-white flex items-center gap-3">
                    <Brain size={24} className="text-indigo-500" />
                    神经突触网络
                </h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">解锁基于特质与经历的潜能</p>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">可用点数</span>
                    <span className="text-3xl font-bold text-emerald-400">{player.skillPoints} <span className="text-sm text-zinc-600">SP</span></span>
                </div>
                <button onClick={toggleSkillTree} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
            <div className="flex gap-12 min-w-max pb-8">
                {SKILL_TREES.map(tree => (
                    <div key={tree.id} className="w-[300px] flex flex-col">
                        <div className="mb-8 text-center">
                            <h3 className="text-lg font-bold text-zinc-200 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">{tree.name}</h3>
                            <p className="text-xs text-zinc-500 italic h-8">{tree.description}</p>
                        </div>
                        
                        {/* Grid Layout for Nodes */}
                        <div className="grid grid-cols-3 gap-y-12 gap-x-4">
                            {tree.nodes.map(node => renderNode(node, tree.nodes))}
                        </div>
                    </div>
                ))}
            </div>
          </div>
          
          <div className="p-4 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-mono uppercase">
             系统提示: 每经过 3 个回合将自动获得 1 点技能点 (SP)。
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SkillTreeModal;

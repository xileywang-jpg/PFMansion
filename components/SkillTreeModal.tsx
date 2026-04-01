
import React, { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Brain, Shield, Wind, Zap, Book, Heart, Cross, Moon, MousePointerClick, ChevronRight } from 'lucide-react';
import { SKILL_TREES } from '../data/source/skillTrees';
import { SkillNode } from '../types';

const SkillTreeModal: React.FC = () => {
    const { ui, toggleSkillTree, players, activePlayerId, unlockSkillNode } = useGameStore();
  const player = players[activePlayerId];
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(() => {
     if (!selectedNodeId) return null;
     for(const tree of SKILL_TREES) {
         const found = tree.nodes.find(n => n.id === selectedNodeId);
         if(found) return found;
     }
     return null;
  }, [selectedNodeId]);

    if (!ui.isSkillTreeOpen || !player) return null;

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
  
  // Unlock logic check helper
  const checkUnlockStatus = (node: SkillNode) => {
    const isUnlocked = player.unlockedSkillNodes.includes(node.id);
    const parentUnlocked = !node.prerequisites || node.prerequisites.every(pid => player.unlockedSkillNodes.includes(pid));
    const hasTrait = !node.requiredTrait || player.character.traits.includes(node.requiredTrait);
    const hasPoints = player.skillPoints >= node.cost;
    
    return { isUnlocked, parentUnlocked, hasTrait, hasPoints, canUnlock: !isUnlocked && parentUnlocked && hasTrait && hasPoints };
  };

  const renderNode = (node: SkillNode, treeNodes: SkillNode[]) => {
    const { isUnlocked, parentUnlocked, canUnlock } = checkUnlockStatus(node);
    const isSelected = selectedNodeId === node.id;

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
    
    if (isSelected) {
        // Highlight selected node
        borderColor = isUnlocked ? 'border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : canUnlock ? 'border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]';
    }

    return (
      <div 
        key={node.id} 
        className="relative flex flex-col items-center group z-10"
        style={{ 
            gridRow: node.position.row + 1, 
            gridColumn: node.position.col + 1 
        }}
      >
        {/* Connection Lines */}
        {node.prerequisites && node.prerequisites.map(pid => {
            const parent = treeNodes.find(n => n.id === pid);
            if (!parent) return null;
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
            onClick={() => setSelectedNodeId(node.id)}
            className={`
                w-16 h-16 rounded-full border-2 flex items-center justify-center relative transition-all shadow-xl
                ${borderColor} ${bgColor} hover:scale-110 cursor-pointer
                ${isSelected ? 'scale-110 ring-2 ring-black' : ''}
            `}
        >
            {isUnlocked ? (
                <Check size={24} className="text-indigo-400" />
            ) : !parentUnlocked ? (
                <Lock size={20} className="text-zinc-600" />
            ) : (
                <div className={textColor}>{getIcon(node.icon)}</div>
            )}
            
            {/* Simple Cost Badge */}
            {!isUnlocked && (
                <div className={`absolute -bottom-2 bg-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded border ${canUnlock ? 'text-emerald-400 border-emerald-900' : 'text-zinc-600 border-zinc-800'}`}>
                    {node.cost} SP
                </div>
            )}
        </button>
        
        <div className="mt-2 text-center max-w-[120px]">
            <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : isUnlocked ? 'text-indigo-300' : 'text-zinc-400'}`}>{node.name}</div>
        </div>
      </div>
    );
  };
  
  // Render details panel content
  const renderDetails = () => {
      if (!selectedNode) {
          return (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center opacity-50">
                      <MousePointerClick size={32} />
                  </div>
                  <p className="text-sm italic">点击左侧节点查看详情</p>
              </div>
          );
      }
      
      const { isUnlocked, parentUnlocked, hasTrait, hasPoints, canUnlock } = checkUnlockStatus(selectedNode);
      
      return (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 shadow-lg ${isUnlocked ? 'bg-indigo-900/20 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-600 text-zinc-200'}`}>
                      {getIcon(selectedNode.icon, 32)}
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-white leading-none mb-2">{selectedNode.name}</h3>
                      <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${isUnlocked ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                          {isUnlocked ? '已解锁' : '未解锁'}
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                      <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2"><Book size={10} /> 技能描述</h4>
                      <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded border border-zinc-800">
                          {selectedNode.description}
                      </p>
                  </div>
                  
                  {/* Unlocks Preview */}
                  {(selectedNode.grantsSkillId || selectedNode.grantsBuff) && (
                      <div>
                          <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2"><Zap size={10} /> 解锁奖励</h4>
                          <div className="space-y-2">
                              {selectedNode.grantsSkillId && (
                                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-900/10 p-2 rounded border border-emerald-900/30">
                                      <Zap size={14} className="shrink-0" /> 
                                      <span>获得主动技能</span>
                                  </div>
                              )}
                              {selectedNode.grantsBuff && (
                                  <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-900/10 p-2 rounded border border-emerald-900/30">
                                      <Shield size={14} className="shrink-0" /> 
                                      <span>{selectedNode.grantsBuff}</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {!isUnlocked && (
                      <div>
                          <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2"><Lock size={10} /> 解锁条件</h4>
                          <div className="space-y-2">
                              {/* Cost */}
                              <div className={`flex items-center justify-between text-xs p-2 rounded border ${hasPoints ? 'bg-emerald-900/10 text-emerald-400 border-emerald-900/30' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}>
                                  <span>技能点 (SP)</span>
                                  <span className="font-bold">{player.skillPoints} / {selectedNode.cost}</span>
                              </div>
                              
                              {/* Parent Nodes */}
                              {selectedNode.prerequisites && selectedNode.prerequisites.length > 0 && (
                                  <div className={`flex items-center justify-between text-xs p-2 rounded border ${parentUnlocked ? 'bg-emerald-900/10 text-emerald-400 border-emerald-900/30' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}>
                                      <span>前置技能</span>
                                      <span className="font-bold">{parentUnlocked ? '已满足' : '未满足'}</span>
                                  </div>
                              )}
                              
                              {/* Trait */}
                              {selectedNode.requiredTrait && (
                                  <div className={`flex items-center justify-between text-xs p-2 rounded border ${hasTrait ? 'bg-emerald-900/10 text-emerald-400 border-emerald-900/30' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}>
                                      <span>特质: {selectedNode.requiredTrait}</span>
                                      <span className="font-bold">{hasTrait ? '符合' : '不符'}</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
              
              <div className="pt-6 mt-4 border-t border-zinc-800">
                  {isUnlocked ? (
                      <button disabled className="w-full py-3 bg-zinc-800 text-zinc-500 font-bold uppercase tracking-widest rounded cursor-not-allowed flex items-center justify-center gap-2">
                          <Check size={18} /> 已掌握
                      </button>
                  ) : (
                      <button 
                          onClick={() => unlockSkillNode(selectedNode.id)}
                          disabled={!canUnlock}
                          className={`w-full py-3 font-bold uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-all ${
                              canUnlock 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                      >
                          {canUnlock ? '确认解锁' : '条件未满足'}
                          {canUnlock && <ChevronRight size={18} />}
                      </button>
                  )}
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
          initial={{ scale: 0.95, y: 20 }} 
          animate={{ scale: 1, y: 0 }} 
          exit={{ scale: 0.95, y: 20 }} 
          className="w-full max-w-6xl h-[85vh] bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
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

          {/* Body Split View */}
          <div className="flex-1 flex overflow-hidden">
             {/* Left: Trees Grid */}
             <div className="flex-1 overflow-x-auto overflow-y-auto p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5 relative">
                <div className="flex gap-16 min-w-max pb-8">
                    {SKILL_TREES.map(tree => (
                        <div key={tree.id} className="w-[300px] flex flex-col">
                            <div className="mb-10 text-center">
                                <h3 className="text-lg font-bold text-zinc-200 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">{tree.name}</h3>
                                <p className="text-xs text-zinc-500 italic h-8">{tree.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-y-16 gap-x-6">
                                {tree.nodes.map(node => renderNode(node, tree.nodes))}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
             
             {/* Right: Details Panel */}
             <div className="w-80 bg-zinc-900/80 border-l border-zinc-800 p-6 flex-shrink-0 backdrop-blur-xl">
                {renderDetails()}
             </div>
          </div>
          
          <div className="p-3 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-600 text-center font-mono uppercase">
             系统提示: 每经过 3 个回合将自动获得 1 点技能点 (SP)。
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SkillTreeModal;

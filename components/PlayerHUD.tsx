
import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AttributeName, GamePhase } from '../types';
import { PLAYER_COLORS } from '../constants';
import { Brain, Zap, Dumbbell, Eye, Skull, Backpack, Gem, Crosshair, Syringe, User, Ghost, Users, ShieldAlert, Target, Sparkles, ChevronDown, ChevronUp, History, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SKILLS_DB } from '../data/skills';

const AttributeRow: React.FC<{ label: string, current: number, max: number, icon: any, isDead: boolean }> = ({ label, current, max, icon: Icon, isDead }) => {
    return (
      <div className="flex items-center gap-3 mb-3 group">
        <div className={`p-2 rounded-md border transition-colors ${isDead ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-800 border-zinc-700 group-hover:border-zinc-500'}`}>
          <Icon size={16} className={isDead ? 'text-zinc-700' : 'text-zinc-400'} />
        </div>
        <div className="flex-1">
            <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500 mb-1">
                <span className={isDead ? 'text-zinc-700' : ''}>{label}</span>
                <span className={`font-bold flex items-center gap-1 ${isDead ? 'text-zinc-800' : 'text-zinc-300'}`}>
                    {current}
                </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                <div 
                    className={`h-full absolute top-0 left-0 transition-all duration-500 ${isDead ? 'bg-zinc-800' : 'bg-zinc-400'}`} 
                    style={{ width: `${(current / max) * 100}%` }} 
                />
            </div>
        </div>
      </div>
    );
};

const PlayerHUD: React.FC = () => {
  const { players, playerIds, activePlayerId, logs, toggleInventory, toggleInteractionModal, phase, currentScenario, executeLogicAction, toggleSkillTree, getEffectiveAttributeValue, openInspection } = useGameStore();
  const player = players[activePlayerId];
  const [isObjectiveExpanded, setIsObjectiveExpanded] = useState(false);
  const [logTab, setLogTab] = useState<'global' | 'personal'>('global');

  const otherPlayersInRoom = useMemo(() => {
    if (!player) return [];
    return Object.values(players).filter(p => 
      p.id !== activePlayerId && 
      !p.isDead && 
      p.position.x === player.position.x && 
      p.position.y === player.position.y
    );
  }, [players, player, activePlayerId]);

  const availableSkills = useMemo(() => {
    if (!player) return [];
    
    // Skills from items
    const itemSkills = player.items.flatMap(item => item.grantedSkills || []);
    
    // Skills from character (intrinsic/acquired)
    const characterSkills = player.character.initialSkills || [];
    const acquiredSkills = player.skills || [];

    const allSkillIds = Array.from(new Set([...itemSkills, ...characterSkills, ...acquiredSkills]));
    return allSkillIds.map(id => SKILLS_DB[id]).filter(Boolean);
  }, [player]);

  if (!player) return null;

  const playerColor = PLAYER_COLORS[playerIds.indexOf(activePlayerId)];
  const isHauntPhase = phase === GamePhase.Haunt;
  const isTraitor = player.team === 'TRAITOR';
  
  const activeLogs = logTab === 'global' ? logs : player.personalLogs || [];

  return (
    <div className="w-80 h-full bg-zinc-950/90 border-l border-zinc-800 flex flex-col backdrop-blur-sm z-30 shadow-2xl overflow-hidden">
      <div className={`p-6 border-b border-zinc-800 relative overflow-hidden ${player.isDead ? 'opacity-50' : ''}`}>
        {player.isDead && (
            <div className="absolute top-0 right-0 p-2 text-red-900/20 rotate-12">
                <Skull size={100} />
            </div>
        )}
        
        <div className="flex items-center gap-4 mb-4 relative z-10">
            {/* 头像 - 点击打开角色详情 */}
            <div 
                className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg 
                    transition-all cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]
                    ${player.isDead 
                        ? 'grayscale border-zinc-800 bg-zinc-900 cursor-default hover:scale-100 hover:shadow-lg' 
                        : ''
                    }
                `}
                style={{ 
                    borderColor: !player.isDead ? playerColor : undefined, 
                    backgroundColor: !player.isDead ? `${playerColor}20` : undefined 
                }}
                onClick={() => !player.isDead && openInspection(activePlayerId)}
                title={player.isDead ? '已阵亡' : '点击查看角色详情'}
            >
                {player.isDead ? <Skull size={24} className="text-zinc-600" /> : <User style={{ color: playerColor }} />}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-0.5">
                    <h2 className={`text-xl font-serif-display leading-none truncate ${player.isDead ? 'text-zinc-600 line-through' : 'text-zinc-100'}`}>
                        {player.character.name}
                    </h2>
                    {player.isDead && <span className="text-[10px] bg-red-900/20 text-red-600 border border-red-900/50 px-1 rounded uppercase font-bold shrink-0">阵亡</span>}
                </div>
                
                {/* Team Badge */}
                {isHauntPhase && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border ${isTraitor ? 'bg-red-900/20 text-red-500 border-red-500/30' : 'bg-indigo-900/20 text-indigo-400 border-indigo-500/30'}`}>
                    {isTraitor ? <Skull size={10} /> : <ShieldAlert size={10} />}
                    {isTraitor ? '叛徒' : '英雄'}
                  </div>
                )}
            </div>
        </div>
        <p className="text-xs text-zinc-500 italic leading-relaxed relative z-10">{player.character.description}</p>
        
        {/* Traits Badges */}
        <div className="flex flex-wrap gap-1 mt-3 relative z-10">
            {player.character.traits?.map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[9px] font-bold uppercase">{t}</span>
            ))}
        </div>
      </div>

      {/* Scenario Objective Area (Collapsible for hot-seat privacy) */}
      {isHauntPhase && currentScenario && (
        <div className={`border-b transition-all ${isTraitor ? 'bg-red-950/10 border-red-900/30' : 'bg-indigo-950/10 border-indigo-900/30'}`}>
          <button 
            onClick={() => setIsObjectiveExpanded(!isObjectiveExpanded)}
            className="w-full flex items-center justify-between p-4"
          >
            <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 ${isTraitor ? 'text-red-500' : 'text-indigo-400'}`}>
              <Target size={12} />
              剧本任务
            </h3>
            {isObjectiveExpanded ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
          </button>
          
          <AnimatePresence>
            {isObjectiveExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-3">
                   <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter mb-1">
                     剧本: {currentScenario.name}
                   </div>
                   <p className="text-xs text-zinc-200 font-bold leading-snug">
                     {isTraitor ? currentScenario.traitorInfo.objective : currentScenario.heroInfo.objective}
                   </p>
                   <div className="h-px w-full bg-zinc-800/50" />
                   <div className="text-[10px] text-zinc-400 italic">
                     {isTraitor ? currentScenario.traitorInfo.setupText : currentScenario.heroInfo.setupText}
                   </div>
                   
                   {isTraitor && currentScenario.traitorInfo.abilities && (
                     <div className="mt-3 flex flex-wrap gap-1">
                       {currentScenario.traitorInfo.abilities.map((ability, idx) => (
                         <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/40 text-red-200 border border-red-500/20 rounded-sm text-[9px]">
                           <Sparkles size={8} /> {ability}
                         </span>
                       ))}
                     </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Skills Section */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/20">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} /> 技能序列
            </h3>
            <button 
                onClick={toggleSkillTree}
                disabled={player.isDead}
                className="text-[9px] px-2 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50 rounded font-bold uppercase transition-all"
            >
                技能树 ({player.skillPoints} SP)
            </button>
        </div>
        <div className="space-y-2">
            {availableSkills.length > 0 ? (
                availableSkills.map((skill) => (
                    <button 
                        key={skill.id}
                        onClick={() => executeLogicAction(skill)}
                        disabled={player.isDead}
                        className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-indigo-500 hover:bg-indigo-900/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-md group-hover:bg-indigo-900/40">
                            <Zap size={16} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-xs font-bold text-zinc-200">{skill.name}</div>
                            <div className="text-[9px] text-zinc-500 uppercase truncate max-w-[150px]">{skill.description}</div>
                        </div>
                    </button>
                ))
            ) : (
                <div className="text-[10px] text-zinc-600 italic text-center py-2 border border-dashed border-zinc-800 rounded">
                    暂无可用的主动技能
                </div>
            )}
            
            {/* Show Passive Buffs from Tree */}
            {player.buffs.filter(b => b.includes('+') || b.includes('免疫') || b.includes('减免')).length > 0 && (
                 <div className="mt-2 pt-2 border-t border-zinc-800/50">
                    <span className="text-[9px] text-zinc-600 font-bold uppercase block mb-1">被动效果生效中</span>
                    <div className="flex flex-wrap gap-1">
                        {player.buffs.map((buff, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-800/80 text-zinc-400 rounded border border-zinc-700/50">{buff}</span>
                        ))}
                    </div>
                 </div>
            )}
        </div>
      </div>

      <div className="p-6 border-b border-zinc-800">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">角色属性</h3>
            
            {/* Interaction Button */}
            {!player.isDead && otherPlayersInRoom.length > 0 && (
                <button 
                  onClick={toggleInteractionModal}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-bold uppercase transition-all shadow-lg animate-pulse"
                >
                  <Users size={12} />
                  交互
                </button>
            )}
        </div>
        
        <AttributeRow 
            label="力量" 
            current={player.character.attributes[AttributeName.Might].current} 
            max={8} 
            icon={Dumbbell} 
            isDead={player.isDead} 
        />
        <AttributeRow 
            label="速度" 
            current={player.character.attributes[AttributeName.Speed].current} 
            max={8} 
            icon={Zap} 
            isDead={player.isDead} 
        />
        <AttributeRow 
            label="理智" 
            current={player.character.attributes[AttributeName.Sanity].current} 
            max={8} 
            icon={Brain} 
            isDead={player.isDead} 
        />
        <AttributeRow 
            label="知识" 
            current={player.character.attributes[AttributeName.Knowledge].current} 
            max={8} 
            icon={Eye} 
            isDead={player.isDead} 
        />
      </div>

      <div className="p-4 bg-zinc-900/30 border-b border-zinc-800 min-h-[120px]">
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Backpack size={12} /> 随身道具
            </h3>
            <button 
                onClick={toggleInventory}
                disabled={player.isDead}
                className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors ${player.isDead ? 'text-zinc-700 border-zinc-800 bg-zinc-900 cursor-not-allowed' : 'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border-indigo-900/50'}`}
            >
                打开背包
            </button>
        </div>
        
        {player.items.length === 0 ? (
            <div className="text-xs text-zinc-600 italic text-center py-4 border border-dashed border-zinc-800 rounded">
                背包空空如也
            </div>
        ) : (
            <div className="space-y-2">
                {player.items.slice(0, 3).map((item, idx) => {
                    let Icon = Gem;
                    if(item.type === 'WEAPON') Icon = Crosshair;
                    if(item.type === 'CONSUMABLE') Icon = Syringe;
                    if(item.type === 'OMEN') Icon = Skull;
                    return (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded group hover:border-zinc-600 transition-colors">
                            <div className={`p-1.5 rounded ${item.type === 'OMEN' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-indigo-900/20 text-indigo-400'}`}>
                                <Icon size={14} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-xs font-bold text-zinc-300 truncate">{item.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate">{item.type === 'OMEN' ? '预兆' : item.type === 'WEAPON' ? '武器' : '物品'}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-2 bg-zinc-900/50 border-b border-zinc-800 flex gap-2">
            <button 
                onClick={() => setLogTab('global')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${logTab === 'global' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <Radio size={12} /> 全球叙事
                </div>
            </button>
            <button 
                onClick={() => setLogTab('personal')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${logTab === 'personal' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <History size={12} /> 个人履历
                </div>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeLogs.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs italic">暂无记录</div>
          ) : (
              activeLogs.map((log) => (
                <div key={log.id} className={`text-sm leading-relaxed ${
                    log.type === 'narrative' ? 'text-indigo-200 font-serif-display italic opacity-90' :
                    log.type === 'alert' ? 'text-red-400' :
                    log.type === 'success' ? 'text-emerald-400' :
                    'text-zinc-400'
                }`}>
                  <span className="opacity-50 text-[10px] mr-2 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit'})}
                  </span>
                  {log.text}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;

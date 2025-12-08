
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { AttributeName } from '../types';
import { Brain, Zap, Dumbbell, Eye, Skull, Backpack, Gem, Crosshair, Syringe } from 'lucide-react';

const AttributeRow: React.FC<{ label: string, value: number, max: number, icon: any }> = ({ label, value, max, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-3 group">
    <div className="p-2 bg-zinc-800 rounded-md border border-zinc-700 group-hover:border-zinc-500 transition-colors">
      <Icon size={16} className="text-zinc-400" />
    </div>
    <div className="flex-1">
        <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500 mb-1">
            <span>{label}</span>
            <span className="text-zinc-300 font-bold">{value}</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
                className="h-full bg-zinc-400 transition-all duration-500" 
                style={{ width: `${(value / 8) * 100}%` }} 
            />
        </div>
    </div>
  </div>
);

const PlayerHUD: React.FC = () => {
  const { players, currentPlayerIndex, logs, toggleInventory } = useGameStore();
  const player = players[currentPlayerIndex];

  if (!player) return null;

  return (
    <div className="w-80 h-full bg-zinc-950/90 border-l border-zinc-800 flex flex-col backdrop-blur-sm z-30 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-2xl font-serif-display text-zinc-100">{player.character.name}</h2>
        <p className="text-xs text-zinc-500 mt-1 italic leading-relaxed">{player.character.description}</p>
        
        <div className="mt-4 flex gap-2">
            {player.character.traits.map(trait => (
                <span key={trait} className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] uppercase tracking-wider text-zinc-400">
                    {trait}
                </span>
            ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Attributes</h3>
        </div>
        
        <AttributeRow 
            label="Might" 
            value={player.character.attributes[AttributeName.Might].current} 
            max={8}
            icon={Dumbbell} 
        />
        <AttributeRow 
            label="Speed" 
            value={player.character.attributes[AttributeName.Speed].current} 
            max={8}
            icon={Zap} 
        />
        <AttributeRow 
            label="Sanity" 
            value={player.character.attributes[AttributeName.Sanity].current} 
            max={8}
            icon={Brain} 
        />
        <AttributeRow 
            label="Knowledge" 
            value={player.character.attributes[AttributeName.Knowledge].current} 
            max={8}
            icon={Eye} 
        />
      </div>

      {/* Inventory */}
      <div className="p-4 bg-zinc-900/30 border-b border-zinc-800 min-h-[120px]">
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Backpack size={12} /> Inventory
            </h3>
            <button 
                onClick={toggleInventory}
                className="text-[10px] uppercase font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-900/50 transition-colors"
            >
                Open Bag
            </button>
        </div>
        
        {player.items.length === 0 ? (
            <div className="text-xs text-zinc-600 italic text-center py-4 border border-dashed border-zinc-800 rounded">
                Empty
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
                                <div className="text-[10px] text-zinc-500 truncate">{item.type}</div>
                            </div>
                        </div>
                    );
                })}
                {player.items.length > 3 && (
                    <div className="text-[10px] text-zinc-500 text-center pt-1 italic">
                        + {player.items.length - 3} more
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Game Log */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 bg-zinc-900/50 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Skull size={12} /> Narrative Log
            </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className={`text-sm leading-relaxed ${
                log.type === 'narrative' ? 'text-indigo-200 font-serif-display italic opacity-90' :
                log.type === 'alert' ? 'text-red-400' :
                log.type === 'success' ? 'text-emerald-400' :
                'text-zinc-400'
            }`}>
              {log.type === 'narrative' && <span className="block w-full h-px bg-indigo-900/30 my-2"></span>}
              <span className="opacity-50 text-[10px] mr-2 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit'})}
              </span>
              {log.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerHUD;

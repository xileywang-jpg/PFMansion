
import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import MapGrid from './components/MapGrid';
import PlayerHUD from './components/PlayerHUD';
import CardResolutionModal from './components/EventModal';
import TurnControl from './components/TurnControl';
import TileInspector from './components/TileInspector';
import HauntRollModal from './components/HauntRollModal';
import HauntReveal from './components/HauntReveal';
import InventoryModal from './components/InventoryModal';
import InteractionModal from './components/InteractionModal';
import CombatResolution from './components/CombatResolution';
import DiceRoller from './components/DiceRoller';
import FeedbackToast from './components/FeedbackToast';
import SkillTreeModal from './components/SkillTreeModal';
import PlayerInspectionModal from './components/PlayerInspectionModal';
import { Bug, Skull } from 'lucide-react';

const App: React.FC = () => {
  const { initializeGame, debugForceHaunt, isHauntActive, omenCount } = useGameStore();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="flex w-screen h-screen bg-black text-zinc-200 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Main Map Viewport */}
      <div className="flex-1 relative z-10">
        <div className="absolute top-6 left-6 z-20 pointer-events-none flex flex-col items-start gap-2">
            <div>
                <h1 className="text-3xl font-serif-display text-white tracking-tighter opacity-80">
                    MANSION <span className="text-indigo-500">PROTOCOL</span>
                </h1>
                <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">
                        Sector 4 // {isHauntActive ? 'Haunt Phase' : 'Exploration Phase'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Omen Counter Widget */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 border border-zinc-800 rounded text-[10px] text-zinc-400 uppercase tracking-widest shadow-lg backdrop-blur-sm" title="当前揭示的预兆数量">
                    <Skull size={14} className={omenCount > 0 ? "text-indigo-500" : "text-zinc-600"} />
                    <span className="text-zinc-600">Omens:</span>
                    <span className={`font-bold text-sm ${omenCount > 0 ? "text-indigo-400" : "text-zinc-500"}`}>{omenCount}</span> 
                </div>

                {!isHauntActive && (
                    <button 
                      onClick={debugForceHaunt}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-500 border border-indigo-900/30 rounded text-[9px] font-bold uppercase transition-all"
                      title="强制进入作祟模式"
                    >
                      <Bug size={12} />
                      调试: 触发作祟
                    </button>
                )}
            </div>
        </div>
        
        <MapGrid />
        
        {/* Floating UI Elements */}
        <TileInspector />
        <TurnControl />
        <FeedbackToast />
      </div>

      {/* Right Sidebar */}
      <PlayerHUD />

      {/* Overlays */}
      <CardResolutionModal />
      <HauntRollModal />
      <HauntReveal />
      <InventoryModal />
      <InteractionModal />
      <SkillTreeModal />
      <PlayerInspectionModal />
      <CombatResolution />
      <DiceRoller />

      {/* Scanline Effect (Atmosphere) */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default App;

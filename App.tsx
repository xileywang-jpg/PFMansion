
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
import DiceRoller from './components/DiceRoller';

const App: React.FC = () => {
  const { initializeGame } = useGameStore();

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="flex w-screen h-screen bg-black text-zinc-200 overflow-hidden selection:bg-indigo-500/30">
      
      {/* Main Map Viewport */}
      <div className="flex-1 relative z-10">
        <div className="absolute top-6 left-6 z-20 pointer-events-none">
            <h1 className="text-3xl font-serif-display text-white tracking-tighter opacity-80">
                MANSION <span className="text-indigo-500">PROTOCOL</span>
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] mt-1">
                Sector 4 // Exploration Phase
            </p>
        </div>
        
        <MapGrid />
        
        {/* Floating UI Elements */}
        <TileInspector />
        <TurnControl />
      </div>

      {/* Right Sidebar */}
      <PlayerHUD />

      {/* Overlays */}
      <CardResolutionModal />
      <HauntRollModal />
      <HauntReveal />
      <InventoryModal />
      <DiceRoller />

      {/* Scanline Effect (Atmosphere) */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default App;

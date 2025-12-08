import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import TileCard from './TileCard';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Check, X } from 'lucide-react';
import { Direction, TileInstance } from '../types';

const TILE_SIZE = 140;

const MapGrid: React.FC = () => {
  const { 
    map, players, currentPlayerIndex, movePlayer, activeCard,
    pendingTile, pendingTargetPosition, pendingTileRotation, rotatePendingTile, confirmTilePlacement, isPlacementValid,
    setHoveredTileId
  } = useGameStore();

  const currentPlayer = players[currentPlayerIndex];

  // Keyboard Shortcuts for Placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingTile) {
        if (e.key.toLowerCase() === 'r') rotatePendingTile();
        if (e.key === 'Enter' || e.key === ' ') {
            if (isPlacementValid()) confirmTilePlacement();
        }
      } else if (!activeCard) {
          // Optional: WASD movement?
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingTile, rotatePendingTile, confirmTilePlacement, isPlacementValid, activeCard]);

  // Derived state for Ghost Tile
  const ghostTileInstance: TileInstance | null = useMemo(() => {
    if (!pendingTile || !pendingTargetPosition) return null;
    
    // We need to calculate openings for the visual representation
    // This duplicates logic slightly from store, but keeps visualization responsive
    const rotationSteps = pendingTileRotation / 90;
    const dirs = [Direction.North, Direction.East, Direction.South, Direction.West];
    const rotatedOpenings = pendingTile.openings.map(dir => {
        const currentIndex = dirs.indexOf(dir);
        const newIndex = (currentIndex + rotationSteps) % 4;
        return dirs[newIndex];
    });

    return {
        instanceId: 'ghost',
        defId: pendingTile.id,
        x: pendingTargetPosition.x,
        y: pendingTargetPosition.y,
        rotation: pendingTileRotation,
        openings: rotatedOpenings,
        hasEventTriggered: false
    };
  }, [pendingTile, pendingTargetPosition, pendingTileRotation]);

  const isValid = isPlacementValid();

  if (!currentPlayer) {
    return (
        <div className="relative w-full h-full bg-[#0c0c0e] overflow-hidden flex items-center justify-center">
            <div className="text-zinc-500 text-xs tracking-widest uppercase animate-pulse">Initializing Protocol...</div>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0c0c0e] overflow-hidden flex items-center justify-center">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Map Container */}
      <div 
        className="relative transition-transform duration-500 ease-in-out"
        style={{
          width: 0, 
          height: 0,
          transform: `translate(${-currentPlayer.position.x * TILE_SIZE}px, ${-currentPlayer.position.y * TILE_SIZE}px)`
        }}
      >
        {/* Placed Tiles */}
        {Object.values(map).map((tile: TileInstance) => {
          const isPlayerHere = currentPlayer.position.x === tile.x && currentPlayer.position.y === tile.y;
          const key = `${tile.x},${tile.y}`;
          
          return (
            <div
              key={tile.instanceId}
              className="absolute transition-all duration-500"
              style={{
                left: tile.x * TILE_SIZE,
                top: tile.y * TILE_SIZE,
                width: 128,
                height: 128
              }}
              onMouseEnter={() => setHoveredTileId(key)}
              onMouseLeave={() => setHoveredTileId(null)}
            >
              <TileCard 
                tile={tile} 
                isActive={isPlayerHere} 
                hasPlayer={isPlayerHere}
              />
            </div>
          );
        })}

        {/* Ghost Tile (Placement Mode) */}
        {ghostTileInstance && (
            <div
                className={`absolute transition-all duration-200 z-50`}
                style={{
                    left: ghostTileInstance.x * TILE_SIZE,
                    top: ghostTileInstance.y * TILE_SIZE,
                    width: 128,
                    height: 128
                }}
            >
                <div className={`
                    w-full h-full rounded-sm transition-all duration-300
                    ${isValid ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'ring-2 ring-red-500 ring-offset-2 ring-offset-black opacity-50 grayscale'}
                `}>
                    <TileCard 
                        tile={ghostTileInstance} 
                        isActive={false} 
                        hasPlayer={false}
                    />
                </div>
            </div>
        )}

        {/* Movement Controls (Hidden during placement) */}
        {!activeCard && !pendingTile && (
            <div 
            className="absolute z-20 w-32 h-32 pointer-events-none"
            style={{
                left: currentPlayer.position.x * TILE_SIZE,
                top: currentPlayer.position.y * TILE_SIZE,
            }}
            >
                <button onClick={() => movePlayer(Direction.North)} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto transition-colors border border-zinc-600">
                    <ArrowUp size={16} />
                </button>
                <button onClick={() => movePlayer(Direction.South)} className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto transition-colors border border-zinc-600">
                    <ArrowDown size={16} />
                </button>
                <button onClick={() => movePlayer(Direction.West)} className="absolute top-1/2 -left-12 -translate-y-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto transition-colors border border-zinc-600">
                    <ArrowLeft size={16} />
                </button>
                <button onClick={() => movePlayer(Direction.East)} className="absolute top-1/2 -right-12 -translate-y-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto transition-colors border border-zinc-600">
                    <ArrowRight size={16} />
                </button>
            </div>
        )}
      </div>

      {/* Placement Controls Overlay */}
      {pendingTile && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 p-3 rounded-lg border border-zinc-700 backdrop-blur shadow-2xl z-50">
            <div className="flex flex-col items-center mr-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Rotate</span>
                <button 
                    onClick={rotatePendingTile}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 border border-zinc-600 transition-colors"
                    title="Rotate (R)"
                >
                    <RotateCw size={20} />
                </button>
            </div>

            <div className="w-px h-10 bg-zinc-700 mx-2" />

            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">Confirm</span>
                <button 
                    onClick={confirmTilePlacement}
                    disabled={!isValid}
                    className={`
                        p-3 rounded border flex items-center gap-2 font-bold text-sm transition-all
                        ${isValid 
                            ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                            : 'bg-zinc-800 border-zinc-600 text-zinc-500 cursor-not-allowed'}
                    `}
                    title="Place (Space/Enter)"
                >
                    {isValid ? <Check size={20} /> : <X size={20} />}
                    <span>PLACE ROOM</span>
                </button>
            </div>
            
            {/* Context Helper */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-max text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded backdrop-blur">
                {isValid ? 'Placement Valid' : 'Doors must align'}
            </div>
        </div>
      )}
    </div>
  );
};

export default MapGrid;
import React from 'react';
import { motion } from 'framer-motion';
import { TileInstance, TileDef, Direction } from '../types';
import { TILE_DECK, STARTING_TILE } from '../constants';
import * as Icons from 'lucide-react';

interface TileCardProps {
  tile: TileInstance;
  isActive: boolean;
  hasPlayer: boolean;
}

const TileCard: React.FC<TileCardProps> = ({ tile, isActive, hasPlayer }) => {
  // Find definition
  const def = tile.defId === STARTING_TILE.id 
    ? STARTING_TILE 
    : TILE_DECK.find(t => t.id === tile.defId);

  if (!def) return null;

  const IconComponent = def.icon ? (Icons as any)[def.icon] : Icons.HelpCircle;

  // Door positioning helpers
  const getDoorClass = (dir: Direction) => {
    const isOpen = tile.openings.includes(dir);
    if (!isOpen) return 'hidden';
    
    switch(dir) {
      case Direction.North: return 'top-0 left-1/2 -translate-x-1/2 w-8 h-2';
      case Direction.South: return 'bottom-0 left-1/2 -translate-x-1/2 w-8 h-2';
      case Direction.West: return 'left-0 top-1/2 -translate-y-1/2 h-8 w-2';
      case Direction.East: return 'right-0 top-1/2 -translate-y-1/2 h-8 w-2';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative w-32 h-32 bg-zinc-900 border-2 
        ${isActive ? 'border-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-zinc-700'}
        ${hasPlayer ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}
        flex flex-col items-center justify-center text-center p-2 rounded-sm select-none
        transition-colors duration-300
      `}
    >
      {/* Doors */}
      <div className={`absolute bg-zinc-800 border-x border-zinc-600 ${getDoorClass(Direction.North)}`} />
      <div className={`absolute bg-zinc-800 border-x border-zinc-600 ${getDoorClass(Direction.South)}`} />
      <div className={`absolute bg-zinc-800 border-y border-zinc-600 ${getDoorClass(Direction.West)}`} />
      <div className={`absolute bg-zinc-800 border-y border-zinc-600 ${getDoorClass(Direction.East)}`} />

      {/* Content */}
      <div className="text-zinc-500 mb-1">
        {IconComponent && <IconComponent size={24} />}
      </div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 leading-tight">
        {def.name}
      </h3>
      
      {/* Player Token */}
      {hasPlayer && (
        <motion.div 
          layoutId="player-token"
          className="absolute w-6 h-6 bg-indigo-500 rounded-full border-2 border-white shadow-lg z-10"
        />
      )}
      
      {/* Event Indicator */}
      {def.eventTrigger && !tile.hasEventTriggered && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
      )}
    </motion.div>
  );
};

export default TileCard;
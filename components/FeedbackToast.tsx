
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Info, AlertTriangle, User, Skull } from 'lucide-react';
import { PLAYER_COLORS } from '../constants';

const FeedbackToast: React.FC = () => {
  const { ui, playerIds, activePlayerId } = useGameStore();
  const activeFeedback = ui.activeFeedback;

  if (activeFeedback?.type === 'turn' || activeFeedback?.type === 'death') {
    const isDeath = activeFeedback.type === 'death';
    const playerIndex = playerIds.indexOf(activePlayerId);
    const playerColor = isDeath ? '#ef4444' : PLAYER_COLORS[playerIndex];

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[300] flex items-center justify-center backdrop-blur-sm pointer-events-none ${isDeath ? 'bg-red-950/40' : 'bg-black/60'}`}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="flex flex-col items-center"
          >
            <div 
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${isDeath ? 'animate-pulse' : ''}`}
              style={{ borderColor: playerColor, backgroundColor: `${playerColor}20` }}
            >
              {isDeath ? <Skull size={40} className="text-red-500" /> : <User size={40} style={{ color: playerColor }} />}
            </div>
            <h1 className={`text-6xl font-serif-display font-bold tracking-widest text-center ${isDeath ? 'text-red-500 text-shadow-glow' : 'text-white'}`}>
              {activeFeedback.message}
            </h1>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5 }}
              className="h-1 mt-6 rounded-full"
              style={{ backgroundColor: playerColor }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {activeFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="fixed top-32 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
        >
          <div className={`
            flex items-center gap-3 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-md
            ${activeFeedback.type === 'error' ? 'bg-red-950/80 border-red-500/50 text-red-200' : 
              activeFeedback.type === 'warning' ? 'bg-amber-950/80 border-amber-500/50 text-amber-200' :
              'bg-zinc-900/90 border-zinc-700 text-zinc-100'}
          `}>
            {activeFeedback.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
            {activeFeedback.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
            {activeFeedback.type === 'info' && <Info size={18} className="text-indigo-400" />}
            
            <span className="text-sm font-bold tracking-wide">
              {activeFeedback.message}
            </span>

            {activeFeedback.type === 'error' && (
              <motion.div 
                animate={{ x: [-2, 2, -2, 2, 0] }}
                transition={{ duration: 0.2, repeat: 1 }}
                className="absolute inset-0 rounded-full border border-red-500/30"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackToast;

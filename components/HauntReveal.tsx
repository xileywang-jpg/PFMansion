
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types';
import { motion } from 'framer-motion';

const HauntReveal: React.FC = () => {
  const { phase } = useGameStore();

  if (phase !== GamePhase.HauntReveal) return null;

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        
        {/* Animated Text */}
        <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
            className="z-10 text-center px-4"
        >
            <h1 className="text-6xl md:text-8xl font-serif-display font-bold text-red-600 tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                THE HAUNT BEGINS
            </h1>
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xl text-red-200/50 font-serif-display italic tracking-widest uppercase"
            >
                The Traitor is Among Us
            </motion.p>
        </motion.div>

        {/* Temporary Continue Button (Placeholder for Scenario Selector) */}
        <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            className="mt-16 z-10 px-8 py-3 border border-red-900/50 text-red-500 hover:text-red-400 hover:border-red-500 rounded uppercase tracking-widest text-xs transition-colors"
            onClick={() => {
                // For now, we don't have a next step, so we might just stay here or log it
                // In a real implementation, this would open the Traitor's Tome.
                console.log("Proceed to Scenario Setup");
            }}
        >
            Open Tome (Coming Soon)
        </motion.button>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,1)]" />
    </motion.div>
  );
};

export default HauntReveal;

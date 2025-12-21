
import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ShieldAlert, Eye, ArrowRight, Play, User } from 'lucide-react';

const HauntReveal: React.FC = () => {
  const { phase, startHaunt, currentScenario, traitorId, players } = useGameStore();
  const [step, setStep] = useState(0);

  if (phase !== GamePhase.HauntReveal) return null;

  const traitor = traitorId ? players[traitorId] : null;

  const nextStep = () => setStep(s => s + 1);

  // Steps:
  // 0: Initial Scenario Reveal (Public)
  // 1: Traitor Handover (Public)
  // 2: Traitor Secrets (Private)
  // 3: Hero Handover (Public)
  // 4: Hero Secrets (Private)

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black" />
      
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="z-10 text-center px-4 max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl font-serif-display font-bold text-red-600 tracking-tighter mb-8 drop-shadow-2xl">作祟爆发</h1>
            <h2 className="text-4xl font-serif-display text-white mb-6 tracking-widest uppercase">{currentScenario?.name}</h2>
            <div className="h-px w-32 bg-red-900/50 mx-auto mb-8" />
            <p className="text-xl text-zinc-300 italic leading-relaxed max-w-2xl mx-auto mb-12">
              {currentScenario?.introText}
            </p>
            <button 
              onClick={nextStep}
              className="px-12 py-4 bg-red-950/20 border border-red-900 text-red-500 hover:bg-red-900 hover:text-white rounded uppercase tracking-widest text-sm font-bold transition-all flex items-center gap-3 mx-auto"
            >
              确定叛徒 <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div 
            key="traitor-handover"
            initial={{ opacity: 0, scale: 1.1 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, x: -100 }}
            className="z-10 text-center space-y-8"
          >
            <div className="w-24 h-24 rounded-full bg-red-900/20 border-2 border-red-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <User size={48} className="text-red-500" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-serif-display text-white">请将设备交给叛徒</h2>
              <p className="text-2xl font-bold text-red-500 uppercase tracking-widest">{traitor?.character.name}</p>
              <p className="text-zinc-500 italic">“你的噩梦才刚刚开始...”</p>
            </div>
            <button 
              onClick={nextStep}
              className="px-10 py-4 bg-zinc-100 text-black rounded font-bold uppercase tracking-widest text-sm hover:bg-white transition-all shadow-xl"
            >
              我是 {traitor?.character.name}, 揭晓我的命运
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="traitor-secrets"
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="z-10 w-full max-w-3xl bg-zinc-950/80 border-2 border-red-900/50 p-10 rounded-2xl backdrop-blur-xl shadow-[0_0_100px_rgba(220,38,38,0.1)]"
          >
            <div className="flex items-center gap-4 mb-8">
              <Skull size={40} className="text-red-600" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-red-700">叛徒手册</h3>
                <h2 className="text-3xl font-serif-display text-white">{currentScenario?.name}</h2>
              </div>
            </div>
            <div className="space-y-8">
              <section>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">你的终极目标</h4>
                <p className="text-xl text-red-100 font-bold leading-relaxed bg-red-950/20 p-4 border-l-4 border-red-600">
                  {currentScenario?.traitorInfo.objective}
                </p>
              </section>
              <section>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">初始准备</h4>
                <p className="text-zinc-400 italic">{currentScenario?.traitorInfo.setupText}</p>
              </section>
              {currentScenario?.traitorInfo.abilities && (
                <section>
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">邪恶能力</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {currentScenario.traitorInfo.abilities.map((a, i) => (
                      <div key={i} className="bg-zinc-900 border border-red-900/20 p-3 rounded text-sm text-zinc-300 flex items-start gap-2">
                        <Eye size={14} className="mt-1 text-red-600 shrink-0" /> {a}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <button 
              onClick={nextStep}
              className="mt-12 w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase tracking-widest text-sm transition-all"
            >
              我已经记住了。交给英雄们。
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="hero-handover"
            initial={{ opacity: 0, scale: 1.1 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, x: -100 }}
            className="z-10 text-center space-y-8"
          >
            <div className="w-24 h-24 rounded-full bg-indigo-900/20 border-2 border-indigo-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <ShieldAlert size={48} className="text-indigo-500" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-serif-display text-white">请将设备交给英雄们</h2>
              <p className="text-zinc-500 italic">“最后的希望就在你们手中...”</p>
            </div>
            <button 
              onClick={nextStep}
              className="px-10 py-4 bg-zinc-100 text-black rounded font-bold uppercase tracking-widest text-sm hover:bg-white transition-all shadow-xl"
            >
              我们是英雄, 准备迎接挑战
            </button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="hero-secrets"
            initial={{ opacity: 0, x: 100 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="z-10 w-full max-w-3xl bg-zinc-950/80 border-2 border-indigo-900/50 p-10 rounded-2xl backdrop-blur-xl shadow-[0_0_100px_rgba(79,70,229,0.1)]"
          >
            <div className="flex items-center gap-4 mb-8">
              <ShieldAlert size={40} className="text-indigo-500" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-indigo-700">生存指南</h3>
                <h2 className="text-3xl font-serif-display text-white">{currentScenario?.name}</h2>
              </div>
            </div>
            <div className="space-y-8">
              <section>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">你们的目标</h4>
                <p className="text-xl text-indigo-100 font-bold leading-relaxed bg-indigo-950/20 p-4 border-l-4 border-indigo-600">
                  {currentScenario?.heroInfo.objective}
                </p>
              </section>
              <section>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">行动计划</h4>
                <p className="text-zinc-400 italic">{currentScenario?.heroInfo.setupText}</p>
              </section>
              <div className="p-4 bg-indigo-900/10 border border-indigo-900/30 rounded text-xs text-indigo-300 italic">
                谨记：你们可以共享情报，但在热座模式下请不要偷看叛徒的屏幕。
              </div>
            </div>
            <button 
              onClick={startHaunt}
              className="mt-12 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3"
            >
              <Play size={18} /> 让作祟开始！
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-700 text-[10px] font-mono tracking-widest uppercase">
        Sector 4 // Haunt Initializing... Step {step}/4
      </div>
    </motion.div>
  );
};

export default HauntReveal;

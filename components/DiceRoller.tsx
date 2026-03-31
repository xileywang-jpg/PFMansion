import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { DIE_FACES } from '../utils/dice';
import { wsClient } from '../ws/client';
import * as network from '../ws/network';
import { Dices, ShieldAlert, Skull, Sparkles } from 'lucide-react';

const DiceRoller: React.FC = () => {
  const { activeRoll, cancelActiveRoll, showFeedback } = useGameStore();
  const [currentValues, setCurrentValues] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);
  const [hasSentRequest, setHasSentRequest] = useState(false);

  // 伪动画 interval（用 ref 避免 stale closure 问题）
  const animationIntervalRef = useRef<number | null>(null);

  // 处理后端返回的骰子结果
  const handleDiceResult = useCallback((msg: any) => {
    console.log('[DiceRoller] 收到 dice_result 消息:', msg);
    // 只有在正在投掷且已发送请求时才处理结果
    if (!isRolling || !hasSentRequest) {
      console.log('[DiceRoller] 跳过处理: isRolling=', isRolling, 'hasSentRequest=', hasSentRequest);
      return;
    }

    const results = msg.results;
    if (!results || !Array.isArray(results)) return;

    // 停止伪动画
    if (animationIntervalRef.current !== null) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    // 清除超时定时器，防止 5 秒后错误地关闭界面
    console.log('[DiceRoller] 清除超时定时器');
    network.setDiceRollTimeoutId(null);

    // 后端返回的 results 直接就是骰子面值 [0,1,2]，无需再映射
    const total = msg.sum || results.reduce((a: number, b: number) => a + b, 0);
    console.log('[DiceRoller] 显示结果: values=', results, 'total=', total);
    setCurrentValues(results);
    setFinalTotal(total);
    setIsRolling(false);
    setShowResult(true);
    setHasSentRequest(false);
  }, [isRolling, hasSentRequest]);

  // activeRoll 变化时初始化骰子状态
  useEffect(() => {
    if (activeRoll) {
      setCurrentValues(Array(activeRoll.numberOfDice).fill(0).map(() => DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)]));
      setShowResult(false);
      setFinalTotal(0);
      setHasSentRequest(false);
      setIsRolling(false);
      
      // 停止之前的动画
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    }

    return () => {
      // 组件卸载时清理
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, [activeRoll]);

  // 监听 dice_result 消息
  useEffect(() => {
    wsClient.on('dice_result', handleDiceResult);
    
    return () => {
      wsClient.off('dice_result', handleDiceResult);
    };
  }, [handleDiceResult]);

  if (!activeRoll) return null;

  const isHauntRoll = activeRoll.rollType === 'HAUNT';
  const hauntSucceeded = activeRoll.targetValue !== undefined ? finalTotal >= activeRoll.targetValue : false;
  const title = activeRoll.title || (isHauntRoll ? '作祟检定' : `${activeRoll.attributeName} 检定`);
  const subtitle = activeRoll.description || (isHauntRoll
    ? `投掷 ${activeRoll.numberOfDice} 枚命运骰子。若总和不低于预兆数 ${activeRoll.targetValue ?? '?'}，大厦今夜将暂时沉寂。`
    : `正在投掷 ${activeRoll.numberOfDice} 枚骰子 ${activeRoll.targetValue ? `(目标值为 ${activeRoll.targetValue})` : ''}`);

  const handleRoll = () => {
    if (isRolling || hasSentRequest) return;
    console.log('[DiceRoller] handleRoll 开始, numberOfDice=', activeRoll.numberOfDice);
    
    setIsRolling(true);
    setHasSentRequest(true);

    // 开始伪动画 - 随机切换骰子点数（使用山屋惊魂规则 0,0,1,1,2,2）
    const interval = window.setInterval(() => {
      setCurrentValues(prev => prev.map(() => DIE_FACES[Math.floor(Math.random() * DIE_FACES.length)]));
    }, 80);
    animationIntervalRef.current = interval;

    // 所有请求都必须发送到后端，如果没有连接则报错
    const connected = network.isConnectedToServer();
    if (!connected) {
      // 停止伪动画
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsRolling(false);
      setHasSentRequest(false);
      const wsOk = wsClient.isConnected();
      if (!wsOk) {
        alert('⚠️ WebSocket 未连接！\n\n请检查网络后刷新页面重新进入房间。\n\n（如果你是从房间外直接刷新了页面，请重新加入房间）');
      } else {
        alert('⚠️ 未在游戏房间中！\n\n请刷新页面后重新加入房间。');
      }
      return;
    }
    
    // 发送请求到后端
    if (isHauntRoll) {
      network.sendPerformHauntRoll();
    } else {
      network.sendRollDice(activeRoll.numberOfDice);
    }

    // 设置超时：如果后端 5 秒没响应，停止动画并清理状态
    // 使用共享的超时管理，以便 dice_result 收到时可以清除
    const timeoutId = window.setTimeout(() => {
      console.warn('[DiceRoller] ⏰ 超时回调执行！');
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsRolling(false);
      setHasSentRequest(false);
      console.warn('骰子请求超时');
      showFeedback('服务器未及时返回检定结果，请等待状态同步或重试。', 'warning');
      network.setDiceRollTimeoutId(null);
    }, 5000);
    console.log('[DiceRoller] 已设置超时定时器, timeoutId=', timeoutId);
    network.setDiceRollTimeoutId(timeoutId);
  };

  const renderDie = (value: number, index: number) => {
    const isTwo = value === 2;
    const isOne = value === 1;
    return (
      <motion.div 
        key={index} 
        layout 
        initial={{ scale: 0.8 }} 
        animate={{ 
          scale: 1, 
          rotate: isRolling ? Math.random() * 360 : 0, 
          backgroundColor: isTwo ? '#064e3b' : isOne ? '#18181b' : '#09090b', 
          borderColor: isTwo ? '#10b981' : isOne ? '#52525b' : '#27272a' 
        }} 
        className="w-16 h-16 border-2 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden"
      >
        {value === 0 && <div className="text-zinc-700 font-serif-display text-2xl font-bold opacity-50">0</div>}
        {value === 1 && <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />}
        {value === 2 && <><div className="absolute top-3 left-3 w-3 h-3 bg-emerald-400 rounded-full" /><div className="absolute bottom-3 right-3 w-3 h-3 bg-emerald-400 rounded-full" /></>}
      </motion.div>
    );
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm ${isHauntRoll ? 'bg-black/90' : 'bg-black/80'}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-2xl p-8 max-w-2xl w-full flex flex-col items-center shadow-2xl relative overflow-hidden ${
          isHauntRoll
            ? 'bg-[radial-gradient(circle_at_top,_rgba(120,23,23,0.28),_rgba(9,9,11,0.98)_58%)] border border-red-950/60'
            : 'bg-zinc-950 border border-zinc-800'
        }`}
      >
        {isHauntRoll && (
          <>
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-950/20 to-transparent pointer-events-none" />
            <div className="absolute -top-10 -right-8 opacity-10 pointer-events-none">
              <Skull size={120} className="text-red-300" />
            </div>
          </>
        )}

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className={`mb-4 flex items-center gap-2 rounded-full px-4 py-1.5 border ${isHauntRoll ? 'bg-red-950/40 border-red-900/40 text-red-200' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
            {isHauntRoll ? <Skull size={14} /> : <Sparkles size={14} />}
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">{title}</span>
          </div>

          <h2 className={`text-2xl font-serif-display mb-2 uppercase tracking-widest ${isHauntRoll ? 'text-red-50' : 'text-zinc-100'}`}>{title}</h2>
          <p className={`mb-6 text-sm text-center max-w-xl ${isHauntRoll ? 'text-red-100/70' : 'text-zinc-500'}`}>{subtitle}</p>

          {isHauntRoll && activeRoll.targetValue !== undefined && !showResult && (
            <div className="w-full mb-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800/80 bg-black/30 px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">命运骰子</div>
                <div className="text-3xl font-bold text-zinc-100">{activeRoll.numberOfDice}</div>
              </div>
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-red-200/60 mb-1">预兆阈值</div>
                <div className="text-3xl font-bold text-red-200">{activeRoll.targetValue}</div>
              </div>
            </div>
          )}

        <div className="flex flex-wrap justify-center gap-4 mb-10">{currentValues.map((val, idx) => renderDie(val, idx))}</div>
        <AnimatePresence mode='wait'>
            {showResult ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
                    {isHauntRoll ? (
                      <>
                        <div className={`mb-4 flex items-center gap-2 rounded-full px-4 py-1.5 border ${hauntSucceeded ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' : 'bg-red-950/40 border-red-800/50 text-red-200'}`}>
                          {hauntSucceeded ? <ShieldAlert size={14} /> : <Skull size={14} />}
                          <span className="text-[11px] font-bold uppercase tracking-[0.24em]">
                            {hauntSucceeded ? '黑暗暂退' : '作祟爆发'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 px-5 py-4 text-center">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">你的总和</div>
                            <div className="text-6xl font-serif-display font-bold text-white">{finalTotal}</div>
                          </div>
                          <div className={`rounded-2xl border px-5 py-4 text-center ${hauntSucceeded ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-red-900/40 bg-red-950/20'}`}>
                            <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${hauntSucceeded ? 'text-emerald-200/60' : 'text-red-200/60'}`}>预兆阈值</div>
                            <div className={`text-6xl font-serif-display font-bold ${hauntSucceeded ? 'text-emerald-200' : 'text-red-200'}`}>{activeRoll.targetValue}</div>
                          </div>
                        </div>

                        <div className={`w-full rounded-2xl border px-5 py-4 mb-6 ${hauntSucceeded ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-100' : 'border-red-900/40 bg-red-950/20 text-red-100'}`}>
                          <div className="text-lg font-serif-display mb-1">{hauntSucceeded ? '大厦暂时沉寂。' : '门后的东西醒来了。'}</div>
                          <p className={`text-sm leading-relaxed ${hauntSucceeded ? 'text-emerald-100/75' : 'text-red-100/75'}`}>
                            {hauntSucceeded
                              ? '你的结果挡住了这一轮作祟。阴影尚未离去，但今晚它还没有完全夺走大厦的控制权。'
                              : '你的结果低于当前预兆数。作祟已经开始，接下来将揭示真正的剧本与阵营。'}
                          </p>
                        </div>

                        <button onClick={cancelActiveRoll} className={`w-full font-bold py-4 rounded uppercase tracking-[0.2em] text-sm transition-colors shadow-lg ${hauntSucceeded ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-red-700 hover:bg-red-600 text-white'}`}>
                          {activeRoll.confirmLabel || '确认结果'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-6xl font-serif-display font-bold text-white mb-2">{finalTotal}</div>
                        {activeRoll.targetValue !== undefined && (
                            <div className={`text-sm font-bold uppercase tracking-widest mb-6 px-4 py-1 rounded ${finalTotal >= activeRoll.targetValue ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                                {finalTotal >= activeRoll.targetValue ? '成功' : '失败'}
                            </div>
                        )}
                        <button onClick={cancelActiveRoll} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded uppercase tracking-wider text-sm transition-colors shadow-lg">{activeRoll.confirmLabel || '继续'}</button>
                      </>
                    )}
                </motion.div>
            ) : (
                <div key="rolling" className="w-full flex flex-col gap-3">
                    <button onClick={handleRoll} disabled={isRolling} className={`w-full py-4 rounded font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 ${isHauntRoll ? 'bg-red-100 hover:bg-white text-black' : 'bg-zinc-100 hover:bg-white text-black'}`}>
                        {isRolling ? (isHauntRoll ? '命运翻涌中...' : '投掷中...') : <><Dices size={20} /> {activeRoll.actionLabel || (isHauntRoll ? '掷出命运骰子' : '开始投掷')}</>}
                    </button>
                </div>
            )}
        </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DiceRoller;

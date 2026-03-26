import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { DIE_FACES } from '../utils/dice';
import { wsClient } from '../ws/client';
import * as network from '../ws/network';
import { Dices } from 'lucide-react';

const DiceRoller: React.FC = () => {
  const { activeRoll, cancelActiveRoll } = useGameStore();
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
      wsClient.off('dice_result');
    };
  }, [handleDiceResult]);

  if (!activeRoll) return null;

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
    network.sendRollDice(activeRoll.numberOfDice);

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
      // 超时后清除 activeRoll，防止 UI 卡死（服务器会返回 STALE 响应做双保险）
      cancelActiveRoll();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-2xl w-full flex flex-col items-center shadow-2xl relative">
        <h2 className="text-2xl font-serif-display text-zinc-100 mb-2 uppercase tracking-widest">{activeRoll.attributeName} 检定</h2>
        <p className="text-zinc-500 mb-8 text-sm">正在投掷 {activeRoll.numberOfDice} 枚骰子 {activeRoll.targetValue ? `(目标值为 ${activeRoll.targetValue})` : ''}</p>
        <div className="flex flex-wrap justify-center gap-4 mb-10">{currentValues.map((val, idx) => renderDie(val, idx))}</div>
        <AnimatePresence mode='wait'>
            {showResult ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
                    <div className="text-6xl font-serif-display font-bold text-white mb-2">{finalTotal}</div>
                    {activeRoll.targetValue !== undefined && (
                        <div className={`text-sm font-bold uppercase tracking-widest mb-6 px-4 py-1 rounded ${finalTotal >= activeRoll.targetValue ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                            {finalTotal >= activeRoll.targetValue ? '成功' : '失败'}
                        </div>
                    )}
                    <button onClick={() => activeRoll.onComplete(finalTotal)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded uppercase tracking-wider text-sm transition-colors shadow-lg">继续</button>
                </motion.div>
            ) : (
                <div key="rolling" className="w-full flex flex-col gap-3">
                    <button onClick={handleRoll} disabled={isRolling} className="w-full py-4 rounded font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all bg-zinc-100 hover:bg-white text-black disabled:opacity-50">
                        {isRolling ? '投掷中...' : <><Dices size={20} /> 开始投掷</>}
                    </button>
                </div>
            )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DiceRoller;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Plus, Sparkles, Volume2, VolumeX, ShieldAlert, Award } from 'lucide-react';
import { cn } from '../utils';

interface ZikrItem {
  id: string;
  arabic: string;
  urdu: string;
  english: string;
}

export default function TasbeehCounter({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<33 | 100 | 'unlimited'>(33);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [totalCount, setTotalCount] = useState(() => {
    try {
      return Number(localStorage.getItem('tasbeeh_total_count') || '0');
    } catch {
      return 0;
    }
  });

  const zikrs: ZikrItem[] = [
    { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', urdu: 'اللہ پاک ہے', english: 'Glory be to Allah' },
    { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', urdu: 'سب تعریفیں اللہ ہی کے لیے ہیں', english: 'All praise is due to Allah' },
    { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', urdu: 'اللہ سب سے بڑا ہے', english: 'Allah is the Greatest' },
    { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', urdu: 'میں اللہ سے معافی مانگتا ہوں', english: 'I seek forgiveness from Allah' },
    { id: 'kalima', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', urdu: 'اللہ کے سوا کوئی معبود نہیں', english: 'There is no deity but Allah' }
  ];

  const [activeZikr, setActiveZikr] = useState<ZikrItem>(zikrs[0]);

  useEffect(() => {
    try {
      localStorage.setItem('tasbeeh_total_count', totalCount.toString());
    } catch (e) {
      console.error(e);
    }
  }, [totalCount]);

  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      // Create oscillator for an elegant, non-intrusive click beep (iframe safe)
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, context.currentTime); // Quick pleasant high frequency
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.08);
    } catch (err) {
      console.warn('Audio click failed:', err);
    }
  };

  const playTargetSound = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, context.currentTime);
      osc.frequency.setValueAtTime(1500, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.3);
    } catch (err) {
      console.warn('Target sound failed:', err);
    }
  };

  const handleIncrement = () => {
    const nextCount = count + 1;
    playClickSound();

    // Vibrate if API is supported
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    setCount(nextCount);
    setTotalCount(prev => prev + 1);

    if (target !== 'unlimited' && nextCount === target) {
      setTimeout(() => {
        playTargetSound();
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }, 50);
    }
  };

  const handleReset = () => {
    if (count > 0 && window.confirm('کیا آپ شمار دوبارہ شروع کرنا چاہتے ہیں؟ (Are you sure you want to reset current count?)')) {
      setCount(0);
    }
  };

  const progressPercent = target === 'unlimited' ? 100 : Math.min(100, (count / target) * 100);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-10 pb-4 shadow-md z-10 flex items-center justify-between shrink-0 text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold Urdu">تسبیح کاؤنٹر (Tasbeeh Counter)</h2>
            <p className="text-white/80 text-xs Urdu">ذکرِ الہیٰ سے دلوں کا سکون</p>
          </div>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center justify-between relative z-10 scrollable-content max-w-md mx-auto w-full">
        {/* Stats Row */}
        <div className="w-full grid grid-cols-2 gap-3 mb-4 select-none">
          <div className="bg-white dark:bg-[#202c33] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xs text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Total Zikr</span>
            <span className="text-xl font-black text-[#00a884]">{totalCount}</span>
          </div>
          <div className="bg-white dark:bg-[#202c33] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xs text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Target Limit</span>
            <div className="flex justify-center gap-1.5 mt-0.5">
              {[33, 100].map(val => (
                <button
                  key={val}
                  onClick={() => { setTarget(val as any); setCount(0); }}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-md transition-all border",
                    target === val 
                      ? "bg-[#00a884] border-[#00a884] text-white" 
                      : "bg-gray-50 dark:bg-[#2a3942] border-gray-100 dark:border-white/5 text-gray-500"
                  )}
                >
                  {val}
                </button>
              ))}
              <button
                onClick={() => { setTarget('unlimited'); setCount(0); }}
                className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-md transition-all border",
                  target === 'unlimited'
                    ? "bg-[#00a884] border-[#00a884] text-white" 
                    : "bg-gray-50 dark:bg-[#2a3942] border-gray-100 dark:border-white/5 text-gray-500"
                )}
              >
                ∞
              </button>
            </div>
          </div>
        </div>

        {/* Zikr Carousel Selector */}
        <div className="w-full bg-white dark:bg-[#202c33] rounded-[32px] p-4 border border-gray-100 dark:border-white/5 shadow-xs select-none mb-6">
          <p className="text-[10px] text-center font-bold uppercase tracking-widest text-[#00a884] mb-3">ذکر منتخب کریں (Select Zikr)</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {zikrs.map(z => (
              <button
                key={z.id}
                onClick={() => { setActiveZikr(z); setCount(0); }}
                className={cn(
                  "snap-center shrink-0 px-4 py-2.5 rounded-2xl transition-all text-xs font-bold border Urdu text-center flex flex-col items-center justify-center min-w-[120px]",
                  activeZikr.id === z.id
                    ? "bg-teal-50 dark:bg-teal-950/30 border-teal-500/30 text-[#00a884]"
                    : "bg-gray-50 dark:bg-[#2a3942] border-transparent text-gray-600 dark:text-gray-300"
                )}
              >
                <span className="text-sm font-bold block mb-0.5">{z.arabic}</span>
                <span className="text-[8px] opacity-70 block">{z.urdu}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Counter Ring Board */}
        <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center my-4">
          {/* Circular Progress Bar SVG */}
          <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background Circle */}
            <circle 
              cx="100" 
              cy="100" 
              r="85" 
              className="stroke-gray-100 dark:stroke-[#2a3942] fill-none" 
              strokeWidth="10" 
            />
            {/* Progress Circle */}
            <motion.circle 
              cx="100" 
              cy="100" 
              r="85" 
              className="stroke-[#00a884] fill-none" 
              strokeWidth="10" 
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 85}
              initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - progressPercent / 100) }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            />
          </svg>

          {/* Active Counters Info Inside Ring */}
          <button 
            onClick={handleIncrement}
            className="w-52 h-52 md:w-56 md:h-56 rounded-full bg-white dark:bg-[#202c33] shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-[#00a884]/10 select-none cursor-pointer p-4 text-center z-10 outline-none"
          >
            <span className="text-emerald-600/80 font-bold Urdu text-sm max-w-[140px] truncate block mb-1">
              {activeZikr.arabic}
            </span>
            <span className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white my-1 block tabular-nums">
              {count}
            </span>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
              {target === 'unlimited' ? 'Unlimited' : `Target: ${target}`}
            </span>
          </button>
        </div>

        {/* Footer actions inside page */}
        <div className="w-full flex justify-between items-center mt-6 select-none gap-4">
          <button 
            onClick={handleReset}
            className="flex-1 py-3.5 px-4 bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-2xl hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors font-bold text-xs flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> شمار دوبارہ (Reset)
          </button>

          <button 
            onClick={handleIncrement}
            className="flex-1 py-3.5 px-4 bg-[#00a884] hover:bg-[#008f72] text-white rounded-2xl shadow-md transition-colors font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={16} /> تسبیح پڑھیں (Count)
          </button>
        </div>

        {/* Subtitle / Tip */}
        <div className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold flex items-center gap-1">
          <Award size={12} className="text-[#00a884] animate-bounce" />
          <span>Tap inside the ring or count button to increment</span>
        </div>
      </div>
    </div>
  );
}

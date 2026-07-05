import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onComplete: () => void;
  logoUrl?: string;
}

export default function SplashScreen({ onComplete, logoUrl }: SplashScreenProps) {
  useEffect(() => {
    // Elegant and professional 2.8s total loading time
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  const DEFAULT_LOGO = '/logo.png';

  const resolveLogo = (url?: string) => {
    if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
      return DEFAULT_LOGO;
    }
    return url;
  };

  const renderLogo = () => {
    const logo = resolveLogo(logoUrl);
    return (
      <img 
        src={logo} 
        className="w-[85%] h-[85%] object-contain"
        alt="Ulfah Chat Logo"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-logo');
          if (fallback) fallback.classList.remove('hidden');
        }}
      />
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[1000] bg-[#0B1014] flex flex-col items-center justify-between p-8 text-center overflow-hidden"
    >
      {/* Premium Background Accent Lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#25D366]/5 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#00A884]/5 rounded-full blur-[140px]" />
      </div>

      {/* Top Margin Spacer */}
      <div className="h-10" />

      {/* Center Logo & Greetings Board */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative"
        >
          {/* Outer Rotating/Pulse Halo Ring */}
          <div className="absolute inset-0 -m-3 bg-gradient-to-tr from-[#25D366] via-[#D4AF37] to-[#00A884] rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#25D366] via-[#D4AF37] to-[#00A884] shadow-2xl relative z-10">
            <div className="w-full h-full rounded-full bg-[#0B1014] flex items-center justify-center overflow-hidden border-2 border-[#0B1014] relative">
              {renderLogo()}
            </div>
          </div>
        </motion.div>

        {/* Dynamic elegant texts with staggered delays */}
        <div className="flex flex-col items-center gap-4">
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-white text-3xl font-medium tracking-wide drop-shadow-md"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            بِسْمِ اللہِ الرَّحْمٰنِ الرَّحِیْمِ
          </motion.h2>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-white/95 text-4xl font-semibold tracking-normal mt-2 drop-shadow-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            السلام علیکم
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="text-[#8696A0] text-sm mt-1 max-w-[280px]"
          >
            Securing Connection to Premium Ulfah Chat
          </motion.div>
        </div>
      </div>

      {/* Floating Branded loading progress bar at bottom */}
      <div className="w-full max-w-[180px] flex flex-col items-center gap-6 relative z-10 mb-10">
        <div className="w-full h-1 bg-[#1e2a30] rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.3, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#25D366] to-[#00A884]"
          />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#8696A0] font-semibold">from</span>
          <span className="text-white text-[12px] font-extrabold tracking-widest uppercase">Ulfah Technologies</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

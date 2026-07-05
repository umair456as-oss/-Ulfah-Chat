import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Heart, 
  Moon, 
  Compass, 
  Music, 
  PlayCircle, 
  Calendar, 
  MapPin, 
  Award,
  BookOpen,
  Cloud,
  Search,
  LayoutGrid,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils';
import QuranReader from './QuranReader';
import HadithReader from './HadithReader';
import MadrasaReader from './MadrasaReader';
import NoorAIChat from './NoorAIChat';
import IslamicLibrary from './IslamicLibrary';
import TasbeehCounter from './TasbeehCounter';
import DuasViewer from './DuasViewer';
import PrayerTimesViewer from './PrayerTimesViewer';

interface ExploreItem {
  id: string;
  title: string;
  urduTitle: string;
  icon: React.ReactNode;
  color: string;
}

export default function Explore() {
  const [showQuran, setShowQuran] = useState(false);
  const [showHadith, setShowHadith] = useState(false);
  const [showMadrasa, setShowMadrasa] = useState(false);
  const [showNoorAI, setShowNoorAI] = useState(false);
  const [showIslamicLibrary, setShowIslamicLibrary] = useState(false);
  const [showTasbeeh, setShowTasbeeh] = useState(false);
  const [showDuas, setShowDuas] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState('all');
  const categories: ExploreItem[] = [
    {
      id: 'noorai',
      title: 'Noor AI',
      urduTitle: 'نور اے آئی اسسٹنٹ',
      icon: <Sparkles size={32} />,
      color: 'bg-teal-600',
    },
    {
      id: 'islamiclibrary',
      title: 'Islamic Library',
      urduTitle: 'اسلامی لائبریری',
      icon: <BookOpen size={32} />,
      color: 'bg-emerald-700',
    },
    {
      id: 'quran',
      title: 'Holy Quran',
      urduTitle: 'قرآن پاک',
      icon: <Book size={32} />,
      color: 'bg-emerald-500',
    },
    {
      id: 'hadith',
      title: 'Hadith',
      urduTitle: 'حدیث مبارکہ',
      icon: <BookOpen size={32} />,
      color: 'bg-blue-500',
    },
    {
      id: 'madrasa',
      title: 'e-Madrasa',
      urduTitle: 'ای مدرسہ',
      icon: <GraduationCap size={32} />,
      color: 'bg-emerald-600',
    },
    {
      id: 'prayer',
      title: 'Prayer Times',
      urduTitle: 'نماز کے اوقات',
      icon: <Moon size={32} />,
      color: 'bg-purple-500',
    },
    {
      id: 'qibla',
      title: 'Qibla Finder',
      urduTitle: 'قبلہ رخ',
      icon: <Compass size={32} />,
      color: 'bg-amber-500',
    },
    {
      id: 'duas',
      title: 'Duas',
      urduTitle: 'دعائیں',
      icon: <Heart size={32} />,
      color: 'bg-rose-500',
    },
    {
      id: 'nasheeds',
      title: 'Nasheeds',
      urduTitle: 'نعتیں',
      icon: <Music size={32} />,
      color: 'bg-indigo-500',
    },
    {
      id: 'bayanat',
      title: 'Bayanat',
      urduTitle: 'بیانات',
      icon: <PlayCircle size={32} />,
      color: 'bg-cyan-500',
    },
    {
      id: 'calendar',
      title: 'Islamic Calendar',
      urduTitle: 'اسلامی کیلنڈر',
      icon: <Calendar size={32} />,
      color: 'bg-teal-500',
    },
    {
      id: 'mosques',
      title: 'Nearby Mosques',
      urduTitle: 'قریبی مساجد',
      icon: <MapPin size={32} />,
      color: 'bg-orange-500',
    },
    {
      id: 'tasbeeh',
      title: 'Tasbeeh Counter',
      urduTitle: 'تسبیح کاؤنٹر',
      icon: <Award size={32} />,
      color: 'bg-lime-500',
    }
  ];

  const handleItemClick = (id: string) => {
    switch (id) {
      case 'noorai':
        setShowNoorAI(true);
        break;
      case 'islamiclibrary':
        setLibraryCategory('all');
        setShowIslamicLibrary(true);
        break;
      case 'quran':
        setShowQuran(true);
        break;
      case 'hadith':
        setShowHadith(true);
        break;
      case 'madrasa':
        setShowMadrasa(true);
        break;
      case 'tasbeeh':
        setShowTasbeeh(true);
        break;
      case 'duas':
        setShowDuas(true);
        break;
      case 'prayer':
        setShowPrayer(true);
        break;
      case 'qibla':
        window.open('https://qiblafinder.withgoogle.com/', '_blank');
        break;
      case 'calendar':
        window.open('https://www.islamicfinder.org/islamic-calendar/', '_blank');
        break;
      case 'mosques':
        window.open('https://www.google.com/maps/search/mosques+near+me', '_blank');
        break;
      default:
        alert(`${id.charAt(0).toUpperCase() + id.slice(1)} feature coming soon!`);
    }
  };

  if (showNoorAI) {
    return <NoorAIChat onBack={() => setShowNoorAI(false)} />;
  }

  if (showIslamicLibrary) {
    return <IslamicLibrary onBack={() => setShowIslamicLibrary(false)} defaultCategory={libraryCategory} />;
  }

  if (showQuran) {
    return <QuranReader onBack={() => setShowQuran(false)} />;
  }

  if (showHadith) {
    return <HadithReader onBack={() => setShowHadith(false)} />;
  }

  if (showMadrasa) {
    return <MadrasaReader onBack={() => setShowMadrasa(false)} />;
  }

  if (showTasbeeh) {
    return <TasbeehCounter onBack={() => setShowTasbeeh(false)} />;
  }

  if (showDuas) {
    return <DuasViewer onBack={() => setShowDuas(false)} />;
  }

  if (showPrayer) {
    return <PrayerTimesViewer onBack={() => setShowPrayer(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-6 pt-8 pb-8 shadow-lg z-10 safe-area-top">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black text-white Urdu">ایکسپلور (Explore)</h1>
            <p className="text-white/80 Urdu text-sm">اسلامی معلومات اور خدمات تک رسائی</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
            <LayoutGrid size={24} />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="scrollable-content p-4 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleItemClick(item.id)}
              className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-[#202c33] rounded-[32px] shadow-sm hover:shadow-xl transition-all active:scale-95 border border-gray-100 dark:border-white/5"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform",
                item.color
              )}>
                {item.icon}
              </div>
              <span className="text-[#111b21] dark:text-[#e9edef] font-bold text-sm text-center Urdu block mb-1">
                {item.urduTitle}
              </span>
              <span className="text-[#667781] dark:text-[#8696a0] text-[10px] font-bold uppercase tracking-widest text-center">
                {item.title}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Card of the Day */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-gradient-to-br from-[#00a884] to-[#128c7e] rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Moon size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black Urdu mb-4 italic">آج کی آیت (Verse of the Day)</h3>
            <p className="text-xl Urdu leading-relaxed mb-6 italic opacity-90">
              "بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔"
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-widest opacity-70">Al-Baqarah 2:153</span>
              <button className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors">
                <Heart size={20} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="p-10 text-center text-[11px] text-[#8696a0] Urdu opacity-40 uppercase tracking-[0.3em] font-medium">
          Digital Islamic Companion • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

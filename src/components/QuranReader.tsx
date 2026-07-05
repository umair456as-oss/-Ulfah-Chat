import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  List, 
  ChevronRight,
  Settings,
  Type,
  Book
} from 'lucide-react';
import { cn } from '../utils';

interface Surah {
  id: number;
  name_simple: string;
  name_arabic: string;
  translated_name: {
    name: string;
  };
  verses_count: number;
  revelation_place: string;
}

interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  translation?: string;
}

interface Juz {
  id: number;
  juz_number: number;
  verse_mapping: Record<string, string>;
}

export default function QuranReader({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'list' | 'reading'>('list');
  const [tab, setTab] = useState<'surah' | 'juz'>('surah');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(28);
  const [is16Line, setIs16Line] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchSurahs();
  }, []);

  const fetchSurahs = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.quran.com/api/v4/chapters?language=ur');
      const data = await res.json();
      setSurahs(data.chapters);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerses = async (id: number, type: 'chapter' | 'juz' = 'chapter') => {
    setLoading(true);
    setCurrentPage(0);
    try {
      const url = type === 'chapter' 
        ? `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${id}`
        : `https://api.quran.com/api/v4/quran/verses/uthmani?juz_number=${id}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setVerses(data.verses);
      setView('reading');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-8 pb-4 shadow-md safe-area-top">
        <div className="flex items-center gap-4 text-white">
          <button onClick={view === 'reading' ? () => setView('list') : onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold Urdu">
              {view === 'reading' ? (selectedSurah?.name_arabic || `پارہ ${selectedJuz}`) : 'قرآن مجید'}
            </h2>
            <p className="text-xs opacity-80 uppercase tracking-widest font-bold">
              {view === 'reading' ? (selectedSurah?.name_simple || `Juz ${selectedJuz}`) : 'Holy Quran'}
            </p>
          </div>
          {view === 'reading' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIs16Line(!is16Line)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all Urdu border",
                  is16Line 
                    ? "bg-white text-[#00a884] border-white" 
                    : "bg-white/10 text-white border-white/20"
                )}
              >
                16 لائن
              </button>
              <button 
                onClick={() => setFontSize(prev => prev >= 40 ? 28 : prev + 4)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Type size={20} />
              </button>
            </div>
          )}
        </div>

        {view === 'list' && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
              <input 
                type="text"
                placeholder="تلاش کریں (Search Surah...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/50 outline-none focus:bg-white/20 transition-all font-medium Urdu text-right"
              />
            </div>
            
            <div className="flex bg-black/10 rounded-lg p-1">
              <button 
                onClick={() => setTab('surah')}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-bold transition-all Urdu",
                  tab === 'surah' ? "bg-white text-[#00a884] shadow-sm" : "text-white/70"
                )}
              >
                سورتیں (Surah)
              </button>
              <button 
                onClick={() => setTab('juz')}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-bold transition-all Urdu",
                  tab === 'juz' ? "bg-white text-[#00a884] shadow-sm" : "text-white/70"
                )}
              >
                پارے (Juz)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="scrollable-content">
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-3"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#667781] Urdu">لوڈ ہو رہا ہے...</p>
                </div>
              ) : tab === 'surah' ? (
                filteredSurahs.map((surah) => (
                  <button
                    key={surah.id}
                    onClick={() => { setSelectedSurah(surah); setSelectedJuz(null); fetchVerses(surah.id); }}
                    className="w-full flex items-center gap-4 bg-white dark:bg-[#202c33] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all group border border-transparent hover:border-[#00a884]/20"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#f0f2f5] dark:bg-[#2a3942] flex items-center justify-center text-[#00a884] font-bold group-hover:bg-[#00a884] group-hover:text-white transition-all transform rotate-45">
                      <span className="transform -rotate-45">{surah.id}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-[#111b21] dark:text-[#e9edef]">{surah.name_simple}</h4>
                      <p className="text-[10px] text-[#667781] dark:text-[#8696a0] font-bold uppercase tracking-wider">
                        {surah.revelation_place} • {surah.verses_count} Verses
                      </p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-lg font-bold text-[#00a884] Urdu">{surah.name_arabic}</h4>
                      <p className="text-[10px] text-[#667781] dark:text-[#8696a0] Urdu">{surah.translated_name.name}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                    <button
                      key={juz}
                      onClick={() => { setSelectedJuz(juz); setSelectedSurah(null); fetchVerses(juz, 'juz'); }}
                      className="flex flex-col items-center justify-center bg-white dark:bg-[#202c33] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                      </div>
                      <span className="text-lg font-bold Urdu text-[#111b21] dark:text-[#e9edef]">پارہ {juz}</span>
                      <span className="text-[10px] font-bold text-[#8696a0] uppercase tracking-widest">Juz {juz}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="reading"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "p-4 pb-20",
                is16Line ? "bg-[#fdfcf5] dark:bg-[#111b21]" : "p-6"
              )}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#667781] Urdu">تلاوت لوڈ ہو رہی ہے...</p>
                </div>
              ) : (
                <div className={cn(
                  "mx-auto transition-all",
                  is16Line 
                    ? "max-w-[800px] border-[12px] border-[#d4af37]/30 rounded-lg bg-white dark:bg-[#0b141a] shadow-inner p-4 md:p-8" 
                    : "space-y-12"
                )}>
                  <div className="text-center space-y-4 mb-10">
                    <h3 className="text-3xl md:text-4xl font-bold Urdu text-[#00a884]">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h3>
                    <div className="w-20 h-1 bg-[#00a884]/20 mx-auto rounded-full" />
                  </div>
                  
                  <div className={cn(
                    is16Line 
                      ? "flex flex-col gap-6" 
                      : "space-y-12"
                  )}>
                    {is16Line ? (
                      // 16 Line Logic: Group by lines or verses
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                           {verses.slice(currentPage * 16, (currentPage + 1) * 16).map((verse, idx) => (
                             <div key={verse.id} className="border-b border-[#d4af37]/10 pb-4 last:border-0">
                               <p 
                                 className="text-right leading-[1.8] Urdu text-[#111B21] dark:text-[#e9edef]"
                                 style={{ fontSize: `${fontSize}px` }}
                                >
                                  {verse.text_uthmani}
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-[#d4af37]/40 text-[10px] font-black mx-2 text-[#00a884] align-middle">
                                    {verse.verse_key.split(':')[1]}
                                  </span>
                                </p>
                             </div>
                           ))}
                        </div>
                        
                        <div className="flex justify-between items-center mt-8 py-4 border-t border-[#d4af37]/20">
                          <button 
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-4 py-2 bg-[#00a884] text-white rounded-xl disabled:opacity-30 Urdu text-xs font-bold"
                          >
                            سابقہ (Prev)
                          </button>
                          <span className="text-[10px] font-black text-[#8696a0]">PAGE {currentPage + 1} / {Math.ceil(verses.length / 16)}</span>
                          <button 
                            disabled={(currentPage + 1) * 16 >= verses.length}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-4 py-2 bg-[#00a884] text-white rounded-xl disabled:opacity-30 Urdu text-xs font-bold"
                          >
                            اگلا (Next)
                          </button>
                        </div>
                      </div>
                    ) : (
                      verses.map((verse) => (
                        <div 
                          key={verse.id} 
                          className="relative group block"
                        >
                          <div className="absolute -left-4 top-0 text-[10px] font-bold text-[#8696a0] opacity-30">
                            {verse.verse_key}
                          </div>
                          <p 
                            className="text-right leading-[2.2] Urdu text-[#111B21] dark:text-[#e9edef] block"
                            style={{ fontSize: `${fontSize}px` }}
                          >
                            {verse.text_uthmani}
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#00a884]/30 ml-4 text-[10px] font-black text-[#00a884] align-middle transform translate-y-[-2px]">
                              {verse.verse_key.split(':')[1]}
                            </span>
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {is16Line && (
                    <div className="mt-12 pt-6 border-t border-[#d4af37]/20 flex justify-between items-center text-[10px] text-[#8696a0] uppercase tracking-[0.2em] font-black">
                      <span>Holy Quran</span>
                      <span className="Urdu">صفحہ القرآن</span>
                      <span>Tajweedi Edition</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Action Button for Settings */}
      {view === 'reading' && (
        <div className="fixed bottom-6 right-6">
          <button 
            className="w-14 h-14 bg-[#00a884] text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95"
            onClick={() => setFontSize(prev => prev === 40 ? 24 : prev + 4)}
          >
            <Settings size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Library, 
  ChevronRight,
  Search
} from 'lucide-react';
import { cn } from '../utils';

interface MadrasaLevel {
  id: number;
  name: string;
  enName: string;
  books: string[];
}

export default function MadrasaReader({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'levels' | 'books'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<MadrasaLevel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const levels: MadrasaLevel[] = [
    { 
      id: 1, 
      name: 'درجہ اولی', 
      enName: 'First Year', 
      books: ['نحو میر', 'صرف میر', 'خلاصۃ النحو', 'خلاصۃ الصرف', 'تیسیر المنطق', 'جمال القرآن'] 
    },
    { 
      id: 2, 
      name: 'درجہ ثانیہ', 
      enName: 'Second Year', 
      books: ['ہدایۃ النحو', 'کافیہ', 'مرقات', 'قدوری (اول)', 'زاد الطالبین', 'ریاض الصرف'] 
    },
    { 
      id: 3, 
      name: 'درجہ ثالثہ', 
      enName: 'Third Year', 
      books: ['شرح جامی', 'قطبی', 'نور الایضاح', 'کنز الدقائق', 'اصول الشاشی', 'مختصر المعانی'] 
    },
    { 
      id: 4, 
      name: 'درجہ رابعہ', 
      enName: 'Fourth Year', 
      books: ['ہدایہ (اول)', 'میبزی', 'شرح تہذیب', 'مقامات حریری', 'تلخیص المفتاح', 'المرقاہ'] 
    },
    { 
      id: 5, 
      name: 'درجہ خامسہ', 
      enName: 'Fifth Year', 
      books: ['ہدایہ (ثانی)', 'نفحۃ العرب', 'مسلم الثبوت', 'مختصر القدوری', 'نخبۃ الفکر', 'العقیدۃ الطحاویہ'] 
    },
    { 
      id: 6, 
      name: 'درجہ سادسہ', 
      enName: 'Sixth Year', 
      books: ['جلالین (اول)', 'جلالین (ثانی)', 'مشکوٰۃ المصابیح (اول)', 'مشکوٰۃ المصابیح (ثانی)', 'ہدایہ (اخیرین)', 'شرح عقائد نسفی'] 
    },
    { 
      id: 7, 
      name: 'درجہ سابعہ', 
      enName: 'Seventh Year', 
      books: ['بیضاوی', 'تفسیر نسفی', 'ہدایہ (اخیرین)', 'شرح معانی الآثار', 'اصول بزدوی', 'السراجی فی المیراث'] 
    },
    { 
      id: 8, 
      name: 'دورہ حدیث', 
      enName: 'Final Year', 
      books: ['صحیح البخاری', 'صحیح مسلم', 'سنن ابی داؤد', 'جامع الترمذی', 'سنن النسائی', 'سنن ابن ماجہ', 'موطأ امام مالک'] 
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-8 pb-4 shadow-md safe-area-top">
        <div className="flex items-center gap-4 text-white">
          <button onClick={view === 'books' ? () => setView('levels') : onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold Urdu">
              {view === 'books' ? selectedLevel?.name : 'ای مدرسہ (e-Madrasa)'}
            </h2>
            <p className="text-xs opacity-80 uppercase tracking-widest font-bold">
              {view === 'books' ? selectedLevel?.enName : 'Islamic Curriculum'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <GraduationCap size={20} />
          </div>
        </div>

        {view === 'levels' && (
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input 
              type="text"
              placeholder="تلاش کریں (Search Level...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/50 outline-none focus:bg-white/20 transition-all font-medium Urdu text-right"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="scrollable-content p-4">
        <AnimatePresence mode="wait">
          {view === 'levels' ? (
            <motion.div 
              key="levels"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 gap-4"
            >
              {levels.filter(l => l.name.includes(searchQuery) || l.enName.toLowerCase().includes(searchQuery.toLowerCase())).map((level) => (
                <button
                  key={level.id}
                  onClick={() => { setSelectedLevel(level); setView('books'); }}
                  className="bg-white dark:bg-[#202c33] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group border border-transparent hover:border-[#00a884]/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 font-black">
                      {level.id}
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold Urdu text-[#111b21] dark:text-[#e9edef]">{level.name}</h4>
                      <p className="text-[10px] text-[#8696a0] uppercase tracking-widest font-bold">{level.enName}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-[#8696a0] group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="books"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 mb-6">
                <p className="text-emerald-700 dark:text-emerald-400 Urdu text-sm text-center">
                  اس درجے کی تمام کتب یہاں دستیاب ہیں۔ (All books for this level are listed below)
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {selectedLevel?.books.map((book, idx) => (
                  <div 
                    key={idx}
                    className="bg-white dark:bg-[#202c33] p-4 rounded-xl flex items-center gap-4 border border-gray-100 dark:border-white/5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#f0f2f5] dark:bg-[#2a3942] flex items-center justify-center text-[#00a884]">
                      <Library size={18} />
                    </div>
                    <span className="flex-1 Urdu text-right text-lg text-[#111b21] dark:text-[#e9edef]">
                      {book}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

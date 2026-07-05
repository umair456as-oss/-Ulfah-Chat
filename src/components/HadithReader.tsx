import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Hash, 
  ChevronRight,
  Book,
  Scroll,
  Quote
} from 'lucide-react';
import { cn } from '../utils';

interface HadithBook {
  id: string;
  name: string;
  urduName: string;
  count: number;
  description: string;
  color: string;
}

interface HadithSection {
  [key: string]: string;
}

interface Hadith {
  hadithnumber: number;
  text: string;
  arabic: string;
  reference?: string;
}

export default function HadithReader({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<'books' | 'sections' | 'reading'>('books');
  const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
  const [sections, setSections] = useState<HadithSection>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const books: HadithBook[] = [
    { id: 'urd-bukhari', name: 'Sahih al-Bukhari', urduName: 'صحیح البخاری', count: 7563, description: 'The most authentic collection.', color: 'bg-emerald-600' },
    { id: 'urd-muslim', name: 'Sahih Muslim', urduName: 'صحیح مسلم', count: 7503, description: 'Renowned for its rigorous chains.', color: 'bg-blue-600' },
    { id: 'urd-abudawud', name: 'Sunan Abu Dawud', urduName: 'سنن ابی داؤد', count: 5274, description: 'Strengthens legal rulings.', color: 'bg-amber-600' },
    { id: 'urd-tirmidhi', name: 'Jami al-Tirmidhi', urduName: 'جامع الترمذی', count: 3956, description: 'Excellent for legal discussion.', color: 'bg-purple-600' },
    { id: 'urd-nasai', name: 'Sunan al-Nasa\'i', urduName: 'سنن النسائی', count: 5758, description: 'Focus on detailed jurisprudence.', color: 'bg-rose-600' },
    { id: 'urd-ibnmajah', name: 'Sunan Ibn Majah', urduName: 'سنن ابن ماجہ', count: 4341, description: 'Contains unique narrations.', color: 'bg-indigo-600' }
  ];

  const fetchSections = async (bookId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${bookId}/sections.json`);
      const data = await res.json();
      setSections(data.sections || data);
      setView('sections');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHadiths = async (bookId: string, sectionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${bookId}/${sectionId}.json`);
      const data = await res.json();
      setHadiths(data.hadiths);
      setView('reading');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentTitle = view === 'books' ? 'احادیث مبارکہ' : selectedBook?.urduName || 'Hadith';
  const currentSubtitle = view === 'books' ? 'Prophetic Traditions' : selectedBook?.name || '';

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-10 shadow-md">
        <div className="flex items-center gap-4 text-white">
          <button 
            onClick={() => {
              if (view === 'reading') setView('sections');
              else if (view === 'sections') setView('books');
              else onBack();
            }} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold Urdu">{currentTitle}</h2>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">{currentSubtitle}</p>
          </div>
          {view === 'reading' && (
             <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black Urdu">
               باب: {selectedSection}
             </div>
          )}
        </div>

        {view === 'books' && (
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
            <input 
              type="text"
              placeholder="کتاب تلاش کریں (Search Books...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/50 outline-none focus:bg-white/20 transition-all font-medium Urdu text-right"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'books' ? (
            <motion.div 
              key="books"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {books.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.urduName.includes(searchQuery)).map((book) => (
                <button
                  key={book.id}
                  onClick={() => { setSelectedBook(book); fetchSections(book.id); }}
                  className="relative overflow-hidden flex items-center gap-4 bg-white dark:bg-[#202c33] p-5 rounded-[24px] shadow-sm hover:shadow-xl transition-all group group border border-transparent hover:border-[#00a884]/20"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", book.color)}>
                    <BookOpen size={28} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-black text-[#111b21] dark:text-[#e9edef] text-lg">{book.name}</h4>
                    <p className="text-[10px] text-[#00a884] font-black uppercase tracking-widest">{book.description}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xl font-bold text-[#00a884] Urdu">{book.urduName}</h4>
                    <p className="text-[10px] text-[#667781] dark:text-[#8696a0] font-black Urdu">{book.count} احادیث</p>
                  </div>
                </button>
              ))}
            </motion.div>
          ) : view === 'sections' ? (
            <motion.div 
              key="sections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 space-y-3"
            >
              {loading ? (
                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#667781] Urdu">ابواب لوڈ ہو رہے ہیں...</p>
                 </div>
              ) : Object.entries(sections).map(([id, title]) => (
                <button
                  key={id}
                  onClick={() => { setSelectedSection(id); fetchHadiths(selectedBook!.id, id); }}
                  className="w-full flex items-center justify-between bg-white dark:bg-[#202c33] p-4 rounded-2xl shadow-sm hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] transition-colors gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-[#00a884]/10 text-[#00a884] flex-shrink-0 flex items-center justify-center text-[10px] font-black">
                    {id}
                  </div>
                  <span className="flex-1 text-right Urdu text-[#111b21] dark:text-[#e9edef] text-sm font-bold">
                    {title || `Bab ${id}`}
                  </span>
                  <ChevronRight size={18} className="text-[#8696a0]" />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-6 pb-20"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hadiths.map((h, i) => (
                <div key={i} className="bg-white dark:bg-[#202c33] p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 space-y-6 relative group transform hover:scale-[1.01] transition-transform">
                  <div className="flex justify-between items-center bg-[#f0f2f5] dark:bg-[#2a3942] -mx-6 -mt-6 p-4 px-6 rounded-t-[32px]">
                    <div className="flex items-center gap-2 text-[#00a884] font-black text-xs uppercase tracking-widest">
                       <Hash size={14} /> Hadith {h.hadithnumber}
                    </div>
                    <div className="p-2 text-[#8696a0] hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                       <Quote size={14} />
                    </div>
                  </div>
                  
                  {/* Arabic */}
                  <div className="text-right">
                    <p className="Urdu text-2xl leading-[1.8] text-[#111b21] dark:text-[#e9edef] text-right dir-rtl">
                      {h.text}
                    </p>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-white/5 w-full" />

                  {/* Urdu Description (if provided by API) */}
                  {/* The API usually separates Urdu in different editions, 
                      but since we selected urd-book, this IS the Urdu text. */}
                  
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Background */}
      <div className="fixed bottom-0 left-0 w-full opacity-[0.03] pointer-events-none z-0">
         <Scroll size={400} className="mx-auto text-emerald-900" />
      </div>
    </div>
  );
}

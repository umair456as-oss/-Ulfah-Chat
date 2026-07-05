import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Copy, Check, Heart, BookOpen, Share2, Sparkles } from 'lucide-react';
import { cn } from '../utils';

interface DuaItem {
  id: string;
  category: 'daily' | 'prayer' | 'protection' | 'general';
  title: string;
  titleUrdu: string;
  arabic: string;
  translationUrdu: string;
  translationEnglish: string;
  reference: string;
}

export default function DuasViewer({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'prayer' | 'protection' | 'general' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('duas_favorites_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const duas: DuaItem[] = [
    {
      id: 'morning',
      category: 'daily',
      title: 'Morning Supplication',
      titleUrdu: 'صبح کے وقت کی دعا',
      arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      translationUrdu: 'ہم نے صبح کی اور اللہ کے سارے ملک نے صبح کی، اور تمام تعریفیں اللہ ہی کے لیے ہیں۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں۔ اسی کی بادشاہت ہے اور اسی کے لیے تعریف ہے، اور وہ ہر چیز پر قادر ہے۔',
      translationEnglish: 'We have entered a new day and with it all dominion belongs to Allah, and all praise is due to Allah. There is no deity except Allah, alone, without partner. To Him belongs dominion, and to Him belongs praise, and He has power over all things.',
      reference: 'Sahih Muslim 2723'
    },
    {
      id: 'evening',
      category: 'daily',
      title: 'Evening Supplication',
      titleUrdu: 'شام کے وقت کی دعا',
      arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      translationUrdu: 'ہم نے شام کی اور اللہ کے سارے ملک نے شام کی، اور تمام تعریفیں اللہ ہی کے لیے ہیں۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں۔ اسی کی بادشاہت ہے اور اسی کے لیے تعریف ہے، اور وہ ہر چیز پر قادر ہے۔',
      translationEnglish: 'We have entered the evening and with it all dominion belongs to Allah, and all praise is due to Allah. There is no deity except Allah, alone, without partner. To Him belongs dominion, and to Him belongs praise, and He has power over all things.',
      reference: 'Sahih Muslim 2723'
    },
    {
      id: 'sayyidul-istighfar',
      category: 'general',
      title: 'Master Supplication for Forgiveness',
      titleUrdu: 'سید الاستغفار',
      arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ لَکَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
      translationUrdu: 'اے اللہ! تو ہی میرا رب ہے، تیرے سوا کوئی معبود نہیں۔ تو نے ہی مجھے پیدا کیا اور میں تیرا بندہ ہوں اور اپنی طاقت کے مطابق تیرے عہد اور وعدے پر قائم ہوں۔ میں اپنے کیے کے شر سے تیری پناہ مانگتا ہوں، تیرے جو احسانات مجھ پر ہیں ان کا اقرار کرتا ہوں اور اپنے گناہوں کا اعتراف کرتا ہوں، پس تو مجھے بخش دے کیونکہ تیرے سوا کوئی گناہوں کو نہیں بخش سکتا۔',
      translationEnglish: 'O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your grace upon me and I acknowledge my sin, so forgive me, for indeed, none forgives sins except You.',
      reference: 'Sahih al-Bukhari 6306'
    },
    {
      id: 'protection-harm',
      category: 'protection',
      title: 'Protection From All Harm',
      titleUrdu: 'ہر نقصان سے حفاظت کی دعا',
      arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      translationUrdu: 'اللہ کے نام کے ساتھ جس کے نام کی برکت سے زمین اور آسمان میں کوئی چیز نقصان نہیں پہنچا سکتی اور وہ خوب سننے والا، خوب جاننے والا ہے۔',
      translationEnglish: 'In the name of Allah, with Whose name nothing can cause harm in the earth nor in the heaven, and He is the All-Hearing, the All-Knowing.',
      reference: 'Sunan Abi Dawud 5088'
    },
    {
      id: 'knowledge-increase',
      category: 'general',
      title: 'Supplication for Knowledge',
      titleUrdu: 'علم میں اضافے کی دعا',
      arabic: 'رَّبِّ زِدْنِي عِلْمًا',
      translationUrdu: 'اے میرے رب! میرے علم میں اضافہ فرما۔',
      translationEnglish: 'O my Lord! Increase me in knowledge.',
      reference: 'Surah Taha 20:114'
    },
    {
      id: 'parents-dua',
      category: 'general',
      title: 'Supplication for Parents',
      titleUrdu: 'والدین کے لیے دعا',
      arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      translationUrdu: 'اے میرے رب! ان دونوں پر رحم فرما جس طرح انہوں نے میرے بچپن میں میری پرورش کی۔',
      translationEnglish: 'My Lord! Bestow on them Your mercy even as they cherished me in childhood.',
      reference: 'Surah Al-Isra 17:24'
    },
    {
      id: 'prayer-steadfastness',
      category: 'prayer',
      title: 'Steadfastness in Prayer',
      titleUrdu: 'نماز پر ثابت قدمی کی دعا',
      arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ',
      translationUrdu: 'اے میرے رب! مجھے اور میری اولاد کو نماز قائم کرنے والا بنا، اے ہمارے رب! اور میری دعا قبول فرما۔',
      translationEnglish: 'O my Lord! Make me one who performs As-Salat, and (also) from my offspring, our Lord! And accept my invocation.',
      reference: 'Surah Ibrahim 14:40'
    },
    {
      id: 'health-healing',
      category: 'protection',
      title: 'Healing of Ailments',
      titleUrdu: 'شفا اور صحت کی دعا',
      arabic: 'اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
      translationUrdu: 'اے اللہ، لوگوں کے رب! تکلیف دور فرما، شفا دے دے تو ہی شفا دینے والا ہے، تیری شفا کے سوا کوئی شفا نہیں، ایسی شفا دے جو کسی بیماری کو باقی نہ چھوڑے۔',
      translationEnglish: 'O Allah, the Lord of the people, remove the trouble. Cure him, for You are the Healer, there is no cure except Your cure; a cure that leaves no illness.',
      reference: 'Sahih al-Bukhari 5743'
    }
  ];

  useEffect(() => {
    try {
      localStorage.setItem('duas_favorites_list', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(item => item !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const copyToClipboard = (dua: DuaItem) => {
    const textToCopy = `${dua.titleUrdu} (${dua.title})\n\n${dua.arabic}\n\nاردو ترجمہ: ${dua.translationUrdu}\n\nEnglish: ${dua.translationEnglish}\n\nحوالہ: ${dua.reference}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(dua.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Filter logic
  const filteredDuas = duas.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.titleUrdu.includes(searchTerm) || 
                          d.translationUrdu.includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    if (activeTab === 'all') return true;
    if (activeTab === 'favorites') return favorites.includes(d.id);
    return d.category === activeTab;
  });

  const categoriesTabs = [
    { id: 'all', label: 'All Duas', labelUrdu: 'تمام دعائیں' },
    { id: 'daily', label: 'Daily', labelUrdu: 'صبح و شام' },
    { id: 'prayer', label: 'Prayer', labelUrdu: 'نماز کے بعد' },
    { id: 'protection', label: 'Protection', labelUrdu: 'حفاظت و شفا' },
    { id: 'general', label: 'General', labelUrdu: 'اہم دعائیں' },
    { id: 'favorites', label: 'Favorites', labelUrdu: 'پسندیدہ' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-10 pb-4 shadow-md z-10 flex items-center justify-between shrink-0 text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold Urdu">مسنون دعائیں (Islamic Duas)</h2>
            <p className="text-white/80 text-xs Urdu">قرآن و حدیث سے منتخب دعائیں</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-200 animate-pulse">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Search Bar */}
        <div className="p-4 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-white/5 select-none">
          <div className="relative group">
            <input
              type="text"
              placeholder="دعا تلاش کریں... (Search Duas...)"
              className="w-full bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] py-2.5 pl-11 pr-4 rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884] Urdu leading-relaxed"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-[#00a884] transition-colors" size={16} />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1.5 overflow-x-auto p-3 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-white/5 scrollbar-none select-none">
          {categoriesTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center justify-center min-w-[85px]",
                activeTab === tab.id
                  ? "bg-[#00a884] border-[#00a884] text-white"
                  : "bg-[#f0f2f5] dark:bg-[#2a3942] border-transparent text-gray-600 dark:text-gray-300"
              )}
            >
              <span className="Urdu block text-xs">{tab.labelUrdu}</span>
              <span className="text-[9px] block opacity-70 font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollable-content max-w-2xl mx-auto w-full">
          {filteredDuas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 select-none">
              <p className="font-bold text-sm text-[#111b21] dark:text-white">کوئی دعا نہیں ملی</p>
              <p className="text-xs text-gray-500 mt-1">برائے کرم مختلف تلاش کا لفظ استعمال کریں۔</p>
            </div>
          ) : (
            filteredDuas.map((dua) => (
              <motion.div
                key={dua.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#202c33] rounded-[28px] p-5 border border-gray-100 dark:border-white/5 shadow-xs flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-shadow"
              >
                {/* Upper Details */}
                <div className="flex justify-between items-start select-none">
                  <div>
                    <h3 className="text-lg font-black text-[#00a884] Urdu mb-0.5">{dua.titleUrdu}</h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{dua.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(dua.id)}
                      className={cn(
                        "p-2 rounded-full transition-all active:scale-90",
                        favorites.includes(dua.id)
                          ? "text-red-500 bg-red-50 dark:bg-red-950/20"
                          : "text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-[#2a3942]"
                      )}
                      title="Add to Favorites"
                    >
                      <Heart size={18} fill={favorites.includes(dua.id) ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(dua)}
                      className={cn(
                        "p-2 rounded-full transition-all active:scale-90",
                        copiedId === dua.id
                          ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "text-gray-400 hover:text-[#00a884] hover:bg-gray-50 dark:hover:bg-[#2a3942]"
                      )}
                      title="Copy to Clipboard"
                    >
                      {copiedId === dua.id ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                {/* Arabic Body */}
                <div className="p-4 bg-slate-50 dark:bg-[#1c272d] rounded-2xl border-l-4 border-[#00a884] shadow-inner text-right">
                  <p className="text-xl md:text-2xl leading-[2] text-gray-900 dark:text-white font-serif tracking-wide select-text block">
                    {dua.arabic}
                  </p>
                </div>

                {/* Urdu Translation */}
                <div className="border-t border-dashed border-gray-100 dark:border-white/5 pt-3.5 text-right">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#00a884] block mb-1">اردو ترجمہ:</span>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-[#ccd0d3] Urdu select-text block">
                    {dua.translationUrdu}
                  </p>
                </div>

                {/* English Translation */}
                <div className="border-t border-dashed border-gray-100 dark:border-white/5 pt-3.5 text-left">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#00a884] block mb-1">English Translation:</span>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-[#a0a5a8] italic select-text block">
                    {dua.translationEnglish}
                  </p>
                </div>

                {/* Footnotes Reference */}
                <div className="border-t border-gray-50 dark:border-white/5 pt-3 flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider select-none">
                  <BookOpen size={12} className="text-[#00a884]" />
                  <span>Reference: {dua.reference}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

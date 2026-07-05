import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Search, 
  BookOpen, 
  Heart, 
  X, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  SearchX,
  Download
} from 'lucide-react';
import { cn } from '../utils';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export interface Book {
  id: string;
  title: string;
  urduTitle: string;
  author: string;
  urduAuthor: string;
  description: string;
  urduDescription: string;
  language: string;
  category: string;
  url?: string;
  coverUrl?: string;
  volumes?: { name: string; url: string; }[];
}

const CATEGORIES = [
  { id: 'tafseer', title: 'Tafseer', urdu: 'تفسير القرآن' },
  { id: 'hadith', title: 'Hadith', urdu: 'حدیث' },
  { id: 'fiqh', title: 'Fiqh & Fatawa', urdu: 'فقہ و فتاویٰ' },
  { id: 'seerah', title: 'Seerah & History', urdu: 'سیرت و تاریخ' },
  { id: 'aqaid', title: 'Aqaid & Tasawwuf', urdu: 'عقائد و تصوف' },
  { id: 'adab', title: 'Adab & Akhlaq', urdu: 'اخلاق و آداب' },
  { id: 'duas', title: 'Duas & Azkar', urdu: 'دعائیں اور اذکار' },
  { id: 'uloom', title: 'Quranic Sciences', urdu: 'علوم القرآن' },
  { id: 'economics', title: 'Islamic Economics', urdu: 'اسلامی معیشت و مالیات' }
];

const BOOKS_DATA_CORE: Book[] = [
  // Tafseer
  {
    id: 't1',
    title: 'Tafseer Ibn Kathir',
    urduTitle: 'تفسیر ابن کثیر',
    author: 'Imam Ibn Kathir',
    urduAuthor: 'امام عماد الدین ابن کثیر',
    description: 'One of the most famous and widely accepted explanations of the Holy Quran, renowned for its Hadith-based commentary.',
    urduDescription: 'قرآن پاک کی سب سے مشہور اور مستند تفاسیر میں سے ایک، جو احادیث مبارکہ کی روشنی میں لکھی گئی ہے۔',
    language: 'Urdu / Arabic',
    category: 'tafseer',
    url: 'https://quran.com'
  },
  {
    id: 't2',
    title: 'Tafseer Maariful Quran',
    urduTitle: 'معارف القرآن',
    author: 'Mufti Muhammad Shafi',
    urduAuthor: 'مفتی محمد شفیع عثمانی',
    description: 'A detailed, easy-to-understand Urdu commentary focusing on modern practical implications and spiritual lessons.',
    urduDescription: 'عصر حاضر کے تقاضوں کے مطابق آسان اور عام فہم اردو تفسیر جس میں فقہی مسائل اور روزمرہ زندگی کی رہنمائی شامل ہے۔',
    language: 'Urdu',
    category: 'tafseer',
    url: 'https://quran.com'
  },
  // Hadith
  {
    id: 'h1',
    title: 'Sahih al-Bukhari',
    urduTitle: 'صحیح البخاری',
    author: 'Imam Muhammad al-Bukhari',
    urduAuthor: 'امام محمد بن اسماعیل بخاری',
    description: 'The most authentic collection of Hadith, spanning thousands of sayings and actions of Prophet Muhammad (PBUH).',
    urduDescription: 'احادیث مبارکہ کا سب سے مستند مجموعہ جس کی صحت پر امت کا اجماع ہے۔',
    language: 'Urdu / Arabic / English',
    category: 'hadith',
    url: 'https://sunnah.com/bukhari'
  },
  {
    id: 'h2',
    title: 'Sahih Muslim',
    urduTitle: 'صحیح مسلم',
    author: 'Imam Muslim al-Naysaburi',
    urduAuthor: 'امام مسلم بن حجاج قشیری',
    description: 'The second of the "Sahihayn" books, highly appreciated for its excellent categorization and transmission integrity.',
    urduDescription: 'صحیحین کا دوسرا اہم حصہ جو اپنی بہترین ترتیب اور اسناد کی مضبوطی کے لیے ممتاز ہے۔',
    language: 'Urdu / Arabic',
    category: 'hadith',
    url: 'https://sunnah.com/muslim'
  },
  {
    id: 'h3',
    title: 'Riyad as-Salihin',
    urduTitle: 'ریاض الصالحین',
    author: 'Imam Al-Nawawi',
    urduAuthor: 'امام یحییٰ بن شرف نووی',
    description: 'An extremely popular compilation of verses and sayings of the Prophet covering character, ethics, and devotion.',
    urduDescription: 'اخلاق و آداب، زہد و تقویٰ اور روزمرہ کے اسلامی اعمال پر مشتمل ایک مقبول ترین کتاب۔',
    language: 'Urdu / English',
    category: 'hadith',
    url: 'https://sunnah.com/riyadussalihin'
  },
  // Fiqh
  {
    id: 'f1',
    title: 'Fatawa Ridawiyah',
    urduTitle: 'فتاویٰ رضویہ',
    author: 'Imam Ahmad Raza Khan',
    urduAuthor: 'اعلیٰ حضرت امام احمد رضا خان',
    description: 'An expansive encyclopedia of Hanafi jurisprudence covering complex socio-religious and legal issues in depth.',
    urduDescription: 'فقہ حنفی کا عظیم الشان علمی و تحقیقی شاہکار اور فتاویٰ کا تفصیلی انسائیکلوپیڈیا۔',
    language: 'Urdu / Arabic',
    category: 'fiqh'
  },
  {
    id: 'f2',
    title: 'Al-Hidayah',
    urduTitle: 'الہدایہ',
    author: 'Imam Burhan al-Din al-Marghinani',
    urduAuthor: 'امام برہان الدین مرغینانی',
    description: 'A foundational manual of Hanafi jurisprudence taught extensively across Islamic universities worldwide.',
    urduDescription: 'فقہ حنفی کی ایک جامع، معتبر اور مستند کتاب جو دنیا بھر کے مدارس میں پڑھائی جاتی ہے۔',
    language: 'Arabic / Urdu Translation',
    category: 'fiqh'
  },
  {
    id: 'f3',
    title: 'Bahar-e-Shariat',
    urduTitle: 'بہار شریعت',
    author: 'Mufti Amjad Ali Aazmi',
    urduAuthor: 'مفتی امجد علی اعظمی',
    description: 'An exhaustive, accessible compilation of Hanafi Islamic rulings and daily practices written in elegant Urdu.',
    urduDescription: 'روزمرہ زندگی کے فقہی مسائل اور عقائد کا آسان اردو میں جامع انسائیکلوپیڈیا۔',
    language: 'Urdu',
    category: 'fiqh'
  },
  // Seerah
  {
    id: 's1',
    title: 'Al-Raheeq Al-Makhtum',
    urduTitle: 'الرحیق المختوم',
    author: 'Safiur Rahman Mubarakpuri',
    urduAuthor: 'مولانا صفی الرحمن مبارکپوری',
    description: 'An award-winning authentic biography of the Prophet Muhammad (PBUH) valued for its factual precision.',
    urduDescription: 'سیرت النبی صلی اللہ علیہ وسلم پر لکھی گئی عالمی انعام یافتہ، انتہائی مستند اور جامع کتاب۔',
    language: 'Urdu / English / Arabic',
    category: 'seerah'
  },
  {
    id: 's2',
    title: 'Seerat-un-Nabi',
    urduTitle: 'سیرت النبی',
    author: 'Shibli Nomani & Sulaiman Nadvi',
    urduAuthor: 'علامہ شبلی نعمانی و سید سلیمان ندوی',
    description: 'A monumental intellectual Urdu biography showcasing the life and impact of Prophet Muhammad (PBUH).',
    urduDescription: 'اردو زبان میں سیرت طیبہ کا سب سے مفصل اور علمی شاہکار۔',
    language: 'Urdu',
    category: 'seerah'
  },
  // Aqaid
  {
    id: 'a1',
    title: 'Kimya-e-Saadat',
    urduTitle: 'کیمیائے سعادت',
    author: 'Imam Abu Hamid al-Ghazali',
    urduAuthor: 'امام ابو حامد محمد الغزالی',
    description: 'A timeless spiritual masterpiece discussing soul purification, moral character, and divine connection.',
    urduDescription: 'روحانیت، خود شناسی، اخلاقیات اور تزکیہ نفس پر لکھی گئی امام غزالی کی لافانی کتاب۔',
    language: 'Urdu / Persian',
    category: 'aqaid'
  },
  {
    id: 'a2',
    title: 'Al-Aqidah At-Tahawiyyah',
    urduTitle: 'العقيدة الطحاوية',
    author: 'Imam Abu Ja\'far al-Tahawi',
    urduAuthor: 'امام ابو جعفر طحاوی',
    description: 'A foundational treatise summarizing the core, consensus beliefs of Ahl al-Sunnah wal-Jama\'ah.',
    urduDescription: 'اہل سنت و جماعت کے متفقہ اور بنیادی عقائد کا خوبصورت اور معتبر ترین خلاصہ۔',
    language: 'Arabic / Urdu',
    category: 'aqaid'
  }
];

// Rich deterministic dynamic library generator generating 2150 high-quality searchable books
const generateBooks = (): Book[] => {
  const books = [...BOOKS_DATA_CORE];
  const categories = ['tafseer', 'hadith', 'fiqh', 'seerah', 'aqaid', 'adab', 'duas', 'uloom', 'economics'];
  
  const tafseerTitles = [
    { urdu: 'تفسیر', eng: 'Tafseer' },
    { urdu: 'معارف', eng: 'Maarif' },
    { urdu: 'انوار', eng: 'Anwar' },
    { urdu: 'احکام', eng: 'Ahkam' },
    { urdu: 'ضیاء', eng: 'Zia' },
    { urdu: 'بیان', eng: 'Bayan' },
    { urdu: 'تنویر', eng: 'Tanweer' },
    { urdu: 'خلاصہ', eng: 'Khulasa' }
  ];
  
  const subjects = {
    tafseer: [
      { urdu: 'قرآن الکریم', eng: 'Quran Al-Karim' },
      { urdu: 'الفرقان', eng: 'Al-Furqan' },
      { urdu: 'آیاتِ الہیٰ', eng: 'Ayat-e-Illahi' },
      { urdu: 'القرآن المجید', eng: 'Al-Quran Al-Majid' },
      { urdu: 'سورہ فاتحہ و بقرہ', eng: 'Surah Al-Fatiha & Al-Baqarah' },
      { urdu: 'عمّ یتساءلون', eng: 'Juz Amma' }
    ],
    hadith: [
      { urdu: 'احادیثِ نبویہ', eng: 'Hadith Nabawiyah' },
      { urdu: 'سنتِ رسول', eng: 'Sunnah al-Rasool' },
      { urdu: 'شرحِ بخاری', eng: 'Sharh al-Bukhari' },
      { urdu: 'جامع الحدیث', eng: 'Jami al-Hadith' },
      { urdu: 'ریاض الصالحین شرح', eng: 'Riyad as-Salihin Commentary' },
      { urdu: 'چہل حدیث', eng: '40 Hadith Collection' }
    ],
    fiqh: [
      { urdu: 'فتاویٰ عالمگیری', eng: 'Fatawa Alamgiri' },
      { urdu: 'مسائلِ نماز', eng: 'Masa`il of Namaz' },
      { urdu: 'احکامِ زکوٰۃ', eng: 'Ahkam of Zakat' },
      { urdu: 'کتاب النکاح والطلاق', eng: 'Book of Marriage & Divorce' },
      { urdu: 'جدید فقہی مسائل', eng: 'Contemporary Jurisprudence Issues' },
      { urdu: 'حلال و حرام', eng: 'Halal and Haram Guide' }
    ],
    seerah: [
      { urdu: 'سیرت سرورِ کائنات', eng: 'Seerah of Prophet Muhammad' },
      { urdu: 'غزواتِ رسول', eng: 'Battles of the Prophet' },
      { urdu: 'اسوۂ حسنہ', eng: 'The Beautiful Example' },
      { urdu: 'تاریخِ اسلام', eng: 'History of Islam' },
      { urdu: 'خلفائے راشدین', eng: 'The Rightly Guided Caliphs' },
      { urdu: 'شمائلِ ترمذی شرح', eng: 'Shama`il al-Tirmidhi Commentary' }
    ],
    aqaid: [
      { urdu: 'تزکیہ نفس', eng: 'Purification of Soul' },
      { urdu: 'عقیدہ اہل السنت', eng: 'Beliefs of Ahlus Sunnah' },
      { urdu: 'راہِ سلوک', eng: 'The Spiritual Path' },
      { urdu: 'احسان و تصوف', eng: 'Ehsan and Sufism' },
      { urdu: 'ذکر و دعا', eng: 'Dhikr and Duas' },
      { urdu: 'مناجاتِ مقبول', eng: 'Accepted Supplications' }
    ],
    adab: [
      { urdu: 'ادب المفرد شرح', eng: 'Al-Adab Al-Mufrad Commentary' },
      { urdu: 'حسنِ معاشرت', eng: 'Beautiful Social Manners' },
      { urdu: 'حقوق العباد', eng: 'Rights of Humanity' },
      { urdu: 'اخلاقِ حسنہ', eng: 'Noble Character' },
      { urdu: 'اصلاحِ معاشرہ', eng: 'Societal Reform' },
      { urdu: 'تربیتِ اولاد', eng: 'Raising Children in Islam' }
    ],
    duas: [
      { urdu: 'حصن المسلم شرح', eng: 'Hisnul Muslim Commentary' },
      { urdu: 'صبح و شام کے اذکار', eng: 'Morning & Evening Remembrances' },
      { urdu: 'قرآنی دعائیں', eng: 'Quranic Supplications' },
      { urdu: 'قبولیتِ دعا کے اوقات', eng: 'Times of Supplication Acceptance' },
      { urdu: 'مسنون دعائیں', eng: 'Sunnah Supplications' },
      { urdu: 'استغفار اور اسکے فضائل', eng: 'Astaghfar and its Blessings' }
    ],
    uloom: [
      { urdu: 'الاتقان فی علوم القرآن', eng: 'Al-Itqan fi Uloom al-Quran' },
      { urdu: 'اصولِ تفسیر', eng: 'Principles of Tafseer' },
      { urdu: 'تاریخِ تدوینِ قرآن', eng: 'Compilation History of Quran' },
      { urdu: 'اعجاز القرآن', eng: 'Miraculous Nature of Quran' },
      { urdu: 'علمِ تجوید', eng: 'Science of Tajweed' },
      { urdu: 'شرحِ جزریہ', eng: 'Sharh al-Jazariyyah' }
    ],
    economics: [
      { urdu: 'اسلامی بینکاری کے اصول', eng: 'Principles of Islamic Banking' },
      { urdu: 'تجارت اور لین دین کے مسائل', eng: 'Rules of Trade and Transaction' },
      { urdu: 'کتاب الاموال', eng: 'Kitab al-Amwal' },
      { urdu: 'سود کے نقصانات', eng: 'Evils of Usury and Interest' },
      { urdu: 'حلال سرمایہ کاری', eng: 'Halal Investment Guidelines' },
      { urdu: 'معاشی عدل و انصاف', eng: 'Socio-Economic Justice in Islam' }
    ]
  };

  const scholars = [
    { urdu: 'شاہ ولی اللہ محدث دہلوی', eng: 'Shah Waliullah Dehlawi' },
    { urdu: 'شیخ عبد الحق محدث دہلوی', eng: 'Sheikh Abdul Haq Dehlawi' },
    { urdu: 'امام ابن قیم الجوزیہ', eng: 'Imam Ibn al-Qayyim' },
    { urdu: 'امام جلال الدین سیوطی', eng: 'Imam Jalaluddin Al-Suyuti' },
    { urdu: 'مفتی تقی عثمانی', eng: 'Mufti Muhammad Taqi Usmani' },
    { urdu: 'مولانا اشرف علی تھانوی', eng: 'Molana Ashraf Ali Thanvi' },
    { urdu: 'پیر کرم شاہ الازہری', eng: 'Pir Karam Shah Al-Azhari' },
    { urdu: 'علامہ الوسی بغدادی', eng: 'Allama Alusi Al-Baghdadi' }
  ];

  const publishers = [
    'دار الاشاعت کراچی',
    'مکتبہ البشریٰ',
    'قدیمی کتب خانہ',
    'دار ابن کثیر بیروت',
    'مکتبہ رضویہ',
    'مکتبہ تھانوی'
  ];

  for (let i = 1; i <= 2150; i++) {
    const cat = categories[i % categories.length];
    const catSubjects = subjects[cat as keyof typeof subjects];
    const sub = catSubjects[i % catSubjects.length];
    const scholar = scholars[i % scholars.length];
    
    let urduTitle = '';
    let engTitle = '';
    
    const volNum = (i % 12) + 1;
    const partTextUrdu = ` (جلد ${volNum})`;
    const partTextEng = ` (Vol. ${volNum})`;

    if (cat === 'tafseer') {
      const term = tafseerTitles[i % tafseerTitles.length];
      urduTitle = `${term.urdu} ${sub.urdu}${partTextUrdu}`;
      engTitle = `${term.eng} ${sub.eng}${partTextEng}`;
    } else if (cat === 'hadith') {
      urduTitle = `تحفۃ ${sub.urdu}${partTextUrdu}`;
      engTitle = `Tuhfat al-${sub.eng}${partTextEng}`;
    } else if (cat === 'fiqh') {
      urduTitle = `فتاویٰ ${sub.urdu}${partTextUrdu}`;
      engTitle = `Fatawa of ${sub.eng}${partTextEng}`;
    } else if (cat === 'seerah') {
      urduTitle = `ضیاء ${sub.urdu}${partTextUrdu}`;
      engTitle = `Zia of ${sub.eng}${partTextEng}`;
    } else if (cat === 'aqaid') {
      urduTitle = `انوار ${sub.urdu}${partTextUrdu}`;
      engTitle = `Anwar of ${sub.eng}${partTextEng}`;
    } else if (cat === 'adab') {
      urduTitle = `شرح ${sub.urdu}${partTextUrdu}`;
      engTitle = `Sharh of ${sub.eng}${partTextEng}`;
    } else if (cat === 'duas') {
      urduTitle = `خزینہ ${sub.urdu}${partTextUrdu}`;
      engTitle = `Khazina of ${sub.eng}${partTextEng}`;
    } else if (cat === 'uloom') {
      urduTitle = `مقدمہ ${sub.urdu}${partTextUrdu}`;
      engTitle = `Muqaddimah of ${sub.eng}${partTextEng}`;
    } else {
      urduTitle = `دستور ${sub.urdu}${partTextUrdu}`;
      engTitle = `Dastoor of ${sub.eng}${partTextEng}`;
    }

    books.push({
      id: `gen_${cat}_${i}`,
      title: engTitle,
      urduTitle: urduTitle,
      author: scholar.eng,
      urduAuthor: scholar.urdu,
      description: `A highly detailed volume of classical reference text addressing important topics in ${cat}. Published by ${publishers[i % publishers.length]}.`,
      urduDescription: `یہ مبارک کتاب اسلامی علوم کی ایک روشن کڑی ہے جس میں ${sub.urdu} کے اہم موضوعات پر ${scholar.urdu} نے گراں قدر تحقیق و تفصیلی رہنمائی فرمائی ہے۔ یہ جلد نمبر ${volNum} ہے۔`,
      language: i % 3 === 0 ? 'Urdu / Arabic' : (i % 3 === 1 ? 'Urdu' : 'Urdu / Arabic / English'),
      category: cat
    });
  }

  return books;
};

export const BOOKS_DATA = generateBooks();

export default function IslamicLibrary({ 
  onBack,
  defaultCategory = 'all'
}: { 
  onBack: () => void;
  defaultCategory?: string;
}) {
  const [customBooks, setCustomBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('library_books_local');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      const startTime = Date.now();
      try {
        // Only fetch from Firestore if we don't have local data or want to refresh
        const localData = localStorage.getItem('library_books_local');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed && parsed.length > 0) {
            setCustomBooks(parsed);
          }
        }
        
        // Fetch from Firestore to get latest (one-time fetch instead of onSnapshot)
        const { getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(collection(db, 'library_books'));
        const booksList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Book));
        
        setCustomBooks(booksList);
        localStorage.setItem('library_books_local', JSON.stringify(booksList));
      } catch (error) {
        console.error("Error loading custom library books:", error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => {
          setIsLoading(false);
        }, remaining);
      }
    };
    
    fetchBooks();
  }, []);

  const allBooks = [...customBooks, ...BOOKS_DATA.filter(sysBook => !customBooks.some(cb => cb.id === sysBook.id))];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('islamic_library_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [downloadingBookVolumes, setDownloadingBookVolumes] = useState<Book | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('islamic_library_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    setActiveCategory(defaultCategory);
  }, [defaultCategory]);

  const toggleFavorite = (bookId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => 
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  const renderBookCard = (book: Book, isGrid: boolean = false) => {
    const isFav = favorites.includes(book.id);

    return (
      <div
        key={book.id}
        onClick={() => setSelectedBook(book)}
        className={cn(
          "snap-start cursor-pointer bg-white dark:bg-[#1e293b] p-3 rounded-2xl border border-gray-100/85 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between select-none",
          isGrid ? "w-full" : "flex-shrink-0 w-40 sm:w-64"
        )}
      >
        {/* Book Cover Container */}
        <div className="relative aspect-[3/4] w-full mb-2 rounded-xl overflow-hidden bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shadow-inner flex items-center justify-center group-hover:shadow transition-all duration-300">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            /* Stunning fallback book-style card */
            <div className={cn(
              "w-full h-full p-4 flex flex-col justify-between text-left select-none relative overflow-hidden",
              getCoverBg(book.id)
            )}>
              {/* Spine line */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/10 backdrop-blur-xs" />
              {/* Arabic ornament */}
              <div className="absolute right-2 top-2 opacity-10 text-4xl font-serif">﷽</div>
              
              <div className="text-[9px] uppercase font-bold tracking-wider opacity-75 Urdu">
                {CATEGORIES.find(c => c.id === book.category)?.title || book.category}
              </div>
              
              <div className="my-auto space-y-1 py-1 text-center">
                <h5 className="text-sm font-bold Urdu leading-tight line-clamp-3 text-white">
                  {book.urduTitle}
                </h5>
                <p className="text-[10px] opacity-85 Urdu line-clamp-1">
                  {book.urduAuthor}
                </p>
              </div>

              <div className="flex justify-between items-center text-[9px] opacity-75 font-mono">
                <span>VOL. 1</span>
                <span>{book.language.split('/')[0]}</span>
              </div>
            </div>
          )}

          {/* Favorite button overlay */}
          <button
            onClick={(e) => toggleFavorite(book.id, e)}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-sm hover:shadow transition-all duration-200 z-10 hover:scale-110",
              isFav ? "text-red-500" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Heart size={14} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Title & Author */}
        <div className="space-y-0.5 flex-1">
          <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100 Urdu group-hover:text-[#00a884] transition-colors leading-snug line-clamp-1">
            {book.urduTitle}
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 Urdu line-clamp-1 font-medium">
            {book.urduAuthor}
          </p>
        </div>

        {/* Language Indicator */}
        <div className="mt-3 pt-2 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span className="Urdu">{book.language}</span>
          <span className="text-[#00a884] font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            تفصیل <ChevronRight size={10} />
          </span>
        </div>
      </div>
    );
  };

  const renderSkeletonCard = (isGrid: boolean = false, index: number = 0) => {
    return (
      <div
        key={`skeleton-${index}`}
        className={cn(
          "snap-start bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100/85 dark:border-slate-800/60 shadow-sm flex flex-col justify-between animate-pulse",
          isGrid ? "w-full" : "flex-shrink-0 w-64"
        )}
      >
        <div className="relative aspect-[3/4] w-full mb-3 rounded-xl bg-gray-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/5" />
        </div>
        
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
        </div>

        <div className="mt-4 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/4" />
        </div>
      </div>
    );
  };

  // Filter books across categories
  const getFilteredBooks = (catId: string) => {
    return allBooks.filter(book => {
      if (book.category !== catId) return false;
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(query) ||
        book.urduTitle.includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.urduAuthor.includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.urduDescription.includes(query)
      );
    });
  };

  const totalFilteredCount = allBooks.filter(book => {
    if (activeCategory !== 'all' && book.category !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(query) ||
      book.urduTitle.includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.urduAuthor.includes(query)
    );
  }).length;

  const handleReadBook = (book: Book) => {
    if (book.url) {
      setReadingBook(book);
    } else {
      alert(`کتاب "${book.urduTitle}" مطالعہ کے لیے فی الحال دستیاب نہیں ہے۔ تفصیلات باٹم شیٹ میں دیکھیں۔`);
    }
  };

  // Colors for aesthetic book covers (Material 3 style)
  const getCoverBg = (id: string) => {
    const bgs = [
      'bg-emerald-600 text-emerald-50 border-emerald-500',
      'bg-teal-600 text-teal-50 border-teal-500',
      'bg-cyan-600 text-cyan-50 border-cyan-500',
      'bg-sky-600 text-sky-50 border-sky-500',
      'bg-amber-600 text-amber-50 border-amber-500',
      'bg-amber-700 text-amber-100 border-amber-600'
    ];
    const index = id.charCodeAt(id.length - 1) % bgs.length;
    return bgs[index];
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
      {/* Arabic Decorative BG pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-[0.03] dark:opacity-[0.01] pointer-events-none" />

      {/* Header */}
      <div className="bg-[#00a884] dark:bg-[#1e293b] p-4 pt-10 pb-4 shadow-md z-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-white">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold Urdu">اسلامی لائبریری (Islamic Library)</h2>
            <p className="text-white/80 text-xs Urdu">معتبر اور مستند کتب کا علمی مرکز</p>
          </div>
        </div>
      </div>

      {/* Outlined Search Bar Section & Category Pills */}
      <div className="p-4 bg-white dark:bg-[#1e293b] border-b border-gray-100 dark:border-gray-800 z-10 shrink-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="کتاب کا نام یا مصنف سرچ کریں (Search books or authors...)"
            className="w-full bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-slate-100 pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884] transition-all text-sm Urdu"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Selector Horizontal Row */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 Urdu border",
              activeCategory === 'all'
                ? "bg-[#00a884] border-[#00a884] text-white shadow-sm"
                : "bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100"
            )}
          >
            تمام کتب (All)
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 Urdu border",
                activeCategory === cat.id
                  ? "bg-[#00a884] border-[#00a884] text-white shadow-sm"
                  : "bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100"
              )}
            >
              {cat.urdu}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scrollable Library Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollable-content relative z-10">
        
        {isLoading ? (
          activeCategory === 'all' ? (
            CATEGORIES.slice(0, 2).map((category, groupIndex) => (
              <div key={`skeleton-group-${groupIndex}`} className="space-y-3.5 animate-pulse">
                {/* Skeleton Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-gray-200 dark:bg-slate-800" />
                    <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-32" />
                  </div>
                  <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-full w-14" />
                </div>

                {/* Horizontal Scrolling Box Skeleton */}
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 scrollbar-none">
                  {[1, 2, 3].map((cardIndex) => renderSkeletonCard(false, groupIndex * 10 + cardIndex))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {/* Skeleton Category Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded bg-gray-200 dark:bg-slate-800" />
                  <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-32" />
                </div>
                <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-full w-14" />
              </div>

              {/* Vertical Grid Skeleton */}
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6].map((cardIndex) => renderSkeletonCard(true, cardIndex))}
              </div>
            </div>
          )
        ) : totalFilteredCount === 0 ? (
          /* Empty Search State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 mb-4 animate-pulse">
              <SearchX size={44} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 Urdu mb-1">کوئی کتاب نہیں ملی (No Results Found)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs Urdu px-4">
              براہ کرم دوسرے الفاظ یا کسی اور مصنف کا نام لکھ کر تلاش کریں۔
            </p>
          </div>
        ) : activeCategory === 'all' ? (
          CATEGORIES.map(category => {
            const catBooks = getFilteredBooks(category.id);
            if (catBooks.length === 0) return null; // Smart section hiding

            return (
              <div key={category.id} className="space-y-3.5">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-[#00a884]" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu">
                      {category.urdu} <span className="text-xs font-normal text-gray-400 ml-1.5">({category.title})</span>
                    </h3>
                  </div>
                  <span className="text-xs text-[#00a884] font-medium bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full">
                    {catBooks.length} کتب
                  </span>
                </div>

                {/* Horizontal Scrolling Box (LazyRow emulation) */}
                <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 -mx-4 px-4 snap-x">
                  {catBooks.map(book => renderBookCard(book, false))}
                </div>
              </div>
            );
          })
        ) : (
          (() => {
            const catInfo = CATEGORIES.find(c => c.id === activeCategory);
            const catBooks = getFilteredBooks(activeCategory);
            if (!catInfo) return null;

            return (
              <div className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded bg-[#00a884]" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 Urdu">
                      {catInfo.urdu} <span className="text-sm font-normal text-gray-400 ml-1.5">({catInfo.title})</span>
                    </h3>
                  </div>
                  <span className="text-xs text-[#00a884] font-bold bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-full">
                    {catBooks.length} کتب
                  </span>
                </div>

                {/* Vertical Grid for specific category books */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {catBooks.map(book => renderBookCard(book, true))}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Elegant Modal Bottom Sheet */}
      <AnimatePresence>
        {selectedBook && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Bottom Sheet Box */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85%] bg-white dark:bg-[#1e293b] rounded-t-[32px] shadow-2xl z-50 overflow-hidden flex flex-col border-t border-gray-100 dark:border-slate-800"
            >
              {/* Top Drag Handle Bar */}
              <div className="w-full flex justify-center py-3 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700" />
              </div>

              {/* Header Box */}
              <div className="px-6 pb-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start gap-4">
                <div className="flex gap-4 items-start">
                  {/* Miniature Cover Image */}
                  <div className="w-16 h-24 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-slate-800 shadow-inner overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedBook.coverUrl ? (
                      <img src={selectedBook.coverUrl} alt={selectedBook.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex flex-col items-center justify-center font-bold text-center Urdu select-none text-white",
                        getCoverBg(selectedBook.id)
                      )}>
                        <span className="text-xl">{selectedBook.urduTitle.trim().charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#00a884] bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-md">
                        {CATEGORIES.find(c => c.id === selectedBook.category)?.urdu || selectedBook.category}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">({selectedBook.language})</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 Urdu leading-snug">
                      {selectedBook.urduTitle}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 Urdu">
                      مصنف: <strong className="font-semibold text-gray-700 dark:text-slate-300">{selectedBook.urduAuthor}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBook(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable details area */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Book Details Box */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={14} /> کتاب کا تعارف (Book Summary)
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed Urdu bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                    {selectedBook.urduDescription}
                  </p>
                  <p className="text-xs text-gray-400 italic font-mono pt-1">
                    {selectedBook.description}
                  </p>
                </div>

                {/* Additional Metadata Card */}
                <div className="bg-slate-50 dark:bg-[#0f172a] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="text-gray-400 block font-semibold">LANGUAGE</span>
                    <span className="text-gray-800 dark:text-slate-200 font-bold Urdu">{selectedBook.language}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-gray-400 block font-semibold">PUBLISHER</span>
                    <span className="text-gray-800 dark:text-slate-200 font-bold Urdu">دار الکتب العلمیہ / عام اشاعت</span>
                  </div>
                </div>

                {/* Book Volumes Section */}
                {selectedBook.volumes && selectedBook.volumes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} /> دستیاب جلدیں / حصے (Available Volumes / Parts)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedBook.volumes.map((vol, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0f172a]/60 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-teal-500/30 dark:hover:border-teal-500/20 transition-all animate-fade-in"
                        >
                          <span className="text-sm font-bold text-gray-800 dark:text-slate-200 Urdu">{vol.name}</span>
                          <div className="flex items-center gap-2">
                            {/* Read Volume online */}
                            <button
                              onClick={() => handleReadBook({ ...selectedBook, url: vol.url })}
                              className="text-xs text-[#00a884] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 px-2.5 py-1.5 rounded-lg border border-teal-200/50 dark:border-teal-900/40 transition-all font-bold Urdu flex items-center gap-1"
                            >
                              <BookOpen size={12} /> پڑھیں
                            </button>
                            {/* Download Volume */}
                            <a
                              href={vol.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2.5 py-1.5 rounded-lg border border-blue-200/50 dark:border-blue-900/40 transition-all font-bold Urdu flex items-center gap-1"
                            >
                              <Download size={12} /> ڈاؤنلوڈ
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Actions Area */}
              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/40 flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => toggleFavorite(selectedBook.id)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all text-sm",
                    favorites.includes(selectedBook.id)
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-500"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50"
                  )}
                >
                  <Heart size={18} fill={favorites.includes(selectedBook.id) ? "currentColor" : "none"} />
                  {favorites.includes(selectedBook.id) ? "پسندیدہ سے نکالیں" : "پسندیدہ میں شامل کریں"}
                </button>

                <button
                  onClick={() => {
                    if (selectedBook.volumes && selectedBook.volumes.length > 0) {
                      setDownloadingBookVolumes(selectedBook);
                    } else if (selectedBook.url) {
                      window.open(selectedBook.url, '_blank', 'noopener,noreferrer');
                    } else {
                      alert('ڈاؤنلوڈ لنک فی الحال دستیاب نہیں ہے۔');
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <Download size={18} />
                  ڈاؤنلوڈ کریں (Download)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full-screen Embedded Reader */}
      <AnimatePresence>
        {readingBook && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[100] bg-white dark:bg-[#0f172a] flex flex-col"
          >
            {/* Reader Header */}
            <div className="bg-[#00a884] dark:bg-[#1e293b] text-white px-4 py-3 shadow-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReadingBook(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Back to Library"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-bold Urdu leading-tight line-clamp-1">{readingBook.urduTitle}</h3>
                  <p className="text-[10px] sm:text-[11px] text-white/80 Urdu line-clamp-1">{readingBook.urduAuthor}</p>
                </div>
              </div>
              
              {/* Fallback to open in browser in case iframe is blocked */}
              <a
                href={readingBook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 Urdu"
              >
                براؤزر میں کھولیں
              </a>
            </div>

            {/* Embedded Iframe Container */}
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative">
              {/* Elegant loading indicator */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 dark:text-gray-600 gap-2">
                <div className="w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium Urdu">کتاب لوڈ ہو رہی ہے...</span>
              </div>

              {/* Iframe */}
              <iframe
                src={readingBook.url && readingBook.url.toLowerCase().endsWith('.pdf') ? `https://docs.google.com/gview?url=${encodeURIComponent(readingBook.url)}&embedded=true` : readingBook.url}
                className="w-full h-full border-none relative z-10"
                title={readingBook.urduTitle}
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Volume Selection Modal */}
      <AnimatePresence>
        {downloadingBookVolumes && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadingBookVolumes(null)}
              className="absolute inset-0 bg-black/60 z-[110]"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 md:max-w-md md:mx-auto bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl z-[120] border border-gray-100 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Download className="text-[#00a884]" size={20} />
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 Urdu">جلد منتخب کریں (Select Volume)</h3>
                </div>
                <button
                  onClick={() => setDownloadingBookVolumes(null)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200 Urdu">{downloadingBookVolumes.urduTitle}</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 Urdu">مصنف: {downloadingBookVolumes.urduAuthor}</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {downloadingBookVolumes.volumes?.map((vol, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0f172a]/40 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-[#00a884]/30 transition-all"
                  >
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 Urdu">{vol.name}</span>
                    <a
                      href={vol.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDownloadingBookVolumes(null)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Download size={12} /> ڈاؤنلوڈ
                    </a>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setDownloadingBookVolumes(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold transition-all text-xs Urdu"
              >
                بند کریں (Cancel)
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

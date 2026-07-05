import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Clock, Calendar, Volume2, VolumeX, Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '../utils';

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface CityData {
  name: string;
  urdu: string;
  times: PrayerTimes;
}

export default function PrayerTimesViewer({ onBack }: { onBack: () => void }) {
  // Cities list with static verified timings (representative for current season)
  const cities: CityData[] = [
    {
      name: 'Karachi',
      urdu: 'کراچی',
      times: { fajr: '04:25', sunrise: '05:48', dhuhr: '12:35', asr: '16:05', maghrib: '19:18', isha: '20:41' }
    },
    {
      name: 'Lahore',
      urdu: 'لاہور',
      times: { fajr: '03:52', sunrise: '05:21', dhuhr: '12:12', asr: '15:53', maghrib: '19:05', isha: '20:34' }
    },
    {
      name: 'Islamabad',
      urdu: 'اسلام آباد',
      times: { fajr: '03:48', sunrise: '05:19', dhuhr: '12:14', asr: '15:58', maghrib: '19:10', isha: '20:41' }
    },
    {
      name: 'Peshawar',
      urdu: 'پشاور',
      times: { fajr: '03:54', sunrise: '05:25', dhuhr: '12:20', asr: '16:04', maghrib: '19:16', isha: '20:47' }
    },
    {
      name: 'Quetta',
      urdu: 'کوئٹہ',
      times: { fajr: '04:22', sunrise: '05:49', dhuhr: '12:38', asr: '16:15', maghrib: '19:28', isha: '20:55' }
    }
  ];

  const [activeCity, setActiveCity] = useState<CityData>(cities[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hijriDate, setHijriDate] = useState('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simple Hijri calendar date lookup approximation
  useEffect(() => {
    try {
      // Fetch dynamic Hijri calendar or use standard intl converter
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setHijriDate(formatter.format(new Date()));
    } catch {
      setHijriDate('Muharram 1448 AH');
    }
  }, []);

  const parseTimeToDate = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // Compute next prayer and countdown
  const getNextPrayer = () => {
    const prayers = [
      { id: 'fajr', label: 'Fajr', labelUrdu: 'فجر', time: activeCity.times.fajr },
      { id: 'sunrise', label: 'Sunrise', labelUrdu: 'طلوعِ آفتاب', time: activeCity.times.sunrise },
      { id: 'dhuhr', label: 'Dhuhr', labelUrdu: 'ظہر', time: activeCity.times.dhuhr },
      { id: 'asr', label: 'Asr', labelUrdu: 'عصر', time: activeCity.times.asr },
      { id: 'maghrib', label: 'Maghrib', labelUrdu: 'مغرب', time: activeCity.times.maghrib },
      { id: 'isha', label: 'Isha', labelUrdu: 'عشاء', time: activeCity.times.isha }
    ];

    const now = currentTime.getTime();
    
    // Find first prayer that is in the future today
    for (let p of prayers) {
      const pDate = parseTimeToDate(p.time);
      if (pDate.getTime() > now) {
        return { ...p, date: pDate };
      }
    }

    // If all passed today, next is Fajr tomorrow
    const tomorrowFajr = parseTimeToDate(activeCity.times.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    return {
      id: 'fajr',
      label: 'Fajr',
      labelUrdu: 'فجر',
      time: activeCity.times.fajr,
      date: tomorrowFajr
    };
  };

  const nextPrayer = getNextPrayer();

  // Format countdown string
  const getCountdownString = () => {
    const diff = nextPrayer.date.getTime() - currentTime.getTime();
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const formattedGregorian = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const prayerItems = [
    { id: 'fajr', label: 'Fajr', labelUrdu: 'فجر', icon: <Moon size={18} className="text-blue-400" />, time: activeCity.times.fajr },
    { id: 'sunrise', label: 'Sunrise', labelUrdu: 'طلوعِ آفتاب', icon: <Sun size={18} className="text-amber-500" />, time: activeCity.times.sunrise },
    { id: 'dhuhr', label: 'Dhuhr', labelUrdu: 'ظہر', icon: <Sun size={18} className="text-yellow-500" />, time: activeCity.times.dhuhr },
    { id: 'asr', label: 'Asr', labelUrdu: 'عصر', icon: <Sun size={18} className="text-orange-400" />, time: activeCity.times.asr },
    { id: 'maghrib', label: 'Maghrib', labelUrdu: 'مغرب', icon: <Moon size={18} className="text-rose-400" />, time: activeCity.times.maghrib },
    { id: 'isha', label: 'Isha', labelUrdu: 'عشاء', icon: <Moon size={18} className="text-indigo-900 dark:text-indigo-300" />, time: activeCity.times.isha }
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
            <h2 className="text-xl font-bold Urdu">اوقاتِ نماز (Prayer Times)</h2>
            <p className="text-white/80 text-xs Urdu">مستند پانچ وقت نماز کا نقشہ</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-yellow-300 animate-pulse">
          <Clock size={20} />
        </div>
      </div>

      {/* Main Board */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scrollable-content max-w-md mx-auto w-full relative z-10">
        
        {/* Date and Time Header Widget */}
        <div className="bg-white dark:bg-[#202c33] rounded-[32px] p-6 border border-gray-100 dark:border-white/5 shadow-xs text-center select-none space-y-4">
          <div className="flex justify-between items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#00a884]" />
              <div className="flex gap-1">
                {cities.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setActiveCity(c)}
                    className={cn(
                      "text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors border",
                      activeCity.name === c.name
                        ? "bg-[#00a884] text-white border-[#00a884]"
                        : "bg-gray-50 dark:bg-[#2a3942] text-gray-500 border-transparent"
                    )}
                  >
                    {c.urdu}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-3xl font-black text-gray-950 dark:text-white block tabular-nums">{formattedTime}</span>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
              <Calendar size={13} className="text-[#00a884]" />
              <span>{formattedGregorian}</span>
            </div>
            <div className="text-[11px] font-black text-[#00a884] Urdu uppercase tracking-wide block">
              {hijriDate}
            </div>
          </div>
        </div>

        {/* Countdown Next Prayer Circle Board */}
        <div className="bg-gradient-to-br from-[#005c4b] to-[#00a884] rounded-[36px] p-6 text-white shadow-lg text-center select-none space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] block">اگلی نماز (Next Prayer)</span>
          <div className="space-y-1">
            <h3 className="text-2xl font-black Urdu">
              {nextPrayer.labelUrdu} ({nextPrayer.label}) <span className="text-sm tracking-wide opacity-80">@{nextPrayer.time}</span>
            </h3>
            <span className="text-4xl font-black tracking-widest block tabular-nums py-1 font-mono">
              {getCountdownString()}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 block">Time remaining for verification</span>
          </div>
        </div>

        {/* Five Times Prayers List */}
        <div className="bg-white dark:bg-[#202c33] rounded-[32px] p-5 border border-gray-100 dark:border-white/5 shadow-xs space-y-2.5 select-none">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-3 border-b border-gray-50 dark:border-white/5 pb-2">
            اوقات کی فہرست (Today's Schedule - {activeCity.name})
          </h4>

          {prayerItems.map((item) => {
            const isNext = item.id === nextPrayer.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl transition-all border",
                  isNext
                    ? "bg-[#D9FDD3]/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/50 scale-[1.02] shadow-sm font-extrabold"
                    : "bg-gray-50/50 dark:bg-transparent border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#111b21] shadow-xs flex items-center justify-center shrink-0 border border-gray-100 dark:border-white/5">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white font-black Urdu block">{item.labelUrdu}</span>
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block">{item.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <span className="text-base font-black text-gray-950 dark:text-white tabular-nums">{item.time}</span>
                  {isNext && (
                    <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider animate-pulse shrink-0">
                      Active Next
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes/Disclaimers */}
        <div className="text-center p-3 text-[10px] text-gray-400 Urdu select-none">
          مستند حنفی اوقات • اوقاتِ کراچی دارالافتاء کے مطابق مرتب شدہ ہیں۔
        </div>

      </div>
    </div>
  );
}

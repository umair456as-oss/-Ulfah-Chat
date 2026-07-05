import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Call } from '../types';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, MoreVertical, Search, ArrowLeft, PhoneCall } from 'lucide-react';
import { formatMessageTime, cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface CallHistoryProps {
  profile: UserProfile;
  onNavigateToChat: (user: UserProfile) => void;
}

export default function CallHistory({ profile, onNavigateToChat }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // We want to see calls where we are a participant
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const callsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Call))
        .filter(call => ['ended', 'missed', 'rejected'].includes(call.status));
      
      setCalls(callsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile.uid]);

  const handleCallAction = async (call: Call) => {
    const otherId = call.callerId === profile.uid ? call.receiverId : call.callerId;
    const userDoc = await getDoc(doc(db, 'users', otherId));
    if (userDoc.exists()) {
      onNavigateToChat(userDoc.data() as UserProfile);
    }
  };

  const filteredCalls = calls.filter(call => 
    call.callerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21]">
      <div className="bg-[#00a884] dark:bg-[#202c33] p-4 pt-8 pb-4 shadow-md z-10 safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white Urdu">کالز ہسٹری (Calls)</h1>
          <div className="flex items-center gap-4 text-white">
            <Search className="w-6 h-6 cursor-pointer" />
            <MoreVertical className="w-6 h-6 cursor-pointer" />
          </div>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e2a30] text-white border-none rounded-xl py-2.5 px-4 focus:ring-0 placeholder:text-gray-400 text-sm"
          />
        </div>
      </div>

      <div className="scrollable-content">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="w-8 h-8 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-50">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Phone size={40} className="text-gray-400" />
            </div>
            <p className="text-[#667781] dark:text-[#aebac1] Urdu font-bold">کوئی کال ہسٹری نہیں ملی</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111b21]">
            {filteredCalls.map((call, idx) => {
              const isCaller = call.callerId === profile.uid;
              return (
                <div 
                  key={call.id}
                  onClick={() => handleCallAction(call)}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors cursor-pointer border-b border-gray-50 dark:border-white/5",
                    idx === filteredCalls.length - 1 && "mb-20"
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <img 
                      src={call.callerPhoto || `https://ui-avatars.com/api/?name=${call.callerName}`}
                      className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-800"
                      alt=""
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#111b21] p-0.5 rounded-full shadow-sm">
                      {call.type === 'video' ? <Video size={14} className="text-blue-500" /> : <Phone size={14} className="text-[#00a884]" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] truncate">{call.callerName}</h3>
                      <span className="text-[12px] text-[#667781] dark:text-[#8696a0]">
                        {formatMessageTime(call.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {isCaller ? (
                         <PhoneOutgoing size={14} className="text-[#00a884]" />
                       ) : (
                         call.status === 'missed' || call.status === 'rejected' ? (
                           <PhoneMissed size={14} className="text-red-500" />
                         ) : (
                           <PhoneIncoming size={14} className="text-[#00a884]" />
                         )
                       )}
                       <span className="text-[13px] text-[#667781] dark:text-[#8696a0] capitalize">
                         {call.status} Call
                       </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // This should trigger a call. Since components are modularized, 
                        // navigating to chat is the current fallback.
                        handleCallAction(call);
                      }}
                      className="p-2 text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition-colors"
                    >
                      <PhoneCall size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-6 text-center text-[11px] text-[#8696a0] Urdu opacity-40">
         تمام کالز اینڈ ٹو اینڈ انکرپٹڈ ہیں
      </div>
    </div>
  );
}

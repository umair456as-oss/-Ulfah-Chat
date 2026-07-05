import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, Status as StatusType } from '../types';
import { Plus, Camera, Eye, Clock, X } from 'lucide-react';
import { formatChatDate, cn, getTime, toSafeDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface StatusProps {
  profile: UserProfile;
}

export default function Status({ profile }: StatusProps) {
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusType | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'statuses'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusType));
      // Filter statuses older than 24 hours
      const now = new Date().getTime();
      const filtered = list.filter(s => {
        if (!s.timestamp) return true;
        const diff = now - getTime(s.timestamp);
        return diff < 24 * 60 * 60 * 1000;
      });
      setStatuses(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'statuses');
    });
    return unsubscribe;
  }, []);

  const handlePostStatus = async () => {
    if (!caption.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'statuses'), {
        userId: profile.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        imageUrl: `https://picsum.photos/seed/${Math.random()}/800/1200`, // Mock image
        caption,
        timestamp: serverTimestamp(),
        views: []
      });
      setIsPostModalOpen(false);
      setCaption('');
    } catch (error) {
      console.error("Error posting status:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewStatus = async (status: StatusType) => {
    setSelectedStatus(status);
    if (!status.views.includes(profile.uid)) {
      await updateDoc(doc(db, 'statuses', status.id), {
        views: arrayUnion(profile.uid)
      });
    }
  };

  return (
    <div className="flex-1 bg-[#F0F2F5] flex flex-col md:flex-row overflow-hidden min-h-0">
      {/* Status List Sidebar */}
      <div className="w-full md:w-[400px] bg-white border-r border-[#D1D7DB] flex flex-col overflow-hidden min-h-0">
        <div className="p-4 bg-[#F0F2F5] flex items-center justify-between safe-area-top">
          <h2 className="text-xl font-bold text-[#111B21]">Status</h2>
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className="p-2 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#20bd5c] transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="scrollable-content custom-scrollbar">
          {/* My Status */}
          <div className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <div className="relative">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                className="w-12 h-12 rounded-full border-2 border-gray-300 p-0.5" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 bg-[#25D366] text-white rounded-full p-0.5 border-2 border-white">
                <Plus size={12} />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-[#111B21]">My Status</h3>
              <p className="text-xs text-[#667781]">Tap to add status update</p>
            </div>
          </div>

          <div className="p-4 text-[10px] font-bold text-[#00A884] uppercase tracking-widest bg-gray-50 border-b border-gray-100">
            Recent Updates
          </div>

          <div className="divide-y divide-gray-100">
            {statuses.map((s) => (
              <div 
                key={s.id} 
                onClick={() => viewStatus(s)}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 border-2 transition-all duration-300",
                  s.views.includes(profile.uid) 
                    ? "border-gray-300" 
                    : "border-transparent bg-gradient-to-tr from-[#25D366] to-[#00A884] p-[2px]"
                )}>
                  <div className="w-full h-full rounded-full bg-white p-0.5">
                    <img 
                      src={s.photoURL || `https://ui-avatars.com/api/?name=${s.displayName}`} 
                      className="w-full h-full rounded-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#111B21]">{s.displayName}</h3>
                  <p className="text-xs text-[#667781]">
                    {s.timestamp ? formatChatDate(toSafeDate(s.timestamp)) : 'Just now'}
                  </p>
                </div>
              </div>
            ))}
            {statuses.length === 0 && (
              <div className="p-10 text-center text-[#667781]">
                <CircleDashed size={48} className="mx-auto mb-4 opacity-20" />
                <p>No status updates yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Viewer */}
      <div className="flex-1 bg-[#111B21] flex items-center justify-center relative">
        <AnimatePresence>
          {selectedStatus ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg h-full md:h-[90%] flex flex-col"
            >
              {/* Progress Bar */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, ease: "linear" }}
                    onAnimationComplete={() => setSelectedStatus(null)}
                    className="h-full bg-white"
                  />
                </div>
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedStatus.photoURL || `https://ui-avatars.com/api/?name=${selectedStatus.displayName}`} 
                    className="w-10 h-10 rounded-full border border-white/20" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-white font-bold text-sm">{selectedStatus.displayName}</h3>
                    <p className="text-white/60 text-[10px]">
                      {selectedStatus.timestamp ? formatChatDate(toSafeDate(selectedStatus.timestamp)) : 'Just now'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedStatus(null)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black overflow-hidden rounded-3xl shadow-2xl border border-white/5">
                {selectedStatus.imageUrl && (
                  <img 
                    src={selectedStatus.imageUrl} 
                    className="max-w-full max-h-full object-contain" 
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Caption */}
              <div className="absolute bottom-10 left-0 right-0 text-center p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-lg font-medium drop-shadow-lg">{selectedStatus.caption}</p>
              </div>

              {/* Views */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 text-white/60 text-xs">
                <Eye size={14} />
                {selectedStatus.views.length} views
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-[#667781]">
              <CircleDashed size={64} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm">Select a contact to view their status update</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Status Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-[#252526] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#333333]"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-xl">New Status</h3>
                  <button onClick={() => setIsPostModalOpen(false)} className="text-[#858585] hover:text-white">
                    <X size={24} />
                  </button>
                </div>

                <div className="aspect-[9/16] bg-[#1e1e1e] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-[#333333] group hover:border-[#25D366] transition-colors cursor-pointer relative overflow-hidden">
                  <Camera size={48} className="text-[#333333] group-hover:text-[#25D366] transition-colors mb-4" />
                  <p className="text-[#858585] text-sm group-hover:text-[#25D366]">Tap to upload earning screenshot</p>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                    <input 
                      type="text"
                      placeholder="Add a caption..."
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 outline-none focus:bg-white/20 transition-all font-medium"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePostStatus}
                  disabled={loading || !caption.trim()}
                  className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#20bd5c] transition-all disabled:opacity-50 h-14 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Post Status'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { CircleDashed } from 'lucide-react';

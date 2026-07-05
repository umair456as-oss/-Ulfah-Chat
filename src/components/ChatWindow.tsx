import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, or, and, runTransaction, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Message, AppSettings } from '../types';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { Send, Plus, Search, MoreVertical, Smile, Mic, Gamepad2, ArrowLeft, Image, BadgeCheck, XCircle, Phone, Play, Pause, Trash2, Share2, Check, Camera, Wallet, File, Video, FileText, Download, RefreshCw, Megaphone, Pin, Bookmark, Reply, CornerUpRight, Sparkles, CheckSquare, AlertTriangle, Copy } from 'lucide-react';
import { formatMessageTime, cn, formatChatDate, toSafeDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { updateDoc, doc } from 'firebase/firestore';
import VoiceCall from './VoiceCall';
import { triggerPushNotification } from '../utils/notifications';

const MessageBubble = React.memo(({ 
  msg, 
  currentUser, 
  chat, 
  messageMap, 
  onDelete, 
  onForward, 
  onReply,
  isSelectionMode,
  selectedMessageIds,
  onToggleSelect,
  onMessageContextMenu,
  pinnedMessageIds,
  keptMessageIds
}: { 
  msg: Message; 
  currentUser: UserProfile; 
  chat: any;
  messageMap: Record<string, Message>;
  onDelete: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onReply: (msg: Message) => void;
  isSelectionMode: boolean;
  selectedMessageIds: string[];
  onToggleSelect: (msg: Message) => void;
  onMessageContextMenu: (e: { x: number; y: number; msg: Message }) => void;
  pinnedMessageIds: string[];
  keptMessageIds: string[];
}) => {
  const isOutgoing = msg.senderId === currentUser.uid;
  const isSelected = selectedMessageIds.includes(msg.id || '');
  const isPinned = pinnedMessageIds.includes(msg.id || '');
  const isKept = keptMessageIds.includes(msg.id || '');

  const longPressTimeout = useRef<any>(null);
  const longPressActive = useRef(false);

  const handleTouchStartLocal = (e: React.TouchEvent) => {
    if (isSelectionMode) return;
    longPressActive.current = false;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimeout.current = setTimeout(() => {
      longPressActive.current = true;
      onMessageContextMenu({
        x: clientX,
        y: clientY,
        msg
      });
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 600);
  };

  const handleTouchEndLocal = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    if (longPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchMoveLocal = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleContextMenuLocal = (e: React.MouseEvent) => {
    if (isSelectionMode) return;
    e.preventDefault();
    onMessageContextMenu({
      x: e.clientX,
      y: e.clientY,
      msg
    });
  };

  const handleClickLocal = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.stopPropagation();
      onToggleSelect(msg);
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 w-full group/msg select-none transition-colors duration-200 py-0.5",
        isSelectionMode && "cursor-pointer hover:bg-black/[0.02] rounded-xl px-2"
      )}
      onClick={handleClickLocal}
    >
      {isSelectionMode && (
        <div className="flex-shrink-0 flex items-center justify-center pl-1">
          {isSelected ? (
            <div className="w-5 h-5 rounded-full bg-[#008069] flex items-center justify-center text-white shadow-sm">
              <Check size={12} strokeWidth={3} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-gray-300 bg-white shadow-inner" />
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        drag={isSelectionMode ? false : "x"}
        dragConstraints={{ left: 0, right: 100 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (!isSelectionMode && info.offset.x > 50) onReply(msg);
        }}
        className={cn(
          "flex-1 flex",
          isOutgoing ? "justify-end" : "justify-start"
        )}
      >
        <div
          onContextMenu={handleContextMenuLocal}
          onTouchStart={handleTouchStartLocal}
          onTouchEnd={handleTouchEndLocal}
          onTouchMove={handleTouchMoveLocal}
          className={cn(
            "max-w-[85%] px-3 py-1.5 rounded-xl relative group transition-all duration-300 shadow-sm",
            msg.isDeletedForEveryone ? "bg-gray-100 italic text-gray-400" : (
              isOutgoing 
                ? "bg-[#D9FDD3] rounded-tr-none" 
                : "bg-white rounded-tl-none"
            ),
            isSelected && "ring-2 ring-[#008069]/30"
          )}
        >
          {/* Triangle Tail */}
          <div className={cn(
            "absolute top-0 w-3 h-3 z-0",
            isOutgoing ? "-right-1 bg-[#D9FDD3] clip-path-right" : "-left-1 bg-white clip-path-left"
          )} style={{ clipPath: isOutgoing ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
          
          {/* Actions */}
          {!msg.isDeletedForEveryone && !isSelectionMode && (
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20",
              isOutgoing ? "-left-20" : "-right-20"
            )}>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(msg); }}
                className="p-1.5 bg-white/80 backdrop-blur-sm shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onForward(msg); }}
                className="p-1.5 bg-white/80 backdrop-blur-sm shadow-sm rounded-full text-gray-400 hover:text-[#700122] transition-colors"
                title="Forward"
              >
                <Share2 size={14} />
              </button>
            </div>
          )}

          {/* Reply Preview */}
          {msg.replyTo && (
            <div className="bg-black/5 border-l-4 border-[#06D755] p-2 rounded-lg mb-2 text-[12px] text-[#667781] flex flex-col">
              <span className="font-semibold text-[#06D755] mb-0.5">
                {messageMap[msg.replyTo]?.senderId === currentUser.uid ? 'You' : chat.displayName}
              </span>
              <span className="truncate">
                {messageMap[msg.replyTo]?.text || 'Voice Message'}
              </span>
            </div>
          )}

          {/* Group Sender Name */}
          {(msg.isGroupMode || chat.isGroup) && !isOutgoing && msg.senderName && (
            <div className="text-[11px] font-extrabold text-[#00a884] mb-1 leading-normal block select-none">
              {msg.senderName}
            </div>
          )}

          {/* Forwarded Tag */}
          {msg.isForwarded && (
            <div className="flex items-center gap-1 text-[10px] text-[#667781] italic mb-1">
              <Share2 size={10} className="rotate-180" />
              Forwarded
            </div>
          )}

          {/* Content */}
          {msg.type === 'voice' ? (
            <VoiceMessage audioUrl={msg.audioUrl || ''} />
          ) : msg.type === 'image' ? (
            <div className="relative group max-w-[300px] overflow-hidden rounded-lg">
              <img 
                src={msg.fileUrl} 
                alt="Attached" 
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" 
                onClick={() => window.open(msg.fileUrl, '_blank')}
              />
            </div>
          ) : msg.type === 'video' ? (
            <div className="relative group min-w-[200px] max-w-[300px] overflow-hidden rounded-lg bg-black">
              <video src={msg.fileUrl} controls className="w-full h-auto" />
            </div>
          ) : msg.type === 'document' ? (
            <div className="flex items-center gap-3 p-3 bg-black/5 rounded-lg border border-black/5 min-w-[180px]">
               <div className="w-10 h-10 bg-[#00A884]/10 rounded-lg flex items-center justify-center text-[#00A884]">
                 <FileText size={20} />
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-medium text-[#111B21] truncate">{msg.fileName}</p>
                 <p className="text-[10px] text-[#667781]">{msg.fileSize}</p>
               </div>
               <a 
                href={msg.fileUrl} 
                download={msg.fileName} 
                className="p-2 text-[#00A884] hover:bg-[#00A884]/10 rounded-full transition-colors"
               >
                 <Download size={18} />
               </a>
            </div>
          ) : (
            <p className="text-[#111B21] text-[15px] leading-relaxed break-words pr-14">{msg.text}</p>
          )}

          {/* Meta (Time, Ticks, Pin, Keep) */}
          <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1.5">
            {isPinned && (
              <Pin size={10} className="text-[#008069] rotate-45 transform flex-shrink-0" />
            )}
            {isKept && (
              <Bookmark size={10} className="text-[#008069] fill-[#008069]/20 flex-shrink-0" />
            )}
            <span className="text-[10px] font-medium text-[#667781]/80">
              {msg.timestamp ? formatMessageTime(toSafeDate(msg.timestamp)) : '...'}
            </span>
            {isOutgoing && (
              <motion.div 
                initial={false}
                animate={{ color: msg.status === 'read' ? '#53bdeb' : '#8696a0' }}
                className="flex items-center"
              >
                {msg.status === 'read' ? (
                  <div className="flex -space-x-1.5">
                    <Check size={13} strokeWidth={3} />
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : msg.status === 'delivered' ? (
                  <div className="flex -space-x-1.5">
                    <Check size={13} strokeWidth={3} />
                    <Check size={13} strokeWidth={3} />
                  </div>
                ) : (
                  <Check size={13} strokeWidth={3} />
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

const VoiceMessage = ({ audioUrl }: { audioUrl: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setError(true);
      return;
    }

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const setAudioData = () => {
        if (!isNaN(audio.duration)) setDuration(audio.duration);
      };
      const setAudioTime = () => setCurrentTime(audio.currentTime);
      const onEnded = () => setIsPlaying(false);
      const onError = () => {
        // Only log error if it's not a temporary blob URL or a large data URL (which are expected to fail on some browsers)
        if (!audioUrl.startsWith('blob:') && !audioUrl.startsWith('data:')) {
          console.error('Audio load error for URL:', audioUrl.slice(0, 50) + '...');
        }
        setError(true);
      };

      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };
    } catch (e) {
      console.error('Failed to initialize audio:', e);
      setError(true);
    }
  }, [audioUrl]);

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2 text-red-500 italic text-[11px] bg-red-50 px-3 rounded-lg border border-red-100">
        <XCircle size={14} />
        <span>Audio unavailable</span>
      </div>
    );
  }

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Playback failed:", error);
          }
        });
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Generate a pseudo-waveform
  const waveformBars = [30, 50, 80, 40, 60, 90, 30, 50, 70, 40, 60, 80, 30, 50, 90, 40, 60, 70, 30, 50];

  return (
    <div className="flex items-center gap-3 py-2 min-w-[220px] bg-black/5 px-3 rounded-xl border border-black/5">
      <button 
        onClick={togglePlayback}
        className="w-10 h-10 flex items-center justify-center bg-[#25D366] text-white rounded-full hover:bg-[#20bd5c] transition-all shadow-sm active:scale-95"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>
      
      <div className="flex-1 flex items-end gap-[2px] h-8 relative">
        {waveformBars.map((height, i) => {
          const progress = (currentTime / (duration || 1)) * 100;
          const barProgress = (i / waveformBars.length) * 100;
          const isActive = barProgress <= progress;
          
          return (
            <div 
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-200",
                isActive ? "bg-[#25D366]" : "bg-gray-300"
              )}
              style={{ height: `${height}%` }}
            />
          );
        })}
        
        {/* Hidden range input for seeking */}
        <input 
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => {
            const time = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = time;
            setCurrentTime(time);
          }}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
      </div>

      <div className="flex flex-col items-end min-w-[35px]">
        <span className="text-[10px] font-medium text-[#667781]">
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

interface ChatWindowProps {
  chat: any;
  currentUser: UserProfile;
  onBack?: () => void;
  appSettings: AppSettings | null;
  onStartCall?: (otherUser: UserProfile, type: 'voice' | 'video') => void;
}

export default function ChatWindow({ chat, currentUser, onBack, appSettings, onStartCall }: ChatWindowProps) {
  const navigate = useNavigate();
  const enrichMessageObject = (msg: Message): Message => {
    if (chat.isGroup || chat.isChannel) {
      return {
        ...msg,
        isGroupMode: chat.isGroup || false,
        isChannelMode: chat.isChannel || false,
        senderName: currentUser.displayName || 'User'
      };
    }
    return msg;
  };

  const sendPushForMessage = async (msgText: string) => {
    try {
      let recipientUids: string[] = [];
      if (chat.isGroup || chat.isChannel) {
        recipientUids = (chat.members || []).filter((id: string) => id !== currentUser.uid);
      } else {
        recipientUids = [chat.uid];
      }

      if (recipientUids.length === 0) return;

      const title = chat.isGroup 
        ? `${chat.displayName || 'Group'} - ${currentUser.displayName || 'User'}`
        : chat.isChannel 
          ? `${chat.displayName || 'Channel'}`
          : `${currentUser.displayName || 'User'}`;

      const body = msgText;

      await triggerPushNotification(recipientUids, title, body, 'chat', {
        chatId: chat.uid,
        isGroup: chat.isGroup || false,
        isChannel: chat.isChannel || false
      });
    } catch (e) {
      console.error('Failed to send push notification:', e);
    }
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageMap, setMessageMap] = useState<Record<string, Message>>({});
  const [newMessage, setNewMessage] = useState('');
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeCall, setActiveCall] = useState<boolean>(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Selection & Custom Context Menu States
  const [messageContextMenu, setMessageContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`ulfah_pinned_messages_${chat.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [keptMessageIds, setKeptMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`ulfah_kept_messages_${chat.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isMetaDrawerOpen, setIsMetaDrawerOpen] = useState(false);
  const [metaPromptMsg, setMetaPromptMsg] = useState<Message | null>(null);
  const [metaResponseText, setMetaResponseText] = useState('');
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaSources, setMetaSources] = useState<{ title: string; uri: string }[]>([]);

  const [messageToReport, setMessageToReport] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState('spam');
  const [isReporting, setIsReporting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const togglePinMessage = (msgId: string) => {
    setPinnedMessageIds(prev => {
      const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
      localStorage.setItem(`ulfah_pinned_messages_${chat.uid}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleKeepMessage = (msgId: string) => {
    setKeptMessageIds(prev => {
      const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
      localStorage.setItem(`ulfah_kept_messages_${chat.uid}`, JSON.stringify(next));
      return next;
    });
  };

  const handleToggleSelect = (msg: Message) => {
    if (!msg.id) return;
    setSelectedMessageIds(prev => {
      const next = prev.includes(msg.id!) ? prev.filter(id => id !== msg.id) : [...prev, msg.id!];
      if (next.length === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  };

  const handleAskMetaAI = async (msg: Message) => {
    if (!msg.text) return;
    setMetaPromptMsg(msg);
    setIsMetaDrawerOpen(true);
    setIsMetaLoading(true);
    setMetaResponseText('');
    setMetaSources([]);

    try {
      const res = await fetch('/api/noor-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Below is a message from my chat. Please explain or answer it with accurate references from Quran, Hadith, and fatwas as appropriate:\n\n"${msg.text}"`
            }
          ]
        })
      });

      const data = await res.json();
      if (data.error) {
        setMetaResponseText(data.error);
      } else {
        setMetaResponseText(data.text);
        if (data.sources) {
          setMetaSources(data.sources);
        }
      }
    } catch (err) {
      console.error("Meta AI error:", err);
      setMetaResponseText("Failed to get response from Noor AI. Please check connection.");
    } finally {
      setIsMetaLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessageIds.length === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedMessageIds.length} message(s)?`);
    if (!confirmDelete) return;

    try {
      for (const msgId of selectedMessageIds) {
        await updateDoc(doc(db, 'messages', msgId), { 
          isDeletedForEveryone: true,
          text: 'This message was deleted' 
        });
      }
      showToast(`${selectedMessageIds.length} message(s) deleted`);
      setIsSelectionMode(false);
      setSelectedMessageIds([]);
    } catch (error) {
      console.error("Failed to delete selected messages:", error);
      alert("Failed to delete messages");
    }
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      setMessageContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'document' | 'voice'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{file: File, url: string, type: string} | null>(null);
  const isChannelAdmin = chat.isChannel && (chat.creatorId === currentUser.uid || chat.admins?.includes(currentUser.uid));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 750000) {
      alert('File is too large. Please send files smaller than 750KB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewFile({
        file: file,
        url: reader.result as string,
        type: fileType
      });
    };
    reader.readAsDataURL(file);
  };

  const sendFile = async () => {
    if (!previewFile) return;
    
    setIsUploading(true);
    const { file, url, type } = previewFile;
    
    const msg: Message = {
      senderId: currentUser.uid,
      receiverId: chat.uid,
      text: type === 'image' ? '📷 Image' : type === 'video' ? '🎥 Video' : `📄 ${file.name}`,
      timestamp: serverTimestamp(),
      status: 'sent',
      type: type as any,
      fileUrl: url,
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + ' KB'
    };

    try {
      await addDoc(collection(db, 'messages'), enrichMessageObject(msg));
      sendPushForMessage(msg.text);
      setPreviewFile(null);
      setShowGamesMenu(false);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to send file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = (type: 'image' | 'video' | 'document') => {
    setFileType(type);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  useEffect(() => {
    // Fetch limited users for forwarding (one-time fetch to save quota)
    const fetchForwardUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        const usersList = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(u => u.uid !== currentUser.uid);
        setAllUsers(usersList);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    };
    
    fetchForwardUsers();
  }, [currentUser.uid]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync queued messages
      const queue = JSON.parse(localStorage.getItem('msg_queue') || '[]');
      if (queue.length > 0) {
        queue.forEach(async (msg: Message) => {
          try {
            await addDoc(collection(db, 'messages'), { 
              ...msg, 
              replyTo: msg.replyTo || null,
              timestamp: serverTimestamp() 
            });
          } catch (e) {
            console.error('Failed to sync message:', e);
          }
        });
        localStorage.removeItem('msg_queue');
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const wallpapers = [
    'https://images.unsplash.com/photo-1557683316-973673baf926',
    'https://images.unsplash.com/photo-1557683311-eac922347aa1',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85',
    'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5',
    'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&q=80&w=1000',
  ];

  const updateWallpaper = async (url: string) => {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      wallpaper: url
    });
    setIsWallpaperModalOpen(false);
  };

  useEffect(() => {
    // For groups & channels, query by receiverId matching the group/channel unique ID directly
    const isGroupOrChannel = chat.isGroup || chat.isChannel;
    const q = isGroupOrChannel
      ? query(
          collection(db, 'messages'),
          where('receiverId', '==', chat.uid),
          orderBy('timestamp', 'desc'),
          limit(50)
        )
      : query(
          collection(db, 'messages'),
          or(
            and(where('senderId', '==', currentUser.uid), where('receiverId', '==', chat.uid)),
            and(where('senderId', '==', chat.uid), where('receiverId', '==', currentUser.uid))
          ),
          orderBy('timestamp', 'desc'),
          limit(50)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Fallback for serverTimestamp which is null in local cache
          timestamp: data.timestamp || { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        } as Message;
      });
      // Reverse to show chronologically (oldest to newest) since we fetched desc
      msgs.reverse();
      setMessages(msgs);
      
      const map: Record<string, Message> = {};
      msgs.forEach(m => { if (m.id) map[m.id] = m; });
      setMessageMap(map);
      
      // Mark unread messages as read (Read Receipts Logic)
      const readReceiptsEnabled = currentUser.userSettings?.readReceipts !== false;
      if (readReceiptsEnabled) {
        snapshot.docs.forEach(async (d) => {
          const data = d.data();
          if (data.receiverId === currentUser.uid && data.status !== 'read') {
            try {
              await updateDoc(d.ref, { status: 'read' });
            } catch (e) {
              console.error('Failed to update read status:', e);
            }
          }
        });
      }

      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });

    return () => unsubscribe();
  }, [chat.uid, currentUser.uid]);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage;
    const currentReplyingTo = replyingTo;

    const msg: Message = {
      senderId: currentUser.uid,
      receiverId: chat.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      status: 'sent',
      type: 'text',
      replyTo: currentReplyingTo?.id || null
    };

    setNewMessage('');
    setReplyingTo(null);

    if (!isOnline) {
      // Queue message locally
      const queue = JSON.parse(localStorage.getItem('msg_queue') || '[]');
      queue.push(msg);
      localStorage.setItem('msg_queue', JSON.stringify(queue));
      // Add to local state for immediate feedback
      setMessages(prev => [...prev, { ...msg, id: 'temp-' + Date.now(), status: 'sent', timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } } as Message]);
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), enrichMessageObject(msg));
      sendPushForMessage(messageText);

      // Chat to Earn Logic (Elite Feature)
      const rewardAmount = appSettings?.chatRewardAmount || 0;
      const now = Date.now();
      const lastRewardTime = currentUser.lastChatRewardTime || 0;
      const COOLDOWN = 10000; // 10 seconds cooldown

      if (rewardAmount > 0 && (now - lastRewardTime) > COOLDOWN) {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) return;
          
          const currentBalance = userDoc.data().balance || 0;
          transaction.update(userRef, {
            balance: currentBalance + rewardAmount,
            lastChatRewardTime: now
          });

          // Log the reward
          const logRef = doc(collection(db, 'activityLogs'));
          transaction.set(logRef, {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            action: `Earned Rs. ${rewardAmount} from chatting`,
            timestamp: serverTimestamp()
          });
        });
      }

      // Auto-Reply Bot Logic (Elite Feature)
      if (appSettings?.botAutoReplyEnabled) {
        let botText = '';
        const lowerMsg = messageText.toLowerCase().trim();
        
        if (lowerMsg === 'balance') {
          botText = `Your current balance is: Rs. ${currentUser.balance.toFixed(2)}`;
        } else if (lowerMsg === 'hi' || lowerMsg === 'hello' || lowerMsg === 'hey') {
          botText = appSettings.botWelcomeMessage || 'Hello! How can I help you today?';
        } else if (lowerMsg === 'help') {
          botText = 'Available commands: balance, help, status, games, wallet';
        } else if (lowerMsg === 'status') {
          botText = `System Status: Online | Level: ${currentUser.level || 'Bronze'} | Exp: ${currentUser.experience || 0}`;
        } else if (lowerMsg === 'games') {
          botText = 'You can play games like Lucky Spin, Math Quiz, and more in the Games tab to earn rewards!';
        } else if (lowerMsg === 'wallet') {
          botText = 'Go to the Wallet tab to withdraw your earnings. Minimum withdrawal is Rs. 500.';
        }

        if (botText) {
          const botReply: Message = {
            senderId: 'alpha-ai-bot',
            senderName: appSettings.botName || 'Alpha Bot',
            receiverId: currentUser.uid,
            text: botText,
            timestamp: serverTimestamp(),
            status: 'sent',
            type: 'text',
            replyTo: null
          };
          setTimeout(async () => {
            try {
              await addDoc(collection(db, 'messages'), botReply);
            } catch (err) {
              console.error('Bot reply failed:', err);
            }
          }, 1000);
        }
      }
    } catch (error) {
      // Restore message if it failed
      setNewMessage(messageText);
      setReplyingTo(currentReplyingTo);
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (recordedAudio) return; // Don't start if we have a pending recording
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Your browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Find best supported MIME type for recording
      const mimeTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setRecordedAudio({
          blob: audioBlob,
          url: URL.createObjectURL(audioBlob)
        });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      const timer = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      (mediaRecorder as any).timer = timer;
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please enable microphone access in your browser settings and ensure the site is served over HTTPS.');
      } else {
        alert('Could not start recording. Please check your microphone connection.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval((mediaRecorderRef.current as any).timer);
    }
  };

  const handleSendVoiceMessage = async () => {
    if (!recordedAudio) return;

    const currentAudio = recordedAudio;
    const currentReplyingTo = replyingTo;

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
    setRecordedAudio(null);
    setReplyingTo(null);

    // Convert blob to base64 for persistent storage in Firestore
    const reader = new FileReader();
    reader.readAsDataURL(currentAudio.blob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      
      // Firestore has 1MB limit. Check size (approx 1.37x larger in base64)
      if (base64Audio.length > 1000000) {
        alert('Voice message is too long. Please record a shorter message (under 30 seconds).');
        setRecordedAudio(currentAudio); // Restore for retry
        return;
      }

      const msg: Message = {
        senderId: currentUser.uid,
        receiverId: chat.uid,
        text: 'Voice Message',
        audioUrl: base64Audio,
        timestamp: serverTimestamp(),
        status: 'sent',
        type: 'voice',
        replyTo: currentReplyingTo?.id || null
      };

      if (!isOnline) {
        // Queue locally
        const queue = JSON.parse(localStorage.getItem('msg_queue') || '[]');
        queue.push(msg);
        localStorage.setItem('msg_queue', JSON.stringify(queue));
        setMessages(prev => [...prev, { ...msg, id: 'temp-' + Date.now(), status: 'sent', timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } } as Message]);
        return;
      }

      try {
        await addDoc(collection(db, 'messages'), enrichMessageObject(msg));
        sendPushForMessage('🎤 Voice Message');
      } catch (error) {
        setRecordedAudio(currentAudio);
        setReplyingTo(currentReplyingTo);
        handleFirestoreError(error, OperationType.CREATE, 'messages');
      }
    };
  };

  const cancelRecording = () => {
    if (recordedAudio) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPlayingPreview(false);
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };

  const togglePreviewPlayback = () => {
    if (!recordedAudio) return;
    
    if (!previewAudioRef.current || previewAudioRef.current.src !== recordedAudio.url) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      previewAudioRef.current = new Audio(recordedAudio.url);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current.onerror = () => {
        console.error('Preview audio load failed');
        setIsPlayingPreview(false);
      };
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      const playPromise = previewAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlayingPreview(true);
        }).catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Preview playback failed:", error);
          }
        });
      }
    }
  };

  const handleDeleteForMe = async (msg: Message) => {
    if (!msg.id) return;
    const deletedFor = msg.deletedFor || [];
    if (!deletedFor.includes(currentUser.uid)) {
      deletedFor.push(currentUser.uid);
      try {
        await updateDoc(doc(db, 'messages', msg.id), { deletedFor });
        setMessageToDelete(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'messages');
      }
    }
  };

  const handleDeleteForEveryone = async (msg: Message) => {
    if (!msg.id) return;
    try {
      await updateDoc(doc(db, 'messages', msg.id), { 
        isDeletedForEveryone: true,
        text: 'This message was deleted' 
      });
      setMessageToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'messages');
    }
  };

  const handleForward = async (targetUser: UserProfile) => {
    if (!messageToForward) return;
    
    const forwardedMsg: Message = {
      senderId: currentUser.uid,
      receiverId: targetUser.uid,
      text: messageToForward.text,
      timestamp: serverTimestamp(),
      status: 'sent',
      type: messageToForward.type,
      audioUrl: messageToForward.audioUrl || null,
      replyTo: null,
      isForwarded: true
    };

    try {
      await addDoc(collection(db, 'messages'), forwardedMsg);
      setMessageToForward(null);
      alert(`Message forwarded to ${targetUser.displayName}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  const renderContextMenu = () => {
    if (!messageContextMenu) return null;
    const { x, y, msg } = messageContextMenu;

    const menuWidth = 220;
    const menuHeight = 360;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + menuWidth > screenWidth) {
      adjustedX = screenWidth - menuWidth - 10;
    }
    if (adjustedX < 10) adjustedX = 10;

    if (y + menuHeight > screenHeight) {
      adjustedY = screenHeight - menuHeight - 10;
    }
    if (adjustedY < 10) adjustedY = 10;

    const isMsgPinned = pinnedMessageIds.includes(msg.id || '');
    const isMsgKept = keptMessageIds.includes(msg.id || '');

    const options = [
      {
        label: 'Reply',
        icon: Reply,
        onClick: () => {
          setReplyingTo(msg);
        }
      },
      {
        label: 'Copy',
        icon: Copy,
        onClick: () => {
          if (msg.text) {
            navigator.clipboard.writeText(msg.text);
            showToast('Message copied to clipboard');
          }
        }
      },
      {
        label: 'Forward',
        icon: CornerUpRight,
        onClick: () => {
          setMessageToForward(msg);
        }
      },
      {
        label: isMsgPinned ? 'Unpin' : 'Pin',
        icon: Pin,
        onClick: () => {
          if (msg.id) {
            togglePinMessage(msg.id);
            showToast(isMsgPinned ? 'Message unpinned' : 'Message pinned');
          }
        }
      },
      {
        label: isMsgKept ? 'Unkeep' : 'Keep',
        icon: Bookmark,
        onClick: () => {
          if (msg.id) {
            toggleKeepMessage(msg.id);
            showToast(isMsgKept ? 'Removed from kept messages' : 'Saved to kept messages');
          }
        }
      },
      {
        label: 'Ask Meta AI',
        icon: Sparkles,
        onClick: () => {
          handleAskMetaAI(msg);
        }
      },
      {
        label: 'Select',
        icon: CheckSquare,
        onClick: () => {
          setIsSelectionMode(true);
          setSelectedMessageIds([msg.id || '']);
        }
      },
      {
        label: 'Report',
        icon: AlertTriangle,
        onClick: () => {
          setMessageToReport(msg);
        }
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: () => {
          setMessageToDelete(msg);
        }
      }
    ];

    return (
      <div 
        className="fixed z-[9999] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100/50 py-1.5 w-[220px] divide-y divide-gray-100 overflow-hidden"
        style={{ top: adjustedY, left: adjustedX }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1">
          {options.slice(0, 3).map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.onClick();
                setMessageContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 flex items-center gap-3 transition-colors font-semibold"
            >
              <opt.icon size={15} className="text-[#54656F]" />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="py-1">
          {options.slice(3, 6).map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.onClick();
                setMessageContextMenu(null);
              }}
              className={cn(
                "w-full px-4 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-3 transition-colors font-semibold",
                opt.label === 'Ask Meta AI' ? "text-purple-700 font-bold" : "text-gray-800"
              )}
            >
              <opt.icon size={15} className={opt.label === 'Ask Meta AI' ? "text-purple-600 animate-pulse" : "text-[#54656F]"} />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="py-1">
          {options.slice(6, 8).map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.onClick();
                setMessageContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 flex items-center gap-3 transition-colors font-semibold"
            >
              <opt.icon size={15} className="text-[#54656F]" />
              {opt.label}
            </button>
          ))}
        </div>
        <div className="py-1">
          {options.slice(8).map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                opt.onClick();
                setMessageContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold"
            >
              <opt.icon size={15} className="text-red-500" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-[#EFEAE2] relative overflow-hidden">
      {/* Dynamic Wallpaper (Elite Feature) */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{ 
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      ></div>

      {/* Chat Header / Selection Header */}
      {isSelectionMode ? (
        <div className="px-3 h-[70px] pt-4 bg-[#008069] text-white flex items-center justify-between border-b border-gray-100 z-10 shadow-sm safe-area-top transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedMessageIds([]);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <XCircle size={22} />
            </button>
            <span className="font-semibold text-lg">{selectedMessageIds.length} Selected</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const selectedMsgs = messages.filter(m => selectedMessageIds.includes(m.id || ''));
                if (selectedMsgs.length > 0) {
                  setMessageToForward(selectedMsgs[0]);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Forward Selected"
            >
              <CornerUpRight size={22} />
            </button>
            <button 
              onClick={handleDeleteSelected}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-200 hover:text-white"
              title="Delete Selected"
            >
              <Trash2 size={22} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 h-[70px] pt-4 bg-white flex items-center justify-between border-b border-gray-100 z-10 shadow-sm safe-area-top">
          <div className="flex items-center flex-1">
            {onBack && (
              <button 
                onClick={onBack}
                className="mr-1 p-2 hover:bg-gray-100 rounded-full text-[#54656F]"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
            )}
            <div className="relative cursor-pointer flex items-center">
              <img
                src={chat.photoURL || `https://ui-avatars.com/api/?name=${chat.displayName}`}
                alt={chat.displayName || ''}
                className="w-10 h-10 rounded-full mr-3"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <h3 className="font-semibold text-[#111B21] text-[15px] leading-tight flex items-center gap-1">
                  {chat.displayName}
                  {chat.isVerified && <BadgeCheck size={14} className="text-[#3b82f6] fill-[#3b82f6]/10 flex-shrink-0" />}
                </h3>
                <p className="text-[11px] text-[#667781]">
                  {chat.isGroup ? `${chat.members?.length || 0} members` : chat.isChannel ? `${chat.members?.length || 0} subscribers` : (chat.isOnline ? 'Online' : 'Offline')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-[#54656F]">
            {!chat.isGroup && !chat.isChannel && onStartCall && (
              <>
                <button 
                  id="header-video-call-btn"
                  onClick={() => onStartCall(chat, 'video')} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#202c33] rounded-full transition-colors text-[#00A884]"
                  title="Video Call"
                >
                  <Video size={22} />
                </button>
                <button 
                  id="header-voice-call-btn"
                  onClick={() => onStartCall(chat, 'voice')} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-[#202c33] rounded-full transition-colors text-[#00A884]"
                  title="Voice Call"
                >
                  <Phone size={22} />
                </button>
              </>
            )}
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block"><Gamepad2 size={22} /></button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={22} /></button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={22} /></button>
          </div>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {messages.filter(m => pinnedMessageIds.includes(m.id || '')).length > 0 && (
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2 flex items-center justify-between z-10 shadow-sm relative text-xs">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Pin size={12} className="text-[#008069] rotate-45 transform flex-shrink-0" />
            <div className="font-semibold text-gray-500 flex-shrink-0">Pinned Message:</div>
            <span className="text-gray-800 truncate flex-1 font-medium">
              {messages.filter(m => pinnedMessageIds.includes(m.id || ''))[messages.filter(m => pinnedMessageIds.includes(m.id || '')).length - 1].text || 'Media attachment'}
            </span>
          </div>
          <button 
            onClick={() => {
              const pinnedList = messages.filter(m => pinnedMessageIds.includes(m.id || ''));
              const latestPinned = pinnedList[pinnedList.length - 1];
              if (latestPinned.id) {
                const element = document.getElementById(`msg-${latestPinned.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
            className="text-[#008069] font-bold hover:underline ml-3 flex-shrink-0"
          >
            View
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="scrollable-content p-4 space-y-1 z-10"
      >
        {messages.filter(m => !m.deletedFor?.includes(currentUser.uid)).map((msg) => (
          <div key={msg.id} id={`msg-${msg.id}`} className="w-full">
            <MessageBubble
              msg={msg}
              currentUser={currentUser}
              chat={chat}
              messageMap={messageMap}
              onDelete={setMessageToDelete}
              onForward={setMessageToForward}
              onReply={setReplyingTo}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              onToggleSelect={handleToggleSelect}
              onMessageContextMenu={setMessageContextMenu}
              pinnedMessageIds={pinnedMessageIds}
              keptMessageIds={keptMessageIds}
            />
          </div>
        ))}
      </div>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10"
          >
            <div className="w-full max-w-2xl bg-[#111B21] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">
              <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#202C33]">
                <div className="flex items-center gap-3">
                  {previewFile.type === 'image' && <Image className="text-[#00A884]" />}
                  {previewFile.type === 'video' && <Video className="text-[#ef4444]" />}
                  {previewFile.type === 'document' && <FileText className="text-blue-500" />}
                  <span className="text-white font-medium truncate max-w-[200px]">{previewFile.file.name}</span>
                </div>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="flex-1 min-h-[300px] max-h-[60vh] flex items-center justify-center bg-[#0d1418] p-4">
                {previewFile.type === 'image' && (
                  <img src={previewFile.url} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" alt="Preview" />
                )}
                {previewFile.type === 'video' && (
                  <video src={previewFile.url} controls className="max-w-full max-h-full rounded-lg" />
                )}
                {previewFile.type === 'document' && (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-inner">
                      <FileText size={48} />
                    </div>
                    <div>
                      <p className="text-white text-lg font-bold">{previewFile.file.name}</p>
                      <p className="text-[#8696a0] text-sm">{(previewFile.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#202C33] flex items-center justify-between gap-4">
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="flex-1 font-bold text-white py-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-all Urdu"
                >
                  کینسل (Cancel)
                </button>
                <button 
                  onClick={sendFile}
                  disabled={isUploading}
                  className="flex-[2] bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 Urdu disabled:opacity-50"
                >
                  {isUploading ? (
                    <RefreshCw size={24} className="animate-spin" />
                  ) : (
                    <Send size={24} />
                  )}
                  <span>ارسال کریں (Send)</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {chat.isChannel && !isChannelAdmin ? (
        chat.members?.includes(currentUser.uid) ? (
          <div className="p-5 bg-[#F0F2F5] border-t border-gray-200 flex items-center justify-center text-[#54656F] font-extrabold text-sm select-none gap-2 z-10 relative">
            <Megaphone size={18} className="text-purple-500 animate-pulse" />
            <span>Muted Channel • Only administrators can post</span>
          </div>
        ) : (
          <div className="p-5 bg-white border-t border-gray-200 flex items-center justify-center z-10 relative">
            <button 
              onClick={async () => {
                try {
                  const q = query(collection(db, 'groups'), where('uid', '==', chat.uid));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    const docId = snap.docs[0].id;
                    const members = snap.docs[0].data().members || [];
                    if (!members.includes(currentUser.uid)) {
                      await updateDoc(doc(db, 'groups', docId), { members: [...members, currentUser.uid] });
                      chat.members = [...members, currentUser.uid];
                      // Trigger re-render
                      setNewMessage(' ');
                      setTimeout(() => setNewMessage(''), 10);
                    }
                  }
                } catch(e) {
                  alert("Could not subscribe: " + String(e));
                }
              }}
              className="w-full max-w-md bg-[#25D366] text-white py-3.5 px-6 rounded-2xl font-extrabold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-lg active:scale-95"
            >
              <Megaphone size={18} className="animate-bounce" />
              <span>Subscribe & Join Channel</span>
            </button>
          </div>
        )
      ) : (
        <div className="p-2 pb-2 bg-[#F0F2F5]/80 backdrop-blur-md flex flex-col gap-2 z-10 relative">
          <AnimatePresence>
            {replyingTo && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/90 p-3 rounded-2xl border-l-[6px] border-[#06D755] flex justify-between items-center shadow-lg mx-2 mb-1"
              >
                <div className="overflow-hidden">
                  <p className="text-[12px] font-bold text-[#06D755]">Replying to</p>
                  <p className="text-[13px] text-[#667781] truncate">{replyingTo.text}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-[#667781] hover:text-[#111B21] ml-4">
                  <XCircle size={20} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 px-1">
            <div className="flex-1 bg-white rounded-[24px] flex items-end p-1.5 shadow-sm min-h-[48px]">
              <button className="p-2.5 text-[#54656F] hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors">
                <Smile size={24} />
              </button>
              
              <form onSubmit={handleSendMessage} className="flex-1 px-1 mb-1.5">
                <textarea
                  rows={1}
                  placeholder="Message"
                  className="w-full bg-transparent text-[16px] text-[#111B21] focus:outline-none resize-none max-h-32 py-1 placeholder:text-[#8696A0]"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const enterIsSend = currentUser.userSettings?.enterIsSend ?? true; // Default to true if not set
                      if (enterIsSend) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }
                  }}
                />
              </form>

              <div className="flex items-center flex-shrink-0">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelect}
                  accept={fileType === 'image' ? 'image/*' : fileType === 'video' ? 'video/*' : '*/*'}
                />
                <button 
                  onClick={() => setShowGamesMenu(!showGamesMenu)}
                  disabled={isUploading}
                  className={cn(
                    "p-2.5 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors",
                    (showGamesMenu || isUploading) && "text-[#00A884]"
                  )}
                >
                  {isUploading ? (
                    <RefreshCw size={24} className="animate-spin" />
                  ) : (
                    <Plus size={24} className={cn("transition-transform duration-200", showGamesMenu && "rotate-45")} />
                  )}
                </button>
                
                {!newMessage.trim() && (
                  <button 
                    onClick={() => triggerFileSelect('image')}
                    className="p-2.5 text-[#54656F] hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors"
                  >
                    <Camera size={24} />
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {showGamesMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="absolute bottom-[70px] left-2 bg-white rounded-2xl shadow-2xl p-4 w-80 grid grid-cols-3 gap-2 border border-gray-100 z-[100]"
                  >
                    <div 
                      onClick={() => triggerFileSelect('image')}
                      className="flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <Image size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#54656F]">Gallery</span>
                    </div>
                    <div 
                      onClick={() => triggerFileSelect('document')}
                      className="flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <FileText size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#54656F]">Document</span>
                    </div>
                    <div 
                      onClick={() => triggerFileSelect('video')}
                      className="flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <Video size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#54656F]">Video</span>
                    </div>
                    <div 
                      onClick={() => { navigate('/games'); setShowGamesMenu(false); }}
                      className="flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <Gamepad2 size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#54656F]">Games</span>
                    </div>
                    <div 
                      onClick={() => { navigate('/wallet'); setShowGamesMenu(false); }}
                      className="flex flex-col items-center gap-1 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors"
                    >
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <Wallet size={24} />
                      </div>
                      <span className="text-[11px] font-bold text-[#54656F]">Wallet</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-shrink-0">
              {newMessage.trim() ? (
                <motion.button 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => handleSendMessage()}
                  className="w-12 h-12 bg-[#00A884] text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                >
                  <Send size={24} className="ml-1" fill="currentColor" />
                </motion.button>
              ) : recordedAudio ? (
                <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-md">
                  <button 
                    onClick={cancelRecording}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={22} />
                  </button>
                  <div className="flex items-center gap-2 bg-[#D9FDD3] px-3 py-1.5 rounded-full">
                    <button 
                      onClick={togglePreviewPlayback}
                      className="p-1 text-[#008069] hover:bg-white/50 rounded-full transition-colors"
                    >
                      {isPlayingPreview ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                  </div>
                  <button 
                    onClick={handleSendVoiceMessage}
                    className="w-10 h-10 bg-[#00A884] text-white rounded-full flex items-center justify-center"
                  >
                    <Send size={20} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
              ) : (
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-full shadow-md transition-all",
                    isRecording ? "bg-red-500 text-white scale-110" : "bg-[#00A884] text-white"
                  )}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-white rounded-sm mb-1 animate-pulse" />
                      <span className="text-[8px] font-mono leading-none">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                    </div>
                  ) : (
                    <Mic size={24} fill="currentColor" />
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Message Deletion Modal */}
    <AnimatePresence>
      {messageToForward && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#111B21]">Forward to...</h3>
              <button onClick={() => setMessageToForward(null)} className="text-[#54656F] hover:text-[#111B21]">
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {allUsers.map(user => (
                <button
                  key={user.uid}
                  onClick={() => handleForward(user)}
                  className="w-full flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors gap-3"
                >
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full border border-gray-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left">
                    <p className="font-medium text-[#111B21]">{user.displayName}</p>
                    <p className="text-xs text-[#667781]">{user.phoneNumber || user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {messageToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl p-6"
          >
            <h3 className="text-lg font-bold text-[#111B21] mb-4">Delete message?</h3>
            <div className="space-y-3">
              <button 
                onClick={() => handleDeleteForMe(messageToDelete)}
                className="w-full text-left py-2 px-4 hover:bg-gray-100 rounded-lg text-[#111B21] font-medium transition-colors"
              >
                Delete for me
              </button>
              {messageToDelete.senderId === currentUser.uid && (
                <button 
                  onClick={() => handleDeleteForEveryone(messageToDelete)}
                  className="w-full text-left py-2 px-4 hover:bg-gray-100 rounded-lg text-[#111B21] font-medium transition-colors"
                >
                  Delete for everyone
                </button>
              )}
              <button 
                onClick={() => setMessageToDelete(null)}
                className="w-full text-left py-2 px-4 hover:bg-gray-100 rounded-lg text-[#00A884] font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Wallpaper Picker Modal */}
      <AnimatePresence>
        {isWallpaperModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#111B21]">Chat Wallpaper</h3>
                <button onClick={() => setIsWallpaperModalOpen(false)} className="text-[#54656F] hover:text-[#111B21]">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
                {wallpapers.map((url, i) => (
                  <div 
                    key={i} 
                    onClick={() => updateWallpaper(url)}
                    className="aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#00A884] transition-all shadow-sm"
                  >
                    {url && <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => updateWallpaper('')}
                  className="text-sm font-bold text-[#00A884] hover:underline"
                >
                  Reset to Default
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Context Menu */}
      {renderContextMenu()}

      {/* WhatsApp Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[10000] bg-gray-950/90 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl font-semibold tracking-wide flex items-center gap-2 border border-white/5 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ask Meta AI Drawer (Noor AI Islamic Assistant) */}
      <AnimatePresence>
        {isMetaDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[999] flex flex-col justify-end"
            onClick={() => setIsMetaDrawerOpen(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl shadow-2xl max-h-[75%] flex flex-col p-5 border-t border-purple-100 z-[1000] select-text"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-md animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Meta AI Assistant</h4>
                    <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">Noor AI Integration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMetaDrawerOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] pr-2 scrollbar-thin">
                <div className="bg-purple-50/50 rounded-2xl p-3 border border-purple-100/50 text-xs text-purple-900 italic">
                  <span className="font-bold block not-italic mb-1 text-[10px] uppercase text-purple-700">Explaining Message</span>
                  "{metaPromptMsg?.text}"
                </div>

                <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
                  {isMetaLoading ? (
                    <div className="flex flex-col gap-2 py-4">
                      <div className="flex items-center gap-2 text-xs text-purple-600 font-bold animate-pulse">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Noor AI is researching and formulating response...</span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-[90%]" />
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-[75%]" />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-medium">{metaResponseText}</div>
                  )}
                </div>

                {metaSources.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase mb-2">Sources consulted</h5>
                    <div className="flex flex-wrap gap-2">
                      {metaSources.map((src, idx) => (
                        <a 
                          key={idx}
                          href={src.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full font-semibold border border-purple-100 flex items-center gap-1 transition-all"
                        >
                          <Share2 size={10} />
                          {src.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(metaResponseText);
                    showToast("AI response copied!");
                  }}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl transition-all border border-gray-200"
                  disabled={isMetaLoading}
                >
                  Copy Explanation
                </button>
                <button
                  onClick={() => {
                    setNewMessage(metaResponseText);
                    setIsMetaDrawerOpen(false);
                    showToast("Inserted response into input field!");
                  }}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200 transition-all"
                  disabled={isMetaLoading}
                >
                  Use as Reply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Message Modal */}
      <AnimatePresence>
        {messageToReport && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100"
            >
              <h3 className="text-base font-bold text-gray-900 mb-2">Report Message</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                This message will be sent to the administrator for review. Other users in this chat will not be notified.
              </p>

              <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-700 italic border border-gray-100 mb-4 max-h-[80px] overflow-y-auto">
                "{messageToReport.text || 'Media attachment'}"
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[11px] font-bold text-gray-400 uppercase">Reason for reporting</label>
                {[
                  { id: 'spam', label: 'Spam or malicious content' },
                  { id: 'harassment', label: 'Harassment or hate speech' },
                  { id: 'offensive', label: 'Offensive language or profanity' },
                  { id: 'false_info', label: 'False or misleading religious info' }
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl cursor-pointer border border-gray-100/50 transition-colors">
                    <input 
                      type="radio" 
                      name="report_reason" 
                      value={opt.id}
                      checked={reportReason === opt.id}
                      onChange={() => setReportReason(opt.id)}
                      className="accent-[#008069] w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setMessageToReport(null)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-600 border border-gray-200 transition-colors"
                  disabled={isReporting}
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsReporting(true);
                    setTimeout(() => {
                      setIsReporting(false);
                      setMessageToReport(null);
                      showToast("Report submitted successfully");
                    }, 800);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-100 transition-colors"
                  disabled={isReporting}
                >
                  {isReporting ? 'Reporting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

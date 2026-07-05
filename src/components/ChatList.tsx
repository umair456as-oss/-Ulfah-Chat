import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs, or, orderBy, updateDoc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, GroupOrChannel } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, UserPlus, Circle, MoreVertical, Filter, BadgeCheck, Users, Megaphone, Plus, Globe, Check, X, ShieldAlert, Archive, Lock, VolumeX, Pin, CheckCheck, ListPlus, Ban, Eraser, Trash2 } from 'lucide-react';
import { cn } from '../utils';

const ChatSkeleton = () => (
  <div className="flex items-center p-3 border-b border-[#F5F6F6] animate-pulse">
    <div className="w-12 h-12 rounded-full bg-gray-200 mr-3" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

interface ChatListProps {
  onSelectChat: (chat: any) => void;
  selectedChat: any | null;
  searchQuery?: string;
}

export default function ChatList({ onSelectChat, selectedChat, searchQuery = '' }: ChatListProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  // Modal and creation states
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  // Group creation inputs
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [allUsersForSelection, setAllUsersForSelection] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Channel creation inputs
  const [channelName, setChannelName] = useState('');
  const [channelBio, setChannelBio] = useState('');
  const [channelIsPublic, setChannelIsPublic] = useState(true);

  // Discover state
  const [publicChats, setPublicChats] = useState<any[]>([]);
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');

  // Context Menu and Interaction States
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    chat: any;
  } | null>(null);

  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Preference arrays persisted in localStorage
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_pinned_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedChats, setArchivedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_archived_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mutedChats, setMutedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_muted_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lockedChats, setLockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_locked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [unreadChats, setUnreadChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_unread_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [blockedChats, setBlockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_blocked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinChat = (uid: string) => {
    setPinnedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_pinned_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleArchiveChat = (uid: string) => {
    setArchivedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_archived_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleMuteChat = (uid: string) => {
    setMutedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_muted_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleLockChat = (uid: string) => {
    setLockedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_locked_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleUnreadChat = (uid: string) => {
    setUnreadChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_unread_chats', JSON.stringify(next));
      return next;
    });
  };

  const toggleBlockChat = (uid: string) => {
    setBlockedChats(prev => {
      const next = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      localStorage.setItem('ulfah_blocked_chats', JSON.stringify(next));
      return next;
    });
  };

  // Mobile Long-Press Logic
  const longPressTimeout = React.useRef<any>(null);
  const longPressActive = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent, chat: any) => {
    longPressActive.current = false;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimeout.current = setTimeout(() => {
      longPressActive.current = true;
      setContextMenu({
        x: clientX,
        y: clientY,
        chat
      });
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 600); // 600ms long press threshold
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    if (longPressActive.current) {
      // Prevent click triggers
      e.preventDefault();
    }
  };

  const handleTouchMove = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const filters = ['All', 'Unread', 'Favorites', 'Groups'];

  // Sync internal search with prop search from header
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Load quick selection users (contacts) when opening group modal
  useEffect(() => {
    if (showGroupModal) {
      const loadUsers = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'users'), limit(50)));
          const userList = snap.docs
            .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
            .filter(u => u.uid !== auth.currentUser?.uid);
          setAllUsersForSelection(userList);
        } catch (e) {
          console.error("Failed to load user list for group selection", e);
        }
      };
      loadUsers();
    }
  }, [showGroupModal]);

  // Load public groups & channels for Discover Modal
  useEffect(() => {
    if (showDiscoverModal) {
      const loadDiscover = async () => {
        try {
          const snap = await getDocs(query(collection(db, 'groups'), where('isPublic', '==', true), limit(30)));
          const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
          setPublicChats(list);
        } catch (e) {
          console.error("Failed to load public chats:", e);
        }
      };
      loadDiscover();
    }
  }, [showDiscoverModal]);

  // Real-time listener for current user's direct messages (recent chats)
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', auth.currentUser.uid)
      ),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setIsLoading(true);
      const activeUserIds = new Set<string>();
      snapshot.docs.forEach(async (d) => {
        const data = d.data();
        if (data.senderId !== auth.currentUser?.uid && !data.receiverId?.startsWith('group_') && !data.receiverId?.startsWith('channel_') && !data.isGroupMode && !data.isChannelMode) {
          activeUserIds.add(data.senderId);
        }
        if (data.receiverId !== auth.currentUser?.uid && !data.receiverId?.startsWith('group_') && !data.receiverId?.startsWith('channel_') && !data.isGroupMode && !data.isChannelMode) {
          activeUserIds.add(data.receiverId);
        }

        // Mark messages as delivered (Read Receipts Logic)
        if (data.receiverId === auth.currentUser?.uid && data.status === 'sent') {
          try {
            await updateDoc(d.ref, { status: 'delivered' });
          } catch (e) {
            console.error('Failed to update delivery status:', e);
          }
        }
      });

      if (activeUserIds.size === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      // Fetch user profiles for active conversations
      const userQueries = Array.from(activeUserIds).map(uid => getDocs(query(collection(db, 'users'), where('__name__', '==', uid))));
      const userSnaps = await Promise.all(userQueries);
      const activeUsers = userSnaps.flatMap(snap => snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      
      setUsers(activeUsers);
      setIsLoading(false);
    }, (error) => {
      setIsLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Real-time listener for Groups and Channels
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
      setGroups(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const cleanSearch = searchTerm.trim();
      const lowerSearch = cleanSearch.toLowerCase();
      // Search by exact email, username, or display name in users
      const q = query(
        collection(db, 'users'),
        or(
          where('email', '==', lowerSearch),
          where('username', '==', lowerSearch),
          where('displayName', '==', cleanSearch)
        )
      );
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.uid !== auth.currentUser?.uid);
      
      const uniqueResults = Array.from(new Map(results.map(u => [u.uid, u])).values());
      setSearchResults(uniqueResults);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Group Handler
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !auth.currentUser) return;
    try {
      const groupUid = 'group_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newGroupObj = {
        uid: groupUid,
        isGroup: true,
        isChannel: false,
        displayName: groupName.trim(),
        bio: groupBio.trim() || 'Welcome to our Group!',
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid, ...selectedMembers],
        admins: [auth.currentUser.uid],
        isPublic: groupIsPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupName)}&backgroundColor=00a884`
      };

      await addDoc(collection(db, 'groups'), newGroupObj);
      
      // Auto-select and notify
      onSelectChat(newGroupObj);
      setGroupName('');
      setGroupBio('');
      setSelectedMembers([]);
      setShowGroupModal(false);
    } catch (e) {
      alert("Failed to create group. Please check rules or connection.");
    }
  };

  // Create Channel Handler
  const handleCreateChannel = async () => {
    if (!channelName.trim() || !auth.currentUser) return;
    try {
      const channelUid = 'channel_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newChannelObj = {
        uid: channelUid,
        isGroup: false,
        isChannel: true,
        displayName: channelName.trim(),
        bio: channelBio.trim() || 'Welcome to our Broadcast Channel!',
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        admins: [auth.currentUser.uid],
        isPublic: channelIsPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channelName)}&backgroundColor=003a2e`
      };

      await addDoc(collection(db, 'groups'), newChannelObj);

      // Auto-select and notify
      onSelectChat(newChannelObj);
      setChannelName('');
      setChannelBio('');
      setShowChannelModal(false);
    } catch (e) {
      alert("Failed to create channel. Please check rules or connection.");
    }
  };

  // Join Public Group or Channel
  const handleJoinPublic = async (chat: any) => {
    if (!auth.currentUser) return;
    try {
      // Find the group document ref in collection by its field values (we'll fetch and update)
      const q = query(collection(db, 'groups'), where('uid', '==', chat.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const currentMembers = snap.docs[0].data().members || [];
        if (!currentMembers.includes(auth.currentUser.uid)) {
          const updatedMembers = [...currentMembers, auth.currentUser.uid];
          await updateDoc(docRef, { members: updatedMembers });
          alert(`Successfully joined ${chat.displayName}!`);
        }
        // Force update UI by selecting it
        const joinedChatObj = { ...chat, members: [...currentMembers, auth.currentUser.uid] };
        onSelectChat(joinedChatObj);
        setShowDiscoverModal(false);
      }
    } catch (e) {
      alert("Error joining: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Toggle selection for group member
  const toggleMemberSelection = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Combine both user profiles and group collections for unified display listing
  const allChats = [...users, ...groups];

  // Apply visual category filters
  let filteredChats = allChats;
  if (activeFilter === 'Groups') {
    filteredChats = groups;
  } else if (activeFilter === 'Favorites') {
    filteredChats = groups.filter(g => g.isChannel); // default show Channels as favorites / announcement spaces
  } else if (activeFilter === 'Unread') {
    // Return all chats for standard view
    filteredChats = allChats;
  }

  const displayedChats = searchTerm
    ? [
        ...searchResults,
        ...allChats.filter(c => 
          c.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (c.email && c.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.username && c.username?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (c.bio && c.bio?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      ]
    : filteredChats;

  // Deduplicate chats
  const deduplicatedChats = Array.from(new Map(displayedChats.map(c => [c.uid, c])).values());

  // Filter based on blocked list
  const nonBlockedChats = deduplicatedChats.filter(c => !blockedChats.includes(c.uid));

  // Filter based on Archive state
  const finalChats = showArchivedOnly 
    ? nonBlockedChats.filter(c => archivedChats.includes(c.uid))
    : nonBlockedChats.filter(c => !archivedChats.includes(c.uid));

  // Sort: Pinned chats at the very top
  const uniqueDisplayedChats = [...finalChats].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.uid);
    const bPinned = pinnedChats.includes(b.uid);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  // Filter public search inside Discover Modal
  const filteredPublicChats = discoverSearchTerm
    ? publicChats.filter(c => 
        c.displayName?.toLowerCase().includes(discoverSearchTerm.toLowerCase()) ||
        c.bio?.toLowerCase().includes(discoverSearchTerm.toLowerCase())
      )
    : publicChats;

  const menuWidth = 224;
  const menuHeight = 360;

  let adjustedX = contextMenu ? contextMenu.x : 0;
  let adjustedY = contextMenu ? contextMenu.y : 0;

  if (contextMenu) {
    if (adjustedX + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10;
    }
    if (adjustedY + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10;
    }
    if (adjustedX < 10) adjustedX = 10;
    if (adjustedY < 10) adjustedY = 10;
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Top Header of Chat list with Telegram triggers */}
      <div className="px-5 py-4 bg-white flex items-center justify-between border-b border-[#F5F6F6] sticky top-0 z-30">
        <h2 className="text-2xl font-bold text-[#111B21]">Chats</h2>
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateOption(!showCreateOption)}
            className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-[#128C7E] transition-all duration-300 font-bold text-sm tracking-wide group"
          >
            <Plus size={18} className={cn("transition-transform duration-300", showCreateOption && "rotate-45")} />
            <span>Create</span>
          </motion.button>

          {/* Sub menu popover */}
          <AnimatePresence>
            {showCreateOption && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
              >
                <button
                  onClick={() => { setShowCreateOption(false); navigate('/contacts'); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111B21] font-medium border-b border-gray-50 transition-colors"
                >
                  <UserPlus size={16} className="text-[#25D366]" />
                  <span>New Private Chat</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowGroupModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111B21] font-medium border-b border-gray-50 transition-colors"
                >
                  <Users size={16} className="text-blue-500" />
                  <span>Create Telegram Group</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowChannelModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111B21] font-medium border-b border-gray-50 transition-colors"
                >
                  <Megaphone size={16} className="text-purple-500" />
                  <span>Create Telegram Channel</span>
                </button>
                <button
                  onClick={() => { setShowCreateOption(false); setShowDiscoverModal(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-[#008069] font-bold transition-colors"
                >
                  <Globe size={16} className="text-emerald-600 animate-pulse" />
                  <span>Discover Public Spaces</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MAIN LIST container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <ChatSkeleton key={i} />)
          ) : (
            <div key="chat-list-content">
              {/* Back header for archived view */}
              {showArchivedOnly && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-[#F5F6F6] sticky top-0 z-10">
                  <button 
                    onClick={() => setShowArchivedOnly(false)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors text-[#54656F]"
                  >
                    <X size={18} />
                  </button>
                  <span className="text-sm font-bold text-[#111B21]">Archived Chats ({archivedChats.length})</span>
                </div>
              )}

              {/* Archived Chats banner row */}
              {!showArchivedOnly && archivedChats.length > 0 && !searchTerm && (
                <div 
                  onClick={() => setShowArchivedOnly(true)}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-[#F5F6F6] transition-colors"
                >
                  <Archive size={18} className="text-[#008069] ml-1" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#111B21]">Archived</span>
                  </div>
                  <span className="text-xs font-bold text-[#008069] bg-[#D9FDD3] px-2 py-0.5 rounded-full">
                    {archivedChats.length}
                  </span>
                </div>
              )}

              {searchTerm && searchResults.length > 0 && (
                <div className="px-6 py-2 text-[10px] font-bold text-[#008069] uppercase tracking-wider bg-[#F0F2F5]/50">
                  Global Search
                </div>
              )}
              
              {!searchTerm && uniqueDisplayedChats.length > 0 && (
                <div className="px-6 py-2 text-[10px] font-bold text-[#667781] uppercase tracking-wider bg-[#F0F2F5]/50">
                  {showArchivedOnly ? "Archived Chats" : "Recent Conversations"}
                </div>
              )}

              {uniqueDisplayedChats.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-12 text-center flex flex-col items-center"
                >
                  <div className="w-20 h-20 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-4 text-[#8696A0] shadow-inner">
                    <Search size={32} />
                  </div>
                  <p className="text-[#111B21] font-bold">
                    {searchTerm ? "No results found" : "No active chats yet"}
                  </p>
                  <p className="text-[#8696A0] text-xs mt-2 max-w-[200px] mx-auto leading-relaxed">
                    {searchTerm 
                      ? "Try searching for a full email address or exact username" 
                      : "Start a conversation, open a telegram Channel or Group from the Create menu!"}
                  </p>
                </motion.div>
              ) : (
                uniqueDisplayedChats.map((chatItem) => {
                  const isGrp = chatItem.isGroup;
                  const isChnl = chatItem.isChannel;
                  
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={chatItem.uid}
                      onClick={() => onSelectChat(chatItem)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          chat: chatItem
                        });
                      }}
                      onTouchStart={(e) => handleTouchStart(e, chatItem)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      className={cn(
                        "flex items-center p-3 cursor-pointer hover:bg-[#F5F6F6] transition-all duration-200 group relative chat-item",
                        selectedChat?.uid === chatItem.uid && "bg-[#F0F2F5]"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={chatItem.photoURL || `https://ui-avatars.com/api/?name=${chatItem.displayName}`}
                          alt={chatItem.displayName || ''}
                          className={cn(
                            "w-12 h-12 rounded-full object-cover border-2",
                            isGrp ? "border-blue-400" : isChnl ? "border-purple-400" : "border-transparent"
                          )}
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Type indicator bubble */}
                        {isGrp && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border border-white">
                            <Users size={10} />
                          </div>
                        )}
                        {isChnl && (
                          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white p-1 rounded-full border border-white">
                            <Megaphone size={10} />
                          </div>
                        )}
                        {!isGrp && !isChnl && chatItem.isOnline && (
                          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2 border-white shadow-sm"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 ml-3 border-b border-[#F5F6F6] py-2 h-full">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-semibold text-[#111B21] truncate text-base flex items-center gap-1.5">
                            {chatItem.displayName}
                            {chatItem.isVerified && <BadgeCheck size={14} className="text-[#3b82f6] fill-[#3b82f6]/10 flex-shrink-0" />}
                            {isGrp && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Group</span>}
                            {isChnl && <span className="bg-purple-50 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Channel</span>}
                          </h3>
                          <span className="text-[10px] text-[#667781] font-semibold">
                            {isGrp ? `${chatItem.members?.length || 0} members` : isChnl ? 'Megaphone Feed' : (chatItem.isOnline ? 'Online' : 'Offline')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[12px] text-[#667781] truncate flex-1 leading-normal">
                            {chatItem.bio || chatItem.email || (isGrp ? 'Click to read and message.' : 'Click to read latest announcements.')}
                          </p>
                          
                          {/* Badges Column */}
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            {lockedChats.includes(chatItem.uid) && (
                              <Lock size={12} className="text-[#008069]" />
                            )}
                            {mutedChats.includes(chatItem.uid) && (
                              <VolumeX size={12} className="text-[#8696A0]" />
                            )}
                            {pinnedChats.includes(chatItem.uid) && (
                              <Pin size={12} className="text-[#008069] -rotate-45" />
                            )}
                            {unreadChats.includes(chatItem.uid) && (
                              <span className="w-2.5 h-2.5 bg-[#25D366] rounded-full"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* CREATE GROUP DIALOG MODAL */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-gradient-to-r from-blue-500 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create Telegram Group</h3>
                  <p className="text-xs opacity-90 mt-0.5">Everyone can join and message each other</p>
                </div>
                <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Group Title</label>
                  <input
                    type="text"
                    placeholder="E.g., Quran Study Circle"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description (Welcome message/rules)</label>
                  <textarea
                    placeholder="Rules, resources, and brief group mission"
                    value={groupBio}
                    onChange={(e) => setGroupBio(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all h-20 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F0F2F5] rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-[#111B21] block">Public Group</span>
                    <span className="text-xs text-[#667781] block">Anyone can discover and join</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={groupIsPublic}
                    onChange={(e) => setGroupIsPublic(e.target.checked)}
                    className="w-5 h-5 accent-[#25D366] cursor-pointer"
                  />
                </div>

                {/* Member selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Members to Invite ({selectedMembers.length} selected)</label>
                  <div className="bg-[#F0F2F5] rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                    {allUsersForSelection.length === 0 ? (
                      <p className="text-xs text-[#8696A0] text-center py-4">No contacts found to invite.</p>
                    ) : (
                      allUsersForSelection.map((u) => {
                        const isSelected = selectedMembers.includes(u.uid);
                        return (
                          <div 
                            key={u.uid}
                            onClick={() => toggleMemberSelection(u.uid)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all hover:bg-white",
                              isSelected && "bg-white border border-blue-200"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} alt="" className="w-8 h-8 rounded-full" />
                              <div>
                                <span className="text-xs font-bold text-[#111B21] block">{u.displayName}</span>
                                <span className="text-[10px] text-[#667781] block">{u.email}</span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                              isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white"
                            )}>
                              {isSelected && <Check size={12} />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className="px-6 py-2.5 bg-[#25D366] text-white hover:bg-[#128C7E] text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE CHANNEL DIALOG MODAL */}
      <AnimatePresence>
        {showChannelModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-gradient-to-r from-purple-600 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Create Telegram Channel</h3>
                  <p className="text-xs opacity-90 mt-0.5">Only you/admins can post announcements</p>
                </div>
                <button onClick={() => setShowChannelModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Channel Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Daily Hadith broadcast"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    placeholder="Channel content summary, schedule, etc."
                    value={channelBio}
                    onChange={(e) => setChannelBio(e.target.value)}
                    className="w-full bg-[#F0F2F5] py-3 px-4 rounded-xl text-sm focus:ring-2 focus:ring-[#25D366] focus:outline-none focus:bg-white border border-transparent transition-all h-24 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#F0F2F5] rounded-2xl">
                  <div>
                    <span className="text-sm font-bold text-[#111B21] block">Public Channel</span>
                    <span className="text-xs text-[#667781] block">Anyone can search and subscribe</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={channelIsPublic}
                    onChange={(e) => setChannelIsPublic(e.target.checked)}
                    className="w-5 h-5 accent-[#25D366] cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-[32px]">
                <button
                  onClick={() => setShowChannelModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-[#667781] hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!channelName.trim()}
                  className="px-6 py-2.5 bg-[#25D366] text-white hover:bg-[#128C7E] text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Channel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISCOVER PUBLIC GROUPS & CHANNELS MODAL */}
      <AnimatePresence>
        {showDiscoverModal && (
          <div className="fixed inset-0 bg-[#111B21]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-[#00a884] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Globe size={22} className="animate-spin-slow text-yellow-300" />
                    <span>Discover Public Spaces</span>
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">Find and join Telegram-style Groups & Channels instantly!</p>
                </div>
                <button onClick={() => setShowDiscoverModal(false)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Global search in modal */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search spaces by name or keyword..."
                    className="w-full bg-[#F0F2F5] py-2.5 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#25D366] border border-transparent transition-all"
                    value={discoverSearchTerm}
                    onChange={(e) => setDiscoverSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-4 top-3 text-[#54656F]" size={16} />
                </div>
              </div>

              {/* Public list */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                {filteredPublicChats.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <Globe size={48} className="text-gray-300 mb-3 animate-pulse" />
                    <p className="text-sm font-bold text-[#111B21]">No public spaces found</p>
                    <p className="text-xs text-[#8696A0] mt-1">Be the first to create a public Group or Channel!</p>
                  </div>
                ) : (
                  filteredPublicChats.map((space) => {
                    const isAlreadyMember = space.members?.includes(auth.currentUser?.uid);
                    return (
                      <div 
                        key={space.uid}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-[#F2F7F5] transition-all border border-gray-100/50"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <img 
                            src={space.photoURL || `https://ui-avatars.com/api/?name=${space.displayName}`} 
                            alt="" 
                            className="w-12 h-12 rounded-full border border-gray-200" 
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm text-[#111B21] hover:text-[#075E54] block truncate flex items-center gap-1.5">
                              {space.displayName}
                              {space.isGroup ? (
                                <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-1 py-0.5 rounded uppercase font-sans">Group</span>
                              ) : (
                                <span className="bg-purple-50 text-purple-600 text-[8px] font-bold px-1 py-0.5 rounded uppercase font-sans">Channel</span>
                              )}
                            </span>
                            <span className="text-xs text-[#667781] block truncate italic mt-0.5">"{space.bio || 'Discover updates and participate!'}"</span>
                            <span className="text-[10px] text-gray-400 font-bold block mt-1 uppercase tracking-wider">
                              👥 {space.members?.length || 0} members
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => isAlreadyMember ? (onSelectChat(space), setShowDiscoverModal(false)) : handleJoinPublic(space)}
                          className={cn(
                            "px-4.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95",
                            isAlreadyMember 
                              ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                              : "bg-[#25D366] text-white hover:bg-[#128C7E]"
                          )}
                        >
                          {isAlreadyMember ? 'Open Chat' : 'Join Space'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            {/* Transparent backdrop to catch clicks */}
            <div 
              className="fixed inset-0 z-[300] bg-transparent cursor-default"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />
            
            {/* Context Menu Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{ 
                left: adjustedX, 
                top: adjustedY 
              }}
              className="fixed z-[301] w-56 bg-white border border-gray-200/80 rounded-2xl shadow-xl py-2 overflow-hidden flex flex-col select-none"
            >
              <button
                onClick={() => {
                  toggleArchiveChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Archive size={14} className="text-gray-500" />
                <span>{archivedChats.includes(contextMenu.chat.uid) ? 'Unarchive chat' : 'Archive chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleLockChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Lock size={14} className="text-gray-500" />
                <span>{lockedChats.includes(contextMenu.chat.uid) ? 'Unlock chat' : 'Lock chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleMuteChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <VolumeX size={14} className="text-gray-500" />
                <span>{mutedChats.includes(contextMenu.chat.uid) ? 'Unmute notifications' : 'Mute notifications'}</span>
              </button>

              <button
                onClick={() => {
                  togglePinChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <Pin size={14} className="text-gray-500 -rotate-45" />
                <span>{pinnedChats.includes(contextMenu.chat.uid) ? 'Unpin chat' : 'Pin chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleUnreadChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <CheckCheck size={14} className="text-gray-500" />
                <span>{unreadChats.includes(contextMenu.chat.uid) ? 'Mark as read' : 'Mark as unread'}</span>
              </button>

              <button
                onClick={() => {
                  alert("Added to special category list!");
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-xs text-[#111B21] font-semibold transition-colors"
              >
                <ListPlus size={14} className="text-gray-500" />
                <span>Add to list</span>
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  toggleBlockChat(contextMenu.chat.uid);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Ban size={14} className="text-red-500" />
                <span>{blockedChats.includes(contextMenu.chat.uid) ? 'Unblock user' : 'Block'}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all messages for this chat? This action cannot be undone.")) {
                    alert("Chat cleared successfully!");
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Eraser size={14} className="text-red-500" />
                <span>Clear chat</span>
              </button>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this conversation?")) {
                    alert("Chat deleted successfully!");
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-xs text-red-600 font-semibold transition-colors"
              >
                <Trash2 size={14} className="text-red-500" />
                <span>Delete chat</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

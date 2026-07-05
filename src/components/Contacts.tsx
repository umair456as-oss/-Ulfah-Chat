import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, or, orderBy, addDoc, updateDoc, doc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebaseError';
import { UserProfile, GroupOrChannel } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, UserPlus, Mail, User, Check, BadgeCheck, 
  Users, Megaphone, Plus, Globe, Link, Copy, 
  Shield, ToggleLeft, ToggleRight, ArrowLeft, MessageSquare, Info
} from 'lucide-react';
import { cn } from '../utils';

interface ContactsProps {
  onSelectChat: (chat: any) => void;
  onBack?: () => void;
}

export default function Contacts({ onSelectChat, onBack }: ContactsProps) {
  // Navigation tabs: 'direct' (standard contacts), 'my-communities' (joined groups/channels), 'discover' (public groups/channels)
  const [activeTab, setActiveTab] = useState<'direct' | 'my-communities' | 'discover'>('my-communities');
  
  // Real-time states
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Selection and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group / Channel Creation Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);

  // Form Fields - Group Choice
  const [groupName, setGroupName] = useState('');
  const [groupBio, setGroupBio] = useState('');
  const [groupIsPublic, setGroupIsPublic] = useState(true);
  const [allUsersForSelection, setAllUsersForSelection] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Form Fields - Channel Choice
  const [channelName, setChannelName] = useState('');
  const [channelBio, setChannelBio] = useState('');
  const [channelIsPublic, setChannelIsPublic] = useState(true);

  // 1. Fetch direct messaging contacts (original functionality)
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      or(
        where('senderId', '==', auth.currentUser.uid),
        where('receiverId', '==', auth.currentUser.uid)
      ),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activeUserIds = new Set<string>();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.senderId !== auth.currentUser?.uid) activeUserIds.add(data.senderId);
        if (data.receiverId !== auth.currentUser?.uid) activeUserIds.add(data.receiverId);
      });

      if (activeUserIds.size === 0) {
        setContacts([]);
        return;
      }

      try {
        const userQueries = Array.from(activeUserIds).map(uid => 
          getDocs(query(collection(db, 'users'), where('__name__', '==', uid)))
        );
        const userSnaps = await Promise.all(userQueries);
        const activeUsers = userSnaps.flatMap(snap => 
          snap.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile))
        );
        
        activeUsers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setContacts(activeUsers);
      } catch (err) {
        console.error("Error batch loading contacts:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch all groups & broadcast channels to compute memberships
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setGroups(list);
    }, (error) => {
      console.error("Communities real-time groups failed loading:", error);
    });

    return () => unsubscribe();
  }, []);

  // 3. Load quick list of users for Group participant selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(100)));
        const userList = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as UserProfile))
          .filter(u => u.uid !== auth.currentUser?.uid);
        setAllUsersForSelection(userList);
      } catch (e) {
        console.error("Failed to load user selection list:", e);
      }
    };
    loadUsers();
  }, []);

  // Global search handler for direct user lookups
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const cleanSearch = searchTerm.trim();
      const lowerSearch = cleanSearch.toLowerCase();
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
        .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() } as UserProfile))
        .filter(u => u.uid !== auth.currentUser?.uid);
      setSearchResults(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper copy shareable link generator
  const handleCopyLink = (communityId: string) => {
    const url = `${window.location.origin}/?join=${communityId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(communityId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Switch Public/Private visibility toggler
  const handleToggleVisibility = async (groupDocId: string, currentPublic: boolean) => {
    try {
      await updateDoc(doc(db, 'groups', groupDocId), {
        isPublic: !currentPublic
      });
    } catch (e) {
      alert("Failed to toggle visibility settings: " + String(e));
    }
  };

  // Join handler for Public Channels & Groups
  const handleJoinCommunity = async (comm: any) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'groups', comm.id);
      const currentMembers = comm.members || [];
      if (!currentMembers.includes(auth.currentUser.uid)) {
        const updatedMembers = [...currentMembers, auth.currentUser.uid];
        await updateDoc(docRef, { members: updatedMembers });
      }
      onSelectChat({ ...comm, members: [...currentMembers, auth.currentUser.uid] });
    } catch (e) {
      alert("Could not join community: " + String(e));
    }
  };

  // Create WhatsApp/Telegram style Group Chat
  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || !auth.currentUser) return;
    try {
      const groupUid = 'group_' + Date.now() + Math.random().toString(36).substring(2, 7);
      const newGroup: GroupOrChannel = {
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

      await addDoc(collection(db, 'groups'), newGroup);
      onSelectChat(newGroup);

      // Reset
      setGroupName('');
      setGroupBio('');
      setSelectedMembers([]);
      setShowGroupModal(false);
    } catch (e) {
      alert("Failed creating group: " + String(e));
    }
  };

  // Create broadcast announcer channel 
  const handleCreateBroadcastChannel = async () => {
    if (!channelName.trim() || !auth.currentUser) return;
    try {
      const channelUid = 'channel_' + Date.now() + Math.random().toString(36).substring(2, 7);
      const newChannel: GroupOrChannel = {
        uid: channelUid,
        isGroup: false,
        isChannel: true,
        displayName: channelName.trim(),
        bio: channelBio.trim() || 'Official broadcast announcements feed!',
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        admins: [auth.currentUser.uid],
        isPublic: channelIsPublic,
        createdAt: new Date(),
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(channelName)}&backgroundColor=003a2e`
      };

      await addDoc(collection(db, 'groups'), newChannel);
      onSelectChat(newChannel);

      // Reset
      setChannelName('');
      setChannelBio('');
      setShowChannelModal(false);
    } catch (e) {
      alert("Failed creating channel: " + String(e));
    }
  };

  // Filter groups locally based on active selection lists
  const currentUserId = auth.currentUser?.uid || '';
  const myCommunities = groups.filter(g => g.members?.includes(currentUserId) || g.creatorId === currentUserId);
  const publicDiscover = groups.filter(g => g.isPublic && !g.members?.includes(currentUserId));

  // Filter participant list for creation search
  const filteredParticipants = allUsersForSelection.filter(u =>
    u.displayName?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const displayedDirectUsers = searchTerm 
    ? (searchResults.length > 0 ? searchResults : contacts.filter(u => 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    : contacts;

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Title & Top Toolbar Section */}
      <div className="p-4 flex flex-col gap-3 border-b border-[#F0F2F5] bg-[#F0F2F5]/40 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-xl font-black text-[#111B21]">Communities Space</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a884] text-white text-[12px] font-extrabold rounded-lg hover:bg-[#008069] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Users size={14} />
              <span>+ Group</span>
            </button>
            
            <button 
              onClick={() => setShowChannelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[12px] font-extrabold rounded-lg hover:bg-purple-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Megaphone size={14} />
              <span>+ Channel</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('my-communities'); setSearchTerm(''); }}
            className={cn(
              "flex-1 text-[12px] font-black py-2 rounded-lg text-center transition-all cursor-pointer",
              activeTab === 'my-communities' ? "bg-white text-[#111B21] shadow-sm" : "text-[#54656F] hover:text-[#111B21]"
            )}
          >
            My Communities ({myCommunities.length})
          </button>
          <button
            onClick={() => { setActiveTab('discover'); setSearchTerm(''); }}
            className={cn(
              "flex-1 text-[12px] font-black py-2 rounded-lg text-center transition-all cursor-pointer",
              activeTab === 'discover' ? "bg-white text-[#111B21] shadow-sm" : "text-[#54656F] hover:text-[#111B21]"
            )}
          >
            Discover Public ({publicDiscover.length})
          </button>
          <button
            onClick={() => { setActiveTab('direct'); setSearchTerm(''); }}
            className={cn(
              "flex-1 text-[12px] font-black py-2 rounded-lg text-center transition-all cursor-pointer",
              activeTab === 'direct' ? "bg-white text-[#111B21] shadow-sm" : "text-[#54656F] hover:text-[#111B21]"
            )}
          >
            Direct Contacts
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: MY COMMUNITIES */}
          {activeTab === 'my-communities' && (
            <motion.div
              key="my-communities-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 space-y-3"
            >
              {myCommunities.length === 0 ? (
                <div className="text-center p-12 text-gray-400 select-none">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Users size={28} className="text-gray-300" />
                  </div>
                  <h3 className="font-bold text-[#111B21] text-sm">No joined groups or channels</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Create your own with the quick action buttons above, or find public ones inside the Discover tab.
                  </p>
                </div>
              ) : (
                myCommunities.map((comm) => {
                  const isCreator = comm.creatorId === currentUserId;
                  const isChan = comm.isChannel === true;
                  return (
                    <div 
                      key={comm.uid}
                      className="border border-gray-100 p-4 rounded-2xl flex flex-col gap-3 hover:shadow-md transition-all relative overflow-hidden bg-white group-item"
                    >
                      <div className="flex gap-3 items-start">
                        <img 
                          src={comm.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.displayName)}`}
                          alt={comm.displayName}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer"
                          onClick={() => onSelectChat(comm)}
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 
                              onClick={() => onSelectChat(comm)}
                              className="font-black text-[#111B21] hover:text-[#00a884] transition-colors cursor-pointer truncate"
                            >
                              {comm.displayName}
                            </h3>
                            {isChan ? (
                              <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase">
                                Channel
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black uppercase">
                                Group Chat
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5 leading-normal italic font-medium">
                            {comm.bio}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-1.5">
                            <span>{comm.members?.length || 0} {isChan ? 'subscribers' : 'participants'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Shield size={10} />
                              {comm.isPublic ? 'Public Space' : 'Private Space'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Control Panel: Joining and Shared Link Controls */}
                      <div className="flex items-center gap-2 border-t border-gray-50 pt-3 mt-1 justify-between">
                        
                        {/* Go to Messages button */}
                        <button
                          onClick={() => onSelectChat(comm)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-extrabold text-[#00a884] bg-[#D9FDD3]/50 hover:bg-[#D9FDD3] rounded-lg transition-all cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          <span>Enter Chat</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Copy Shareable Link feature */}
                          <button
                            onClick={() => handleCopyLink(comm.uid)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                            title="Generate a direct joining link"
                          >
                            <Link size={12} />
                            <span>{copiedId === comm.uid ? 'Copied Link!' : 'Share Link'}</span>
                          </button>

                          {/* Visibility toggle for Creator Admin users */}
                          {isCreator && (
                            <button
                              onClick={() => handleToggleVisibility(comm.id, comm.isPublic)}
                              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-extrabold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                              title={`Click to target ${comm.isPublic ? 'Private' : 'Public'} mode`}
                            >
                              {comm.isPublic ? (
                                <>
                                  <ToggleRight size={14} className="text-blue-500" />
                                  <span>Public Toggle</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft size={14} className="text-gray-400" />
                                  <span>Private Toggle</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* TAB 2: GLOBAL DISCOVER */}
          {activeTab === 'discover' && (
            <motion.div
              key="discover-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 space-y-3"
            >
              <div className="bg-[#EBF5FF] text-[#1D4ED8] p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium leading-relaxed mb-1">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>Interact with global audiences! Find public groups and announce feeds here. Join to connect or read latest updates.</span>
              </div>

              {publicDiscover.length === 0 ? (
                <div className="text-center p-12 text-gray-400 select-none">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Globe size={28} className="text-gray-300" />
                  </div>
                  <h3 className="font-bold text-[#111B21] text-sm">No new public communities found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    All current public groups or channels have been joined. Create a new one to grow community.
                  </p>
                </div>
              ) : (
                publicDiscover.map((comm) => {
                  const isChan = comm.isChannel === true;
                  return (
                    <div 
                      key={comm.uid}
                      className="border border-gray-100 p-4 rounded-2xl flex flex-col gap-3 bg-white hover:shadow-md transition-all"
                    >
                      <div className="flex gap-3 items-center">
                        <img 
                          src={comm.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.displayName)}`}
                          alt={comm.displayName}
                          className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-[#111B21] truncate">{comm.displayName}</h3>
                            {isChan ? (
                              <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase">
                                Channel
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">
                                Group
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate italic">{comm.bio}</p>
                          <p className="text-[10px] text-[#667781] font-bold mt-1">
                            {comm.members?.length || 0} {isChan ? 'subscribers' : 'members'}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleJoinCommunity(comm)}
                          className="px-4 py-2 bg-[#25D366] text-white text-xs font-black rounded-xl hover:bg-[#128C7E] transition-all cursor-pointer active:scale-95 shadow-sm uppercase shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* TAB 3: ORIGINAL CONTACTS / DIRECT USER SEARCH */}
          {activeTab === 'direct' && (
            <motion.div
              key="direct-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Contacts Search Section */}
              <div className="p-4 bg-white sticky top-0 z-10 shadow-sm border-b border-[#F0F2F5]">
                <form onSubmit={handleSearchUsers} className="relative group">
                  <input
                    type="text"
                    placeholder="Search standard email or username..."
                    className="w-full bg-[#F0F2F5] py-3 pl-12 pr-12 rounded-2xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#25D366] transition-all border border-transparent shadow-inner font-medium text-[#111B21]"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!e.target.value) setSearchResults([]);
                    }}
                  />
                  <Search className="absolute left-4 top-3.5 text-[#54656F] group-focus-within:text-[#25D366] transition-colors" size={18} />
                  {searchTerm && (
                    <button 
                      type="submit"
                      className="absolute right-3 top-2 px-3 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#20bd5c] transition-colors shadow-sm"
                    >
                      Search
                    </button>
                  )}
                </form>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="w-10 h-10 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#667781] font-medium">Searching directories...</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchTerm && searchResults.length > 0 && (
                    <div className="px-4 py-2 bg-[#F0F2F5] text-[10px] font-black text-[#075E54] uppercase tracking-widest rounded-lg mb-2">
                      Global Directory Search Matches
                    </div>
                  )}
                  
                  {!searchTerm && contacts.length > 0 && (
                    <div className="px-4 py-2 bg-[#F0F2F5] text-[10px] font-black text-[#075E54] uppercase tracking-widest rounded-lg mb-2">
                      Recent Friends & Conversations
                    </div>
                  )}

                  {displayedDirectUsers.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center select-none">
                      <div className="w-16 h-16 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-3 text-[#8696A0]">
                        <UserPlus size={28} />
                      </div>
                      <p className="text-[#111B21] font-black">
                        {searchTerm ? "User profile not found" : "No recent direct chats"}
                      </p>
                      <p className="text-[#667781] text-xs mt-1 max-w-[220px] mx-auto leading-normal">
                        {searchTerm 
                          ? "Make sure you entered the correct email or username link" 
                          : "Find private users or search on top to start custom chatting"}
                      </p>
                    </div>
                  ) : (
                    displayedDirectUsers.map((user) => (
                      <div
                        key={user.uid}
                        onClick={() => onSelectChat(user)}
                        className="flex items-center p-3 cursor-pointer hover:bg-[#F5F6F6] rounded-2xl transition-all group border-b border-gray-50"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '')}`}
                            alt={user.displayName || ''}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-[#25D366] transition-colors"
                            referrerPolicy="no-referrer"
                          />
                          {user.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-white shadow-sm" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 ml-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-[#111B21] truncate group-hover:text-[#075E54] transition-colors flex items-center gap-1 text-sm">
                              {user.displayName}
                              {user.isVerified && <BadgeCheck size={14} className="text-[#3b82f6] fill-[#3b82f6]/10 flex-shrink-0" />}
                            </h3>
                          </div>
                          <p className="text-[11px] text-[#667781] truncate flex items-center gap-1 mt-0.5 font-bold">
                            <Mail size={10} /> {user.email}
                          </p>
                          {user.bio && (
                            <p className="text-[10px] text-[#8696A0] truncate mt-0.5 italic">
                              "{user.bio}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* --- TELEGRAM GROUP CREATION PANEL (WITH MULTIPLE PARTICIPANT ADDING) --- */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="absolute inset-0 bg-white z-[200] flex flex-col p-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4 select-none">
              <button 
                onClick={() => { setShowGroupModal(false); setSelectedMembers([]); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-black text-[#111B21]">Create Telegram Group</h2>
                <p className="text-[11px] text-gray-500 font-bold">Assemble multiple participants here</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#075E54] mb-1.5">Group Username/Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Premium Developers Circle"
                  className="w-full bg-[#F0F2F5] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] font-bold text-[#111B21] transition-all border border-transparent shadow-inner"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#075E54] mb-1.5">Group Bio Description</label>
                <textarea 
                  placeholder="Describe your community target rules or topic..."
                  rows={2}
                  className="w-full bg-[#F0F2F5] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] font-medium text-[#111B21] transition-all border border-transparent shadow-inner resize-none"
                  value={groupBio}
                  onChange={(e) => setGroupBio(e.target.value)}
                />
              </div>

              {/* Public Private toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="text-xs font-black text-[#111B21]">Public Accessibility Toggle</h4>
                  <p className="text-[10px] text-gray-500 font-medium">Public groups can be searched and joined by anyone in modern Discover directories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupIsPublic(!groupIsPublic)}
                  className="text-gray-600 hover:text-[#00a884]"
                >
                  {groupIsPublic ? (
                    <ToggleRight size={38} className="text-[#00a884]" />
                  ) : (
                    <ToggleLeft size={38} className="text-gray-400" />
                  )}
                </button>
              </div>

              {/* Add Multiple Participants (Telegram style) */}
              <div className="border border-gray-100 rounded-2xl p-3 bg-white flex flex-col h-[280px]">
                <h4 className="text-xs font-black text-[#111B21] mb-2">Select Participants ({selectedMembers.length} chosen)</h4>
                
                {/* Local search to filter participant list */}
                <div className="relative mb-2">
                  <input 
                    type="text"
                    placeholder="Refine participants selection list..."
                    className="w-full bg-[#F0F2F5] py-2 pl-9 pr-4 rounded-xl text-[11px] font-medium text-[#111B21] focus:outline-none transition-all"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                  <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredParticipants.map(user => {
                    const isSelected = selectedMembers.includes(user.uid);
                    return (
                      <div 
                        key={user.uid}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMembers(selectedMembers.filter(m => m !== user.uid));
                          } else {
                            setSelectedMembers([...selectedMembers, user.uid]);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border",
                          isSelected ? "bg-emerald-50/50 border-emerald-300" : "hover:bg-gray-50 border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '')}`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-800 truncate">{user.displayName}</p>
                            <p className="text-[9px] text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="p-0.5 shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center text-white">
                              <Check size={12} className="stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-gray-100 pt-3 flex gap-3 mt-4">
              <button
                onClick={() => { setShowGroupModal(false); setSelectedMembers([]); }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-xs font-extrabold rounded-xl hover:bg-gray-200 transition-all cursor-pointer text-center uppercase"
              >
                Cancel
              </button>
              <button
                disabled={!groupName.trim()}
                onClick={handleCreateGroupChat}
                className="flex-1 py-3 bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer text-center uppercase shadow-md active:scale-95"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TELEGRAM CHANNELS CREATION PANEL --- */}
      <AnimatePresence>
        {showChannelModal && (
          <div className="absolute inset-0 bg-white z-[200] flex flex-col p-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4 select-none">
              <button 
                onClick={() => setShowChannelModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
               >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-lg font-black text-[#111B21]">Create Broadcast Channel</h2>
                <p className="text-[11px] text-gray-500 font-bold">Megaphone broadcast feed with followers state</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-black uppercase text-purple-600 mb-1.5">Channel Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Official announcements ticker..."
                  className="w-full bg-[#F0F2F5] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 font-bold text-[#111B21] transition-all border border-transparent shadow-inner"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-purple-600 mb-1.5">Channel Bio Description</label>
                <textarea 
                  placeholder="Describe what announcements follow in this broadcast feed..."
                  rows={3}
                  className="w-full bg-[#F0F2F5] px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 font-medium text-[#111B21] transition-all border border-transparent shadow-inner resize-none"
                  value={channelBio}
                  onChange={(e) => setChannelBio(e.target.value)}
                />
              </div>

              {/* Public Private toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="text-xs font-black text-[#111B21]">Public Visibility Toggle</h4>
                  <p className="text-[10px] text-gray-500 font-medium font-medium">Public channels can be searchable and subscribed to by any active user directories.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChannelIsPublic(!channelIsPublic)}
                  className="text-gray-600 hover:text-purple-600"
                >
                  {channelIsPublic ? (
                    <ToggleRight size={38} className="text-purple-600" />
                  ) : (
                    <ToggleLeft size={38} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-gray-100 pt-3 flex gap-3 mt-4">
              <button
                onClick={() => setShowChannelModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 text-xs font-extrabold rounded-xl hover:bg-gray-200 transition-all cursor-pointer text-center uppercase"
              >
                Cancel
              </button>
              <button
                disabled={!channelName.trim()}
                onClick={handleCreateBroadcastChannel}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer text-center uppercase shadow-md active:scale-95"
              >
                Create Channel
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

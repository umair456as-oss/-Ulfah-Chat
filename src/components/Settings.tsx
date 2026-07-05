import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Search, User, Key, Lock, List as ListIcon, 
  MessageSquare, Radio, Bell, Accessibility, ChevronRight, 
  Shield, UserPlus, Mail, Smartphone, FileText, Share2, 
  Trash2, Eye, Image as ImageIcon, Info, Link as LinkIcon,
  CircleDashed, ToggleLeft as Toggle, Clock, Sun, 
  Palette, Send, EyeOff, Languages, Volume2, History,
  Database, HelpCircle, Users, Smile, BadgePlus, QrCode, PlusCircle,
  Ban
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { cn } from '../utils';
import { auth, db } from '../firebase';
import { updateDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

interface SettingsProps {
  profile: UserProfile;
}

type SettingsTab = 'main' | 'account' | 'privacy' | 'lists' | 'chats' | 'notifications' | 'accessibility' | 'blocked';

export default function Settings({ profile }: SettingsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('main');

  const [blockedChats, setBlockedChats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ulfah_blocked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  React.useEffect(() => {
    const syncBlocked = () => {
      try {
        const saved = localStorage.getItem('ulfah_blocked_chats');
        setBlockedChats(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('ulfah_blocked_chats_changed', syncBlocked);
    window.addEventListener('storage', syncBlocked);
    return () => {
      window.removeEventListener('ulfah_blocked_chats_changed', syncBlocked);
      window.removeEventListener('storage', syncBlocked);
    };
  }, []);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const snap = await getDocs(query(collection(db, 'users')));
        const usersList: UserProfile[] = [];
        snap.forEach(doc => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users for blocked list:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUnblock = (uid: string) => {
    const next = blockedChats.filter(id => id !== uid);
    setBlockedChats(next);
    localStorage.setItem('ulfah_blocked_chats', JSON.stringify(next));
    window.dispatchEvent(new Event('ulfah_blocked_chats_changed'));
  };

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.displayName || '');
  const [editUsername, setEditUsername] = useState(profile.username || '');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const checkUsernameAndSave = async () => {
    if (!profile.uid) return;
    setUsernameError('');
    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    if (!cleanUsername) {
      setUsernameError('Username cannot be empty');
      return;
    }

    if (cleanUsername !== (profile.username || '').toLowerCase()) {
      try {
        setIsSavingProfile(true);
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUsernameError('Username already taken');
          setIsSavingProfile(false);
          return;
        }
      } catch (err) {
        console.error('Error checking username:', err);
      }
    }

    try {
      setIsSavingProfile(true);
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: editName.trim(),
        username: cleanUsername,
        bio: editBio.trim()
      });
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };
  
  // Settings States initialized from profile or defaults
  const settings = profile.userSettings || {
    readReceipts: true,
    enterIsSend: false,
    mediaVisibility: true,
    keepArchived: true,
    conversationTones: true,
    reminders: true,
    highPriority: true,
    increaseContrast: false,
    theme: 'system',
    fontSize: 'medium',
    lastSeenVisibility: 'nobody',
    profilePhotoVisibility: 'myContacts',
    aboutVisibility: 'everyone',
    statusVisibility: 'myContacts',
    linksVisibility: 'everyone',
    disappearingMessagesTimer: 'off',
    securityNotifications: true
  };

  const updateSetting = async (key: string, value: any) => {
    if (!profile.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [`userSettings.${key}`]: value
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const cycleVisibility = (key: string, current: string) => {
    const options: ('everyone' | 'myContacts' | 'nobody')[] = ['everyone', 'myContacts', 'nobody'];
    const currentIndex = options.indexOf(current as any);
    const nextValue = options[(currentIndex + 1) % options.length];
    updateSetting(key, nextValue);
  };

  const formatVisibilityLabel = (value: string) => {
    if (value === 'myContacts') return 'My contacts';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.uid) return;

    if (file.size > 500000) {
      alert('Photo is too large. Please select an image under 500KB.');
      return;
    }

    setIsPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: base64
        });
      } catch (error) {
        console.error('Failed to upload photo:', error);
      } finally {
        setIsPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBack = () => {
    if (activeTab === 'main') {
      navigate(-1);
    } else if (activeTab === 'blocked') {
      setActiveTab('privacy');
    } else {
      setActiveTab('main');
    }
  };

  const renderHeader = (title: string) => (
    <div className="bg-white px-4 h-[70px] pt-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100 safe-area-top">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} className="p-2 -ml-2 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-[#111B21]">{title}</h1>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors">
          <Search size={22} />
        </button>
      </div>
    </div>
  );

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onClick, 
    toggle, 
    toggleValue 
  }: { 
    icon: any, 
    title: string, 
    subtitle?: string, 
    onClick?: () => void,
    toggle?: boolean,
    toggleValue?: boolean 
  }) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors group text-left"
    >
      <div className="p-2 text-[#54656F] group-hover:text-[#008069] transition-colors">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex-1 ml-4 border-b border-gray-50 pb-3 group-last:border-none">
        <div className="flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] text-[#111B21] leading-tight font-medium">{title}</h3>
            {subtitle && <p className="text-[14px] text-[#667781] mt-0.5 leading-tight truncate">{subtitle}</p>}
          </div>
          {toggle ? (
            <div className={cn(
              "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
              toggleValue ? "bg-[#25D366]" : "bg-gray-300"
            )}>
              <div className={cn(
                "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
                toggleValue ? "left-4.5" : "left-0.5"
              )} />
            </div>
          ) : onClick && <ChevronRight size={20} className="text-[#8696A0] ml-2" />}
        </div>
      </div>
    </button>
  );

  const renderMain = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Settings")}
      
      {/* Profile Section */}
      <div className="p-4 bg-white border-b border-gray-100 mb-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0 mt-1">
            <label className="cursor-pointer group block">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                className={cn(
                  "w-16 h-16 rounded-full object-cover border border-gray-100 shadow-sm",
                  isPhotoLoading && "opacity-50"
                )}
                alt="Profile"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon size={20} className="text-white" />
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isPhotoLoading} />
            </label>
          </div>
          
          {!isEditingProfile ? (
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
              setEditName(profile.displayName || '');
              setEditUsername(profile.username || '');
              setEditBio(profile.bio || '');
              setIsEditingProfile(true);
            }}>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#111B21] truncate leading-tight">{profile.displayName}</h2>
                <span className="text-xs text-[#008069] font-semibold hover:underline bg-[#D9FDD3] px-2 py-0.5 rounded-full">(Edit Profile)</span>
              </div>
              {profile.username && (
                <p className="text-sm text-[#008069] font-medium mt-0.5">@{profile.username}</p>
              )}
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                <Smile size={13} className="text-[#25D366]" />
                <span className="text-[11px] text-[#54656F] font-medium truncate max-w-[150px]">{profile.bio || "Available"}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[10px] text-[#54656F] font-bold uppercase tracking-wide mb-1">Display Name</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#008069] rounded px-3 py-1.5 text-xs text-gray-900 outline-none transition-colors"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#54656F] font-bold uppercase tracking-wide mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">@</span>
                  <input 
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-[#008069] rounded pl-7 pr-3 py-1.5 text-xs text-gray-900 outline-none transition-colors"
                    placeholder="username"
                  />
                </div>
                {usernameError && (
                  <p className="text-[10px] text-red-500 mt-1 font-semibold">{usernameError}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] text-[#54656F] font-bold uppercase tracking-wide mb-1">Bio (About)</label>
                <input 
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-[#008069] rounded px-3 py-1.5 text-xs text-gray-900 outline-none transition-colors"
                  placeholder="Hey there! I am using ChatApp."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button 
                  onClick={checkUsernameAndSave}
                  disabled={isSavingProfile}
                  className="px-3.5 py-1.5 bg-[#008069] hover:bg-[#005e4d] text-white font-bold text-[11px] rounded-full transition-colors disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => {
                    setIsEditingProfile(false);
                    setUsernameError('');
                  }}
                  disabled={isSavingProfile}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-[11px] rounded-full transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {!isEditingProfile && (
            <div className="flex items-center gap-2 flex-shrink-0 self-center">
               <QrCode className="text-[#008069] cursor-pointer hover:bg-gray-100 p-1 rounded-full" size={28} />
               <PlusCircle className="text-[#008069] cursor-pointer hover:bg-gray-100 p-1 rounded-full" size={28} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <SettingItem 
          icon={Key} 
          title="Account" 
          subtitle="Security notifications, change number" 
          onClick={() => setActiveTab('account')} 
        />
        <SettingItem 
          icon={Lock} 
          title="Privacy" 
          subtitle="Blocked accounts, disappearing messages" 
          onClick={() => setActiveTab('privacy')} 
        />
        <SettingItem 
          icon={ListIcon} 
          title="Lists" 
          subtitle="Manage people and groups" 
          onClick={() => setActiveTab('lists')} 
        />
        <SettingItem 
          icon={MessageSquare} 
          title="Chats" 
          subtitle="Theme, wallpapers, chat history" 
          onClick={() => setActiveTab('chats')} 
        />
        <SettingItem 
          icon={Radio} 
          title="Broadcasts" 
          subtitle="Manage lists and send broadcasts" 
        />
        <SettingItem 
          icon={Bell} 
          title="Notifications" 
          subtitle="Message, group & call tones" 
          onClick={() => setActiveTab('notifications')} 
        />
        <SettingItem 
          icon={Accessibility} 
          title="Accessibility" 
          onClick={() => setActiveTab('accessibility')} 
        />
      </div>
    </div>
  );

  const renderAccount = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Account")}
      <SettingItem 
        icon={Shield} 
        title="Security notifications" 
        toggle 
        toggleValue={settings.securityNotifications}
        onClick={() => updateSetting('securityNotifications', !settings.securityNotifications)}
      />
      <SettingItem icon={BadgePlus} title="Passkeys" subtitle="Create an extra layer of security" />
      <SettingItem icon={Mail} title="Email address" subtitle={profile.email} />
      <SettingItem icon={Smartphone} title="Two-step verification" subtitle="Extra security for your phone" />
      <SettingItem icon={Smartphone} title="Change phone number" />
      <SettingItem icon={FileText} title="Request account info" />
      <SettingItem icon={ListIcon} title="Ad preferences in Accounts Center" />
      <div className="h-px bg-gray-100 my-2" />
      <SettingItem icon={UserPlus} title="Add account" />
      <SettingItem 
        icon={Trash2} 
        title="Delete account" 
        onClick={() => {
          if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            auth.signOut();
            navigate('/');
          }
        }} 
      />
    </div>
  );

  const renderPrivacy = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Privacy")}
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Who can see my personal info</div>
      <SettingItem 
        icon={Eye} 
        title="Last seen and online" 
        subtitle={formatVisibilityLabel(settings.lastSeenVisibility || 'nobody')} 
        onClick={() => cycleVisibility('lastSeenVisibility', settings.lastSeenVisibility || 'nobody')}
      />
      <SettingItem 
        icon={ImageIcon} 
        title="Profile picture" 
        subtitle={formatVisibilityLabel(settings.profilePhotoVisibility || 'myContacts')} 
        onClick={() => cycleVisibility('profilePhotoVisibility', settings.profilePhotoVisibility || 'myContacts')}
      />
      <SettingItem 
        icon={Info} 
        title="About" 
        subtitle={formatVisibilityLabel(settings.aboutVisibility || 'everyone')} 
        onClick={() => cycleVisibility('aboutVisibility', settings.aboutVisibility || 'everyone')}
      />
      <SettingItem 
        icon={LinkIcon} 
        title="Links" 
        subtitle={formatVisibilityLabel(settings.linksVisibility || 'everyone')} 
        onClick={() => cycleVisibility('linksVisibility', settings.linksVisibility || 'everyone')}
      />
      <SettingItem 
        icon={CircleDashed} 
        title="Status" 
        subtitle={formatVisibilityLabel(settings.statusVisibility || 'myContacts')} 
        onClick={() => cycleVisibility('statusVisibility', settings.statusVisibility || 'myContacts')}
      />
      
      <div className="h-px bg-gray-100 my-2" />
      
      <div className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-[17px] text-[#111B21] font-medium leading-tight">Read receipts</h3>
            <p className="text-[14px] text-[#667781] mt-1 leading-snug">
              If turned off, you won't send or receive Read receipts. Read receipts are always sent for group chats.
            </p>
          </div>
          <button 
            onClick={() => updateSetting('readReceipts', !settings.readReceipts)}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative flex-shrink-0 mt-1",
              settings.readReceipts ? "bg-[#25D366]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
              settings.readReceipts ? "left-5.5" : "left-0.5"
            )} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Disappearing messages</div>
      <SettingItem 
        icon={Clock} 
        title="Default message timer" 
        subtitle={settings.disappearingMessagesTimer === 'off' ? 'Off' : settings.disappearingMessagesTimer} 
        onClick={() => {
          const timers: ('off' | '24h' | '7d' | '90d')[] = ['off', '24h', '7d', '90d'];
          const current = settings.disappearingMessagesTimer || 'off';
          const next = timers[(timers.indexOf(current as any) + 1) % timers.length];
          updateSetting('disappearingMessagesTimer', next);
        }}
      />
      <div className="h-px bg-gray-100 my-2" />
      <SettingItem 
        icon={Ban} 
        title="Blocked contacts" 
        subtitle={`${blockedChats.length} contacts`} 
        onClick={() => setActiveTab('blocked')}
      />
    </div>
  );

  const renderLists = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Lists")}
      <div className="p-8 flex flex-col items-center text-center">
        <div className="flex gap-[-10px] mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm -mr-4 overflow-hidden p-3">
             <Smile className="text-[#008069] w-full h-full" />
          </div>
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm -mr-4 overflow-hidden p-3">
             <Users className="text-blue-600 w-full h-full" />
          </div>
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden p-3">
             <PlusCircle className="text-gray-400 w-full h-full" />
          </div>
        </div>
        <p className="text-[#54656F] text-sm mb-8 leading-relaxed max-w-xs">
          Any list you create becomes a filter at the top of your Chats tab.
        </p>
        <button 
          onClick={() => {
            const name = prompt("Enter list name:");
            if (name && name.trim()) {
              const currentLists = settings.customLists || [];
              updateSetting('customLists', [...currentLists, name.trim()]);
            }
          }}
          className="w-full py-3.5 bg-[#D9FDD3] text-[#008069] font-bold rounded-full flex items-center justify-center gap-2 hover:bg-[#c6fcc0] transition-colors"
        >
          <PlusCircle size={20} />
          Create a custom list
        </button>
      </div>

      <div className="px-6 py-4">
        <h3 className="text-sm font-bold text-[#667781] uppercase tracking-wide mb-4">Your lists</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Unread</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Favorites</h4>
            <p className="text-xs text-[#667781]">Add people or groups</p>
          </div>
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Groups</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          {settings.customLists?.map((list, i) => (
            <div key={i} className="flex justify-between items-center">
              <div>
                <h4 className="text-[17px] text-[#111B21] font-medium">{list}</h4>
                <p className="text-xs text-[#667781]">Custom List</p>
              </div>
              <button 
                onClick={() => {
                  const newLists = settings.customLists?.filter((_, index) => index !== i);
                  updateSetting('customLists', newLists);
                }}
                className="text-red-500 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

       <div className="px-6 py-4 mt-4">
        <h3 className="text-sm font-bold text-[#667781] uppercase tracking-wide mb-4">Available presets</h3>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-[17px] text-[#111B21] font-medium">Communities</h4>
            <p className="text-xs text-[#667781]">Preset</p>
          </div>
          <button className="bg-[#D9FDD3] text-[#008069] px-6 py-2 rounded-full font-bold text-sm">Add</button>
        </div>
      </div>
    </div>
  );

  const renderChats = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Chats")}
      <button 
        onClick={() => {
          const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
          const currentIndex = themes.indexOf(settings.theme);
          const nextTheme = themes[(currentIndex + 1) % themes.length];
          updateSetting('theme', nextTheme);
        }}
        className="w-full"
      >
        <SettingItem icon={Sun} title="Theme" subtitle={settings.theme === 'system' ? 'System default' : settings.theme === 'dark' ? 'Dark' : 'Light'} />
      </button>
      <SettingItem icon={Palette} title="Default chat theme" subtitle="Default" onClick={() => alert("Chat wallpaper feature coming soon!")} />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Chat settings</div>
      <SettingItem 
        icon={Send} 
        title="Enter is send" 
        subtitle="Enter key will send your message" 
        toggle 
        toggleValue={settings.enterIsSend}
        onClick={() => updateSetting('enterIsSend', !settings.enterIsSend)} 
      />
      <SettingItem 
        icon={ImageIcon} 
        title="Media visibility" 
        subtitle="Show newly downloaded media in your device's gallery" 
        toggle 
        toggleValue={settings.mediaVisibility}
        onClick={() => updateSetting('mediaVisibility', !settings.mediaVisibility)} 
      />
      <button 
        onClick={() => {
          const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
          const currentIndex = sizes.indexOf(settings.fontSize);
          const nextSize = sizes[(currentIndex + 1) % sizes.length];
          updateSetting('fontSize', nextSize);
        }}
        className="w-full"
      >
        <SettingItem icon={Languages} title="Font size" subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)} />
      </button>
      <SettingItem icon={Volume2} title="Voice message transcripts" subtitle="Read new voice messages" onClick={() => alert("Voice transcription is enabled for all chat messages.")} />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Archived chats</div>
      <SettingItem 
        icon={History} 
        title="Keep chats archived" 
        subtitle="Archived chats will remain archived when you receive a message" 
        toggle 
        toggleValue={settings.keepArchived}
        onClick={() => updateSetting('keepArchived', !settings.keepArchived)} 
      />
    </div>
  );

  const renderNotifications = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Notifications")}
      <SettingItem 
        icon={Volume2} 
        title="Conversation tones" 
        subtitle="Play sounds for incoming and outgoing messages." 
        toggle 
        toggleValue={settings.conversationTones}
        onClick={() => updateSetting('conversationTones', !settings.conversationTones)} 
      />
       <SettingItem 
        icon={Clock} 
        title="Reminders" 
        subtitle="Get occasional reminders about messages, calls or status updates you haven't seen" 
        toggle 
        toggleValue={settings.reminders}
        onClick={() => updateSetting('reminders', !settings.reminders)} 
      />
      
      <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">Messages</div>
      <SettingItem icon={Volume2} title="Notification tone" subtitle="Default (Elastic Ball)" onClick={() => alert("Notification sounds are managed by your system settings.")} />
      <SettingItem icon={Smartphone} title="Vibrate" subtitle="Default" onClick={() => alert("Vibration patterns are optimized for your device.")} />
      <SettingItem icon={MessageSquare} title="Popup notification" subtitle="Not available" />
      <SettingItem icon={Sun} title="Light" subtitle="White" onClick={() => alert("Notification light color set to White.")} />
      <SettingItem 
        icon={Shield} 
        title="Use high priority notifications" 
        subtitle="Show previews of notifications at the top of the screen" 
        toggle 
        toggleValue={settings.highPriority}
        onClick={() => updateSetting('highPriority', !settings.highPriority)} 
      />
    </div>
  );

  const renderAccessibility = () => (
    <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
      {renderHeader("Accessibility")}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-[17px] text-[#111B21] font-medium leading-tight">Increase contrast</h3>
            <p className="text-[14px] text-[#667781] mt-1 leading-snug">
              Darken key colors to make things easier to see while in light mode.
            </p>
          </div>
          <button 
            onClick={() => updateSetting('increaseContrast', !settings.increaseContrast)}
            className={cn(
              "w-10 h-5 rounded-full transition-colors relative flex-shrink-0 mt-1",
              settings.increaseContrast ? "bg-[#25D366]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all",
              settings.increaseContrast ? "left-5.5" : "left-0.5"
            )} />
          </button>
        </div>
      </div>
       <div className="px-4 py-3">
        <h4 className="text-[17px] text-[#111B21] font-medium">Animation</h4>
        <p className="text-[14px] text-[#667781] mt-1 leading-snug">
          Choose whether stickers and GIFs move automatically.
        </p>
      </div>
    </div>
  );

  const renderBlocked = () => {
    const blockedUsersList = allUsers.filter(u => blockedChats.includes(u.uid));

    return (
      <div className="flex flex-col bg-white h-full overflow-y-auto pb-20">
        {renderHeader("Blocked contacts")}
        <div className="px-4 py-3 text-[14px] font-bold text-[#667781] uppercase tracking-wide">
          Blocked Users ({blockedUsersList.length})
        </div>
        
        {loadingUsers && blockedUsersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <span className="text-sm">Loading blocked contacts...</span>
          </div>
        ) : blockedUsersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Ban size={32} className="text-gray-400" />
            </div>
            <h4 className="text-base font-bold text-gray-800">No blocked contacts</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              Blocked contacts will not be able to call you or send you messages. They will be listed here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockedUsersList.map((blockedUser) => (
              <div key={blockedUser.uid} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <img 
                    src={blockedUser.photoURL || `https://ui-avatars.com/api/?name=${blockedUser.displayName}`}
                    className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm"
                    alt={blockedUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#111B21]">{blockedUser.displayName || 'Unknown User'}</h4>
                    {blockedUser.username && (
                      <p className="text-xs text-gray-500">@{blockedUser.username}</p>
                    )}
                    {blockedUser.bio && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{blockedUser.bio}</p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleUnblock(blockedUser.uid)}
                  className="px-4 py-1.5 border border-red-200 hover:border-red-400 text-red-600 hover:bg-red-50 text-xs font-bold rounded-full transition-all"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] relative z-40 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1"
        >
          {activeTab === 'main' && renderMain()}
          {activeTab === 'account' && renderAccount()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'lists' && renderLists()}
          {activeTab === 'chats' && renderChats()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'accessibility' && renderAccessibility()}
          {activeTab === 'blocked' && renderBlocked()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

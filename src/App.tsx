import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Explore from './components/Explore';
import Status from './components/Status';
import Contacts from './components/Contacts';
import CallHistory from './components/CallHistory';
import AdminPanel from './components/AdminPanel';
import { UserProfile, AppSettings, Announcement, Call } from './types';
import { doc, setDoc, onSnapshot, collection, query, orderBy, where, updateDoc, limit, getDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { reload, updatePassword } from 'firebase/auth';
import { db, messaging, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firebaseError';
import { ShieldAlert, Phone, PhoneOff, Mail, RefreshCw, LogOut, Clock, Video } from 'lucide-react';
import { cn } from './utils';
import VoiceCall from './components/VoiceCall';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import Settings from './components/Settings';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_VAPID_KEY = 'BMzgLSxYxgUSrjLkyEYhCqMJflI2nISGKbKU8xBR_vEqbHeNK59_ibPl6mEPpQ5gGve7qQYc7LuZmkz0juS-wRo';
const DEFAULT_APP_LOGO = '/logo.png'; // Improved high-quality fallback logo placeholder

const resolveLogo = (url?: string) => {
  if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
    return DEFAULT_APP_LOGO;
  }
  return url;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function App() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaError = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaError);

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (
        msg.includes('FIRESTORE') ||
        msg.includes('firestore') ||
        msg.includes('Unexpected state') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        setQuotaExceeded(true);
        event.preventDefault(); // Prevent standard browser crash overlay
      }
    };

    const handleGlobalRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (
        msg.includes('FIRESTORE') ||
        msg.includes('firestore') ||
        msg.includes('Unexpected state') ||
        msg.includes('Quota limit exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED')
      ) {
        setQuotaExceeded(true);
        event.preventDefault(); // Prevent standard browser crash overlay
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalRejection);

    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaError);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalRejection);
    };
  }, []);

  useEffect(() => {
    if (!profile?.userSettings) return;
    
    const theme = profile.userSettings.theme;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (profile.userSettings.increaseContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (profile.userSettings.fontSize) {
      document.documentElement.setAttribute('data-font-size', profile.userSettings.fontSize);
    }
  }, [profile?.userSettings?.theme, profile?.userSettings?.increaseContrast, profile?.userSettings?.fontSize]);

  useEffect(() => {
    if (incomingCall) {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(e => console.error('Ringtone failed:', e));
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      if (!('Notification' in window)) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          // Get FCM Token
          const vapidKey = appSettings?.vapidKey || DEFAULT_VAPID_KEY;
          if (vapidKey && vapidKey !== 'BPE-YOUR-VAPID-KEY-HERE') {
            try {
              // Explicitly register service worker to ensure it's ready
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
              console.log('Service Worker registered:', registration);

              // Wait for service worker to be active
              await navigator.serviceWorker.ready;
              console.log('Service Worker ready');

              // Small delay to ensure everything is settled
              await new Promise(resolve => setTimeout(resolve, 2000));

              const token = await getToken(messaging, { 
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration
              });
              
              if (token) {
                console.log('FCM Token:', token);
                await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
              }

              // Web Push VAPID Registration
              try {
                const res = await fetch('/api/push-public-key');
                if (res.ok) {
                  const data = await res.json();
                  const publicKey = data.publicKey;
                  if (publicKey) {
                    const subscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlBase64ToUint8Array(publicKey)
                    });
                    const subStr = JSON.stringify(subscription);
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                      const userData = userSnap.data();
                      const existingSubs: string[] = userData.webPushSubscriptions || [];
                      if (!existingSubs.includes(subStr)) {
                        await updateDoc(userRef, {
                          webPushSubscriptions: [...existingSubs, subStr]
                        });
                        console.log('Registered Web Push Subscription successfully');
                      }
                    }
                  }
                }
              } catch (pushSubErr) {
                console.error('Failed to register Web Push VAPID subscription:', pushSubErr);
              }
            } catch (err) {
              console.error('Failed to get notifications configuration:', err);
            }
          }

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            if (payload.notification) {
              new Notification(payload.notification.title || 'New Message', {
                body: payload.notification.body,
                icon: resolveLogo(appSettings?.appLogoUrl)
              });
            }
          });
        }
      } catch (error) {
        console.error('Notification setup failed:', error);
      }
    };

    setupNotifications();
  }, [user]);

  // Client-side notification listener for new messages (Elite Feature)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            new Notification('New Message', {
              body: msg.text,
              icon: resolveLogo(appSettings?.appLogoUrl)
            });
          }
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'messages'));

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const logo = resolveLogo(appSettings?.appLogoUrl);
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = logo;
  }, [appSettings?.appLogoUrl]);

  useEffect(() => {
    const unsubS = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setAppSettings(doc.data() as AppSettings);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => unsubS();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qA = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(10));
    const unsubA = onSnapshot(qA, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'announcements');
    });

    return () => {
      unsubA();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = { id: callDoc.id, ...callDoc.data() } as Call;
        
        // Only show if not already in a call
        if (!activeCall && !incomingCall) {
          setIncomingCall(callData);
          
          // Auto-missed after 30 seconds
          const timer = setTimeout(async () => {
             const currentDoc = await getDoc(doc(db, 'calls', callDoc.id));
             if (currentDoc.exists() && currentDoc.data().status === 'calling') {
               await updateDoc(doc(db, 'calls', callDoc.id), { status: 'missed' });
             }
          }, 30000);
          
          return () => clearTimeout(timer);
        }
      } else {
        setIncomingCall(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'calls'));

    return () => unsubscribe();
  }, [user, activeCall, incomingCall]);

  const [ringtone] = useState(() => new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'));

  useEffect(() => {
    if (incomingCall) {
      ringtone.loop = true;
      ringtone.play().catch(e => console.warn('Ringtone autoplay blocked:', e));
    } else {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
  }, [incomingCall, ringtone]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      ringtone.pause();
      ringtone.currentTime = 0;
      setActiveCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall?.id) {
      ringtone.pause();
      ringtone.currentTime = 0;
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
      setIncomingCall(null);
    }
  };

  useEffect(() => {
    if (user && profile?.mustChangePassword && profile.pendingPassword) {
      const forcePasswordChange = async () => {
        const confirmChange = confirm(`An administrator has reset your password. Your temporary password is: ${profile.pendingPassword}. Would you like to update it now to something secure?`);
        if (confirmChange) {
          const newPass = prompt('Enter your new secure password:');
          if (newPass && newPass.length >= 6) {
            try {
              await updatePassword(user, newPass);
              await updateDoc(doc(db, 'users', user.uid), {
                mustChangePassword: false,
                pendingPassword: null
              });
              alert('Password updated successfully!');
            } catch (error: any) {
              console.error('Forced password update failed:', error);
              if (error.code === 'auth/requires-recent-login') {
                alert('Please log out and log back in with your temporary password to update it.');
              } else {
                alert('Failed to update password: ' + error.message);
              }
            }
          } else {
            alert('Password must be at least 6 characters.');
          }
        }
      };
      forcePasswordChange();
    }
  }, [user, profile?.mustChangePassword]);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      let lastUpdate = 0;
      let lastStatus = true;
      
      const updateStatus = async (isOnline: boolean) => {
        const now = Date.now();
        // Only update if status changed OR if it's been more than 1 minute since last update
        if (isOnline === lastStatus && now - lastUpdate < 60000) return;
        
        try {
          await updateDoc(userRef, { 
            isOnline, 
            lastSeen: new Date().toISOString() 
          });
          lastUpdate = now;
          lastStatus = isOnline;
        } catch (error) {
          console.debug("Status update skipped or failed:", error);
        }
      };

      updateStatus(true);

      const handleVisibilityChange = () => {
        const isOnline = document.visibilityState === 'visible';
        updateStatus(isOnline);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [user?.uid]); // Use user.uid to avoid re-running on every user object change

  useEffect(() => {
    if (user && user.email === 'abdulrehmanhabib.com@gmail.com' && profile?.isBanned) {
      const unbanAdmin = async () => {
        try {
          await updateDoc(doc(db, 'users', user.uid), { isBanned: false });
        } catch (error) {
          console.error("Failed to unban admin:", error);
        }
      };
      unbanAdmin();
    }
  }, [user?.uid, profile?.isBanned]);

  // Deep Link handler to let new users join easily via a shareable URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const joinId = params.get('join');
    if (joinId && user) {
      const handleJoinCommunityByUrl = async () => {
        try {
          const q = query(collection(db, 'groups'), where('uid', '==', joinId));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docRef = snap.docs[0].ref;
            const groupData = snap.docs[0].data();
            const members = groupData.members || [];
            
            if (!members.includes(user.uid)) {
              const updatedMembers = [...members, user.uid];
              await updateDoc(docRef, { members: updatedMembers });
              groupData.members = updatedMembers;
            }
            
            alert(`Joined community ${groupData.displayName} successfully!`);
            setSelectedChat({ uid: groupData.uid, ...groupData });
            navigate('/', { replace: true });
          } else {
            alert('Community invite link is invalid or of an expired resource.');
            navigate('/', { replace: true });
          }
        } catch (err) {
          console.error("Failed joining community via share link:", err);
          navigate('/', { replace: true });
        }
      };
      handleJoinCommunityByUrl();
    }
  }, [location.search, user, navigate]);

  const handleStartCall = (otherUser: UserProfile, type: 'voice' | 'video') => {
    if (!profile) return;
    setActiveCall({
      callerId: profile.uid,
      callerName: profile.displayName || 'User',
      callerPhoto: profile.photoURL || '',
      receiverId: otherUser.uid,
      status: 'calling',
      type: type,
      timestamp: new Date()
    });
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} logoUrl={resolveLogo(appSettings?.appLogoUrl)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center shadow-lg transform scale-125 overflow-hidden">
            <img 
              src={resolveLogo(appSettings?.appLogoUrl)} 
              className="w-full h-full object-cover"
              alt="Ulfah Chat Logo"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-[#25D366] font-bold text-xl">Ulfah Chat</p>
          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-[#8696A0] text-[10px] uppercase tracking-[0.2em] font-medium">from</p>
            <p className="text-[#111B21] font-bold tracking-widest text-sm">Ulfah.llc</p>
          </div>
          <div className="mt-4 text-[#8696A0] text-[10px] font-medium">
            ©️ abdulrehmanhabib
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Active Tab Derived from path
  const path = location.pathname;
  const activeTab = path === '/admin' ? 'admin' : path === '/status' ? 'status' : path === '/explore' ? 'explore' : path === '/contacts' ? 'contacts' : path === '/settings' ? 'settings' : 'chats';

  // Email Verification Check Removed

  // Maintenance Mode Check (Admins bypass)
  const isAdmin = profile.role === 'admin' || user.email === 'abdulrehmanhabib.com@gmail.com';
  if (appSettings?.isMaintenanceMode && !isAdmin) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-[#111B21] text-white p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold mb-4">System Under Maintenance</h1>
        <p className="text-[#667781] max-w-md leading-relaxed">
          We are currently performing scheduled maintenance to improve your experience. 
          Please check back in a few minutes.
        </p>
        <div className="mt-8 px-6 py-3 bg-[#202C33] rounded-xl border border-[#2b2b2b] text-sm text-[#858585]">
          Estimated time: 15-30 minutes
        </div>
      </div>
    );
  }

  if (profile.isBanned && user.email !== 'abdulrehmanhabib.com@gmail.com') {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#F0F2F5]">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Account Banned</h1>
          <p className="text-[#54656F]">Your account has been suspended for violating our terms of service.</p>
        </div>
      </div>
    );
  }

  const isReaderPage = path === '/explore' || path === '/status' || path === '/settings';

  return (
    <div 
      className={cn(activeTab === 'admin' ? "w-full h-dvh flex flex-col bg-[#1e1e1e] relative overflow-hidden" : "layout-shield relative")}
    >
      {quotaExceeded && (
        <div className="bg-amber-600 text-white py-3 px-4 relative z-[9999] shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-all">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="shrink-0 text-amber-200 animate-pulse animate-bounce" />
            <div className="text-xs sm:text-sm font-medium">
              <span className="font-bold">Daily Database Quota Exceeded (Free Tier)!</span> Some database operations may fail until your Spark Plan quota resets tomorrow.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0459240900/firestore/databases/ai-studio-14fe2e05-9393-4e2e-8fb5-2d753f28d925/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
            >
              Enable Billing & Upgrade
            </a>
            <button 
              onClick={() => setQuotaExceeded(false)}
              className="text-white hover:text-amber-200 p-1 rounded transition-colors text-xs uppercase font-bold tracking-wider shrink-0"
              title="Close warning"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {activeTab !== 'admin' && !isReaderPage && <Header profile={profile} onSearch={setSearchQuery} logoUrl={resolveLogo(appSettings?.appLogoUrl)} />}
      
      {/* System Announcement Ticker (Elite Feature) */}
      {activeTab !== 'admin' && appSettings?.tickerMessages && appSettings.tickerMessages.length > 0 && (
        <div className="bg-[#008069] text-white py-1.5 px-4 overflow-hidden whitespace-nowrap relative z-50 border-b border-[#075E54]">
          <div className="inline-block animate-marquee hover:pause">
            {appSettings.tickerMessages.map((msg, i) => (
              <span key={i} className="mx-12 font-bold uppercase text-xs tracking-wider">
                📢 {msg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Announcement Ticker */}
      {activeTab !== 'admin' && announcements.length > 0 && (
        <div className="bg-[#25D366] text-white py-2 px-4 overflow-hidden whitespace-nowrap relative z-50">
          <div className="inline-block animate-marquee hover:pause">
            {announcements.map((a, i) => (
              <span key={a.id} className="mx-8 font-medium">
                {a.text}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={
              <>
            <div className={cn(
              "w-full xl:w-[400px] border-r border-[#D1D7DB] bg-white flex flex-col shrink-0",
              selectedChat ? "hidden xl:flex" : "flex"
            )}>
              <ChatList onSelectChat={setSelectedChat} selectedChat={selectedChat} searchQuery={searchQuery} />
            </div>
            <div className={cn(
              "flex-1 min-h-0 bg-[#F8F9FA] relative",
              selectedChat ? "flex" : "hidden xl:flex"
            )}>
              {selectedChat ? (
                <ChatWindow 
                  chat={selectedChat} 
                  currentUser={profile} 
                  onBack={() => setSelectedChat(null)} 
                  appSettings={appSettings} 
                  onStartCall={handleStartCall}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-[#f8f9fa]">
                  <div className="w-64 h-64 bg-gray-200 rounded-full mb-8 flex items-center justify-center opacity-70 shadow-inner overflow-hidden border-4 border-white">
                    <img 
                      src={resolveLogo(appSettings?.appLogoUrl)} 
                      className="w-full h-full object-cover"
                      alt="Ulfah Chat Logo"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h2 className="text-3xl font-light text-[#41525d] mb-4">Ulfah Chat Web</h2>
                  <p className="text-[#667781] text-sm max-w-sm leading-relaxed">
                    Send and receive messages without keeping your phone online.
                    Use Ulfah Chat on up to 4 linked devices and 1 phone at the same time.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-gray-400 text-xs">
                    <ShieldAlert size={14} />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              )}
            </div>
          </>
        } />
        <Route path="/contacts" element={
          <div className="w-full h-full min-h-0 border-r border-[#D1D7DB] bg-white flex flex-col">
            <Contacts onSelectChat={(u) => { setSelectedChat(u); navigate('/'); }} />
          </div>
        } />
        <Route path="/status" element={<Status profile={profile} />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/settings" element={<Settings profile={profile} />} />
        <Route path="/admin" element={
          (profile.role === 'admin' || profile.email === 'abdulrehmanhabib.com@gmail.com') ? 
          <AdminPanel onExit={() => navigate('/')} /> : 
          <Navigate to="/" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
        
        {/* Sidebar Navigation (Now at the bottom for mobile feel) */}
        {activeTab !== 'admin' && <Sidebar profile={profile} selectedChat={selectedChat} />}
      </div>

      {/* Incoming Call UI */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#111B21]/95 backdrop-blur-md flex flex-col items-center justify-between p-12 text-white"
          >
            <div className="flex flex-col items-center gap-6 mt-20">
              <div className="relative">
                <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20"></div>
                <img 
                  src={incomingCall.callerPhoto || `https://ui-avatars.com/api/?name=${incomingCall.callerName}`}
                  className="w-32 h-32 rounded-full border-4 border-[#25D366] shadow-2xl relative z-10"
                  alt=""
                />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{incomingCall.callerName}</h2>
                <p className="text-[#8696A0] text-lg animate-pulse font-medium">
                  {incomingCall.type === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}
                </p>
              </div>
            </div>

            <div className="flex gap-16 mb-20">
              <div className="flex flex-col items-center gap-3">
                <button 
                  onClick={handleDeclineCall}
                  className="p-6 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-xl hover:scale-110 active:scale-95"
                >
                  <PhoneOff size={32} />
                </button>
                <span className="text-sm font-medium text-[#8696A0]">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button 
                  onClick={handleAcceptCall}
                  className="p-6 bg-[#25D366] rounded-full hover:bg-[#128C7E] transition-all shadow-xl hover:scale-110 active:scale-95 animate-bounce"
                >
                  {incomingCall.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
                </button>
                <span className="text-sm font-medium text-[#8696A0]">Accept</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Overlay */}
      <AnimatePresence>
        {activeCall && (
          <VoiceCall 
            currentUser={profile}
            otherUser={{ 
              uid: activeCall.callerId === profile.uid ? activeCall.receiverId : activeCall.callerId,
              displayName: activeCall.callerName,
              photoURL: activeCall.callerPhoto
            } as UserProfile}
            callId={activeCall.id}
            isIncoming={activeCall.receiverId === profile.uid}
            initialType={activeCall.type}
            onEnd={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

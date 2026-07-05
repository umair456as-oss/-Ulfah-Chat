import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { LogIn, Mail, Lock, User, ArrowRight, Github, ImageIcon, AtSign } from 'lucide-react';
import { cn } from '../utils';
import { AppSettings } from '../types';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const DEFAULT_LOGO = '/logo.png';

  const resolveLogo = (url?: string) => {
    if (!url || url.includes('mosque.png') || url.includes('icons8.com') || url.includes('encrypted-tbn0.gstatic.com')) {
      return DEFAULT_LOGO;
    }
    return url;
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setAppSettings(doc.data() as AppSettings);
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    if (isRegistering) {
      if (!displayName.trim()) {
        setError('Please set your Full Name first.');
        return;
      }
      if (!username.trim()) {
        setError('Please set your Username first.');
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username.trim())) {
        setError('Username can only contain letters, numbers, and underscores.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setError('This username is already taken. Please choose another username.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setLoading(false);
      }

      // Save registration values to localStorage to avoid hook race conditions
      localStorage.setItem('pending_registration', JSON.stringify({
        displayName: displayName.trim(),
        username: username.toLowerCase().trim()
      }));
    }

    try {
      setError(null);
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email && !user.email.toLowerCase().endsWith('@gmail.com')) {
        await auth.signOut();
        localStorage.removeItem('pending_registration');
        setError('Only @gmail.com emails are allowed.');
        return;
      }

      if (isRegistering) {
        // Double check username to ensure uniqueness
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const existingUser = querySnapshot.docs[0];
          if (existingUser.id !== user.uid) {
            localStorage.removeItem('pending_registration');
            await auth.signOut();
            setError('This username is already taken. Please choose another username.');
            return;
          }
        }

        // Setup the user profile document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: displayName.trim(),
          username: username.toLowerCase().trim(),
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
          balance: 0,
          role: 'user',
          isOnline: true,
          lastSeen: new Date().toISOString(),
          isVerified: false,
          isBanned: false,
          level: 'Bronze',
          experience: 0,
          createdAt: serverTimestamp()
        }, { merge: true });

        localStorage.removeItem('pending_registration');
      }
    } catch (error: any) {
      localStorage.removeItem('pending_registration');
      if (error.code === 'auth/popup-blocked') {
        setError('Popup Blocked! Your browser or iframe sandbox has blocked the login window. Please allow popups, or click the "New Tab" button in the upper-right corner of AI Studio to open the app on a full tab.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('The Google Sign-In popup was closed before completion. Please keep the popup window open to sign in.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setError('A previous login request is still pending. Please wait a moment.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In.');
      } else if (error.message && (error.message.includes('Pending promise') || error.message.includes('INTERNAL ASSERTION FAILED'))) {
        setError('Iframe authentication limit. Please click "New Tab" in the upper-right corner to open the app in a full window, then sign in with Google.');
      } else {
        setError(error.message || 'An unexpected authentication error occurred.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-[#F0F2F5] p-4 font-sans relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ 
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundSize: '400px',
          backgroundRepeat: 'repeat'
        }}
      ></div>

      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full border border-gray-100 z-10">
        <div className="w-20 h-20 rounded-full mb-6 flex items-center justify-center shadow-lg ring-4 ring-[#25D366]/10 transition-transform hover:scale-110 overflow-hidden">
          <img 
            src={resolveLogo(appSettings?.appLogoUrl)} 
            className="w-full h-full object-cover"
            alt="Ulfah Chat Logo"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-3xl font-bold text-[#111B21] mb-2">Ulfah Chat</h1>
        <p className="text-[#667781] text-center mb-6 text-sm font-medium">Simple. Reliable. Private.</p>



        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-xs mb-4 text-center">
            {error}
          </div>
        )}

        {isRegistering ? (
          <div className="w-full space-y-4">
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#25D366] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                required
              />
            </div>
            <div className="relative">
              <AtSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#25D366] rounded-xl py-3 pl-10 pr-4 text-gray-900 text-sm outline-none transition-all"
                required
              />
            </div>

            <p className="text-xs text-[#667781] text-center mt-2 px-1">
              Please enter your Full Name and a unique Username, then click the button below to register with Google.
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="mt-6 text-[#00A884] hover:underline text-sm font-bold"
        >
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </button>

        <p className="mt-8 text-[11px] text-[#8696A0] text-center leading-relaxed">
          By continuing, you agree to our <br />
          <span className="text-[#00A884] cursor-pointer font-semibold">Terms of Service</span> and <span className="text-[#00A884] cursor-pointer font-semibold">Privacy Policy</span>.
        </p>
        <p className="mt-4 text-[10px] text-[#8696A0] font-medium">
          ©️ abdulrehmanhabib | Ulfah.llc
        </p>
      </div>
    </div>
  );
}

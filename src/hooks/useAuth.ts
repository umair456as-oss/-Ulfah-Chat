import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebaseError';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            let regDisplayName = firebaseUser.displayName || '';
            let regUsername = '';

            try {
              const pendingReg = localStorage.getItem('pending_registration');
              if (pendingReg) {
                const parsed = JSON.parse(pendingReg);
                if (parsed.displayName) regDisplayName = parsed.displayName;
                if (parsed.username) regUsername = parsed.username;
                localStorage.removeItem('pending_registration');
              }
            } catch (e) {
              console.error('Pending registration parsing error:', e);
            }

            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: regDisplayName,
              username: regUsername,
              photoURL: firebaseUser.photoURL || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              balance: 0,
              role: 'user',
              isOnline: true,
              lastSeen: new Date().toISOString(),
              isVerified: false,
              isBanned: false,
              level: 'Bronze',
              experience: 0,
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            // Listen for real-time profile updates (like balance)
            unsubProfile = onSnapshot(userRef, (doc) => {
              if (doc.exists()) {
                setProfile(doc.data() as UserProfile);
              }
            }, (error) => {
              // On quota, let's still have a basic profile so app continues to run
              setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || '',
                phoneNumber: firebaseUser.phoneNumber || '',
                balance: 0,
                role: 'user',
                isOnline: true,
                lastSeen: new Date().toISOString(),
                isVerified: false,
                isBanned: false,
                level: 'Bronze',
                experience: 0,
              });
              setLoading(false);
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            });
          }
        } catch (error) {
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || '',
            phoneNumber: firebaseUser.phoneNumber || '',
            balance: 0,
            role: 'user',
            isOnline: true,
            lastSeen: new Date().toISOString(),
            isVerified: false,
            isBanned: false,
            level: 'Bronze',
            experience: 0,
          });
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return { user, profile, loading };
}

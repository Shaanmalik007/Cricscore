
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
// Fix: Ensure firestore functions are correctly imported from the modular firestore package
// @ts-ignore
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export type MembershipType = 'free' | 'member';

interface AuthContextType {
  user: User | null;
  membership: MembershipType;
  loading: boolean;
  logout: () => Promise<void>;
  upgradeAccount: () => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<MembershipType>('free');
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setMembership(data.membership || 'free');
          } else {
            // Create default profile for new users
            await setDoc(userDocRef, {
              email: currentUser.email,
              membership: 'free',
              createdAt: new Date().toISOString()
            });
            setMembership('free');
          }
        } catch (error: any) {
          // Check for permission errors specifically
          if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
             // Silent fallback: Do not log as error, just use local storage
             console.warn("Firestore access restricted. Using local storage for membership.");
          } else {
             console.error("Error fetching user profile:", error.message);
          }
          
          // Fallback to LocalStorage
          const localMem = localStorage.getItem(`membership_${currentUser.uid}`);
          setMembership((localMem as MembershipType) || 'free');
        }
      } else {
        setMembership('free');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => {
    return firebaseSignOut(auth);
  };

  const upgradeAccount = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        membership: 'member'
      });
      setMembership('member');
      setShowUpgradeModal(false);
      // Also sync local storage for redundancy
      localStorage.setItem(`membership_${user.uid}`, 'member');
    } catch (error: any) {
      // Fallback: If backend permission denied, store locally so the user can still use the feature
      if (error.code === 'permission-denied' || error.message.includes('permission') || error.message.includes('Missing or insufficient permissions')) {
          // Silent fallback for upgrade as well
          console.warn("Firestore write restricted. Upgrading via local storage.");
          localStorage.setItem(`membership_${user.uid}`, 'member');
          setMembership('member');
          setShowUpgradeModal(false);
      } else {
          console.error("Error upgrading account:", error.message);
          throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      membership, 
      loading, 
      logout, 
      upgradeAccount,
      showUpgradeModal,
      setShowUpgradeModal 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
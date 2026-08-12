// ============================
// Authentication Store
// ============================
// Zustand store for managing authentication state.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: 'admin' | 'user') => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

/**
 * Exchange the Firebase ID token for a JWT stored in an httpOnly cookie.
 * This lets the edge middleware protect /dashboard and /live server-side.
 * Fire-and-forget: failures degrade to client-side guards only.
 */
const syncJwtCookie = async (firebaseUser: FirebaseUser): Promise<void> => {
  try {
    const idToken = await firebaseUser.getIdToken(true);
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // Non-fatal: the app still works with client-side auth guards.
  }
};

const createUserDocument = async (firebaseUser: FirebaseUser, role: UserRole = 'user'): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as User;
  }

  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || 'User',
    photoURL: firebaseUser.photoURL || '',
    role,
    emailVerified: firebaseUser.emailVerified,
    isBanned: false,
    subscription: 'free',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    preferences: {
      autoplay: true,
      autoplayNext: true,
      videoQuality: '1080p',
      subtitlesEnabled: false,
      subtitleLanguage: 'en',
      matureContent: false,
      playNextEpisode: true,
      notifications: {
        uploads: true,
        liveStreams: true,
        comments: true,
        recommendations: true,
        marketing: false,
      },
      theme: 'dark',
      language: 'en',
    },
    stats: {
      totalWatchTime: 0,
      videosWatched: 0,
      commentsPosted: 0,
      followers: 0,
      following: 0,
      joinDate: new Date().toISOString(),
    },
  };

  await setDoc(userRef, newUser);
  return newUser;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      firebaseUser: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          set({ isLoading: true });
          if (firebaseUser) {
            try {
              syncJwtCookie(firebaseUser);
              const userDoc = await createUserDocument(firebaseUser);
              set({
                user: userDoc,
                firebaseUser,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } catch (error) {
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Failed to load user data',
              });
            }
          } else {
            set({
              user: null,
              firebaseUser: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        });
        return unsubscribe;
      },

      loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          syncJwtCookie(userCredential.user);
          const userDoc = await createUserDocument(userCredential.user);
          
          // Update last login
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            lastLoginAt: new Date().toISOString(),
          });

          set({
            user: { ...userDoc, lastLoginAt: new Date().toISOString() },
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'Login failed';
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = 'No account found with this email';
              break;
            case 'auth/wrong-password':
              errorMessage = 'Invalid password';
              break;
            case 'auth/invalid-credential':
              errorMessage = 'Invalid email or password';
              break;
            case 'auth/user-disabled':
              errorMessage = 'This account has been disabled';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'Too many attempts. Please try again later';
              break;
          }
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const userCredential = await signInWithPopup(auth, provider);
          syncJwtCookie(userCredential.user);
          const userDoc = await createUserDocument(userCredential.user);

          set({
            user: userDoc,
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Google login failed',
          });
          throw error;
        }
      },

      loginAsDemo: async (role: 'admin' | 'user') => {
        // Demo login: works without Firebase. Lets users explore every part of
        // the platform (including the admin dashboard) with zero setup.
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 400));
        const demoUser = role === 'admin'
          ? (await import('@/lib/demo-data')).DEMO_ADMIN
          : (await import('@/lib/demo-data')).DEMO_USERS[2];
        set({
          user: demoUser,
          firebaseUser: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      registerWithEmail: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          syncJwtCookie(userCredential.user);
          
          // Update profile with display name
          await updateProfile(userCredential.user, { displayName });
          
          // Send verification email
          await sendEmailVerification(userCredential.user);
          
          const userDoc = await createUserDocument(userCredential.user);
          
          set({
            user: userDoc,
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          let errorMessage = 'Registration failed';
          switch (error.code) {
            case 'auth/email-already-in-use':
              errorMessage = 'An account with this email already exists';
              break;
            case 'auth/weak-password':
              errorMessage = 'Password should be at least 6 characters';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Invalid email address';
              break;
          }
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        try {
          await signOut(auth);
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            error: null,
          });
        } catch (error: any) {
          set({ error: error.message || 'Logout failed' });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await sendPasswordResetEmail(auth, email);
          set({ isLoading: false });
        } catch (error: any) {
          let errorMessage = 'Failed to send reset email';
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = 'No account found with this email';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Invalid email address';
              break;
          }
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      verifyEmail: async () => {
        try {
          if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to send verification email' });
          throw error;
        }
      },

      updateUserProfile: async (data: Partial<User>) => {
        const { user, firebaseUser } = get();
        if (!user || !firebaseUser) throw new Error('Not authenticated');

        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, data);

          if (data.displayName) {
            await updateProfile(firebaseUser, { displayName: data.displayName });
          }
          if (data.photoURL) {
            await updateProfile(firebaseUser, { photoURL: data.photoURL });
          }

          set({ user: { ...user, ...data } });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update profile' });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

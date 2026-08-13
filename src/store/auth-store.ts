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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/** True when the client Firebase config is present and not placeholder values. */
function isFirebaseConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  return Boolean(key && key.length > 0 && !key.includes('YOUR_'));
}

/**
 * Turn a raw Firebase/Auth/Firestore error into a message a user can act on.
 * `auth/*` codes get friendly text; anything else (permission-denied, config,
 * network) surfaces the real cause instead of the generic fallback.
 */
function friendlyAuthError(error: any, fallback: string): string {
  const code: string | undefined = error?.code;
  const message: string | undefined = error?.message;

  if (code?.startsWith('auth/')) {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try logging in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'auth/operation-not-allowed':
        return 'Email/password sign-in is not enabled for this Firebase project. Enable it in the Firebase console → Authentication → Sign-in method.';
      case 'auth/invalid-api-key':
        return 'Firebase is not configured correctly on this deployment. Check that the NEXT_PUBLIC_FIREBASE_* environment variables are set.';
      case 'auth/configuration-not-found':
        return 'Firebase project configuration was not found. Check the NEXT_PUBLIC_FIREBASE_* environment variables.';
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection and try again.';
      default:
        return message || fallback;
    }
  }

  if (code === 'permission-denied' || /permission|denied|insufficient/i.test(message || '')) {
    return 'Permission denied — Firebase security rules are blocking this action. Make sure firestore.rules has been deployed to your Firebase project.';
  }

  return message || fallback;
}

function configErrorMessage(): string {
  return 'Firebase is not configured on this deployment. Add the NEXT_PUBLIC_FIREBASE_* environment variables (see .env.local.example) and redeploy.';
}

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

const createUserDocument = async (firebaseUser: FirebaseUser, role: UserRole = 'user', displayNameFallback?: string): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as User;
  }

  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || displayNameFallback || 'User',
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
            } catch {
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Failed to load user data',
              });
            }
          } else {
            // No Firebase session. Keep a previously persisted demo session
            // (demo users have no Firebase user, so firebaseUser is null)
            // so demo logins survive page reloads; real sessions that were
            // invalidated are dropped.
            const persisted = get();
            if (persisted.isAuthenticated && persisted.firebaseUser === null) {
              set({ isLoading: false, error: null });
            } else {
              set({
                user: null,
                firebaseUser: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
            }
          }
        });
        return unsubscribe;
      },

      loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        if (!isFirebaseConfigured()) {
          const msg = configErrorMessage();
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          syncJwtCookie(userCredential.user);
          const userDoc = await createUserDocument(userCredential.user);
          
          // Update last login
          try {
            await updateDoc(doc(db, 'users', userCredential.user.uid), {
              lastLoginAt: new Date().toISOString(),
            });
          } catch {
            // Non-fatal: profile timestamps are cosmetic; login still succeeds.
          }

          set({
            user: { ...userDoc, lastLoginAt: new Date().toISOString() },
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = friendlyAuthError(error, 'Login failed');
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        if (!isFirebaseConfigured()) {
          const msg = configErrorMessage();
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
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
        // Mint the httpOnly JWT cookie so the edge middleware (/dashboard,
        // /live, protected APIs) recognizes this session instead of bouncing
        // the user back to /login. Non-fatal if the API is unavailable.
        try {
          await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: '' }),
          });
        } catch {
          // Client-side guards still work without the cookie.
        }
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
        if (!isFirebaseConfigured()) {
          const msg = configErrorMessage();
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          syncJwtCookie(userCredential.user);
          
          // Update profile with display name (non-fatal: the Firestore profile
          // still stores the name even if the Auth profile update fails).
          try {
            await updateProfile(userCredential.user, { displayName });
          } catch {
            // ignore — registration should still complete
          }
          
          // Send verification email (non-fatal: the user can request one later).
          try {
            await sendEmailVerification(userCredential.user);
          } catch {
            // ignore — registration should still complete
          }
          
          const userDoc = await createUserDocument(userCredential.user, 'user', displayName);
          
          set({
            user: userDoc,
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = friendlyAuthError(error, 'Registration failed');
          set({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        // Clear the server-side JWT cookie first (non-fatal if it fails).
        try {
          await fetch('/api/auth/login', { method: 'DELETE' });
        } catch {
          // Cookie clearing is best-effort.
        }
        try {
          await signOut(auth);
        } catch {
          // In demo mode (no Firebase) signOut may throw — the local
          // session must still be cleared.
        }
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          error: null,
        });
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

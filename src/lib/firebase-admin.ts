// ============================
// Firebase Admin SDK
// ============================
// Used for server-side operations with elevated privileges.
// Initialize this only on the server side.

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;
let adminStorage: Storage | undefined;

/**
 * Whether the Firebase Admin SDK can be initialized on this deployment.
 * Returns false when FIREBASE_SERVICE_ACCOUNT_KEY is missing, which lets
 * the app run in demo mode (local demo data) without any credentials.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (!getApps().length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    adminApp = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

/**
 * Safe accessors. Return null instead of throwing when Firebase is not
 * configured, so API routes can respond gracefully in demo mode.
 */
export function getAdminAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

export function getAdminStorage(): Storage | null {
  if (!isFirebaseConfigured()) return null;
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}

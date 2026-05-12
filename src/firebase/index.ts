
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';

/**
 * Initializes Firebase, Firestore, and Auth.
 */
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
  
  // Explicitly set persistence to local for consistent behavior
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn("Failed to set auth persistence:", err);
  });
}

export { firebaseApp, firestore, auth };

export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
export * from './provider';

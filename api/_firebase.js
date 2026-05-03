import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;

export function getDb() {
  if (db) return db;

  try {
    if (!getApps().length) {
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('Missing Firebase Admin configuration. Check your environment variables.');
      }

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
    db = getFirestore();
    return db;
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    throw error;
  }
}

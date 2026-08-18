import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App (singleton across HMR reloads)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';

// Initialize Firestore with IndexedDB-backed offline persistence so the POS is a
// true hybrid database: reads and writes work offline, queue locally, and sync
// automatically when connectivity returns. persistentMultipleTabManager keeps
// multiple open tabs (e.g. cashier register + prep desk on the same machine)
// consistent by sharing one local cache.
let firestore: Firestore;
try {
  firestore = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    },
    databaseId
  );
} catch {
  // Firestore was already initialized (e.g. during Vite HMR) — reuse the instance.
  firestore = getFirestore(app, databaseId);
}

export const db: Firestore = firestore;

// Firebase Authentication. Customers browse/pre-order under an anonymous session;
// staff share one Email/Password account. STAFF_EMAIL is fixed in config so the
// login screen only needs a password. (Owner: change this to the real address and
// create that account in the Firebase console — see hand-off notes.)
export const auth: Auth = getAuth(app);
export const STAFF_EMAIL: string = firebaseConfigJson.staffEmail || 'staff@henzhealthcare.ph';

// Connection verification — forces a server read (bypassing the offline cache) so
// it reports true only when the device can actually reach Firestore right now.
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const probePromise = getDocFromServer(doc(db, 'system', 'connection_test'));
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const result = await Promise.race([probePromise, timeoutPromise]);
    return result !== null;
  } catch (error: any) {
    // Graceful fallback for offline mode or network initialization
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      return false;
    }
    return false;
  }
}

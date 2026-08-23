import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Product,
  CartItem,
  HeldCart,
  SaleTransaction,
  CustomerPreOrder,
  PreOrderStatus,
  BranchName,
  BranchKey,
  StockTransferRecord,
  UnifiedDatabaseMeta,
  PresetKit,
  SyncFailure,
} from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PREORDERS } from '../data/initialPreOrders';
import { INITIAL_TRANSFERS } from '../data/initialTransfers';
import { PRESET_KITS } from '../data/presetKits';
import { soundEffects } from '../utils/audio';
import { dateStamp, newDocId, randomCode, uniqueSerial } from '../utils/ids';
import { db, auth, STAFF_EMAIL, testFirestoreConnection } from '../lib/firebase';
import {
  BRANCH_MAIN,
  BRANCH_DJABEZ,
  branchNameForKey,
  branchStockField,
  normalizeBranch,
} from '../lib/branches';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

export type UserRole = 'user' | 'admin';
export type ActiveNavView = 'pos' | 'checklist-portal' | 'prep-queue' | 'inventory' | 'reports';

// Branch identity lives in `lib/branches` so plain utilities can resolve a branch
// without importing this React context. Re-exported here because every screen
// already reaches for these through usePOS's module.
export {
  BRANCH_MAIN,
  BRANCH_DJABEZ,
  BRANCH_ADDRESS,
  BRANCH_LANDMARK,
  normalizeBranch,
  branchStockField,
  branchNameForKey,
  branchKeyFor,
  branchShortLabel,
} from '../lib/branches';

// Firestore collection names — single source of truth (Firestore names are case-sensitive).
// These must exactly match the collection names in firestore.rules.
export const COLLECTIONS = {
  products: 'products',
  transactions: 'transactions',
  preOrders: 'preOrders',
  stockTransfers: 'stock_transfers',
  presetKits: 'preset_kits',
} as const;

/**
 * Outcome of a staff sign-in attempt.
 *
 * A boolean is not enough: `signInWithEmailAndPassword` needs the network, so a
 * register that is offline fails exactly the same way a wrong password does.
 * Reporting that as "incorrect password" sends the cashier hunting for a
 * password that was never wrong, so the reason is carried out to the UI.
 */
export interface StaffLoginResult {
  ok: boolean;
  /** Ready-to-display explanation. Present whenever `ok` is false. */
  message?: string;
}

interface POSContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAdminAuthenticated: boolean;
  isAdminLoginModalOpen: boolean;
  setIsAdminLoginModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isDatabaseModalOpen: boolean;
  setIsDatabaseModalOpen: (open: boolean) => void;
  loginAdmin: (password: string) => Promise<StaffLoginResult>;
  logoutAdmin: () => void;
  products: Product[];
  presetKits: PresetKit[];
  addPresetKit: (kit: Omit<PresetKit, 'id'>) => PresetKit;
  updatePresetKit: (kit: PresetKit) => void;
  deletePresetKit: (kitId: string) => void;
  resetPresetKitsToDefaults: () => void;
  activeBranch: BranchName;
  setActiveBranch: (b: BranchName) => void;
  heldCarts: HeldCart[];
  activeCartIndex: number;
  setActiveCartIndex: (idx: number) => void;
  addNewCart: (name?: string, customerType?: HeldCart['customerType']) => void;
  closeCart: (cartId: string) => void;
  updateCartName: (cartId: string, name: string, customerType?: HeldCart['customerType']) => void;
  currentCartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCurrentCart: () => void;
  loadPreOrderIntoCart: (preOrderId: string) => boolean;
  loadPresetKitIntoCart: (kitId: string) => void;
  completeSale: (saleData: {
    customerName: string;
    customerType: HeldCart['customerType'];
    paymentMethod: SaleTransaction['paymentMethod'];
    amountTendered?: number;
    referenceNumber?: string;
    bankName?: string;
    discountAmount?: number;
    cashierName?: string;
  }) => SaleTransaction | null;
  transactions: SaleTransaction[];
  preOrders: CustomerPreOrder[];
  stockTransfers: StockTransferRecord[];
  addCustomerPreOrder: (orderInput: {
    customerName: string;
    schoolOrClinic: string;
    contactNumber: string;
    email?: string;
    pickupBranch: BranchName;
    targetPickupDate: string;
    items: { productId: string; quantity: number }[];
    paymentStatus: CustomerPreOrder['paymentStatus'];
    paymentMethod: CustomerPreOrder['paymentMethod'];
    paymentRefNumber?: string;
    notes?: string;
  }) => CustomerPreOrder;
  updatePreOrderStatus: (orderId: string, status: PreOrderStatus, packedItemIds?: string[]) => void;
  transferStock: (
    productId: string,
    from: BranchKey,
    to: BranchKey,
    quantity: number,
    staffName?: string,
    notes?: string
  ) => void;
  restockProduct: (
    productId: string,
    quantity: number,
    target: BranchKey,
    batchNumber?: string,
    expiryDate?: string
  ) => void;
  updateProduct: (product: Product) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  deleteProduct: (productId: string) => void;
  isCloudOnline: boolean;
  isSyncing: boolean;
  pendingWriteCount: number;
  syncFailures: SyncFailure[];
  dismissSyncFailure: (id: string) => void;
  databaseMeta: UnifiedDatabaseMeta;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonString: string) => boolean;
  resetDatabaseToDefaults: () => void;
  isJulyPeakSeasonMode: boolean;
  setIsJulyPeakSeasonMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeView: ActiveNavView;
  setActiveView: (v: ActiveNavView) => void;
  recentCompletedSale: SaleTransaction | null;
  setRecentCompletedSale: (sale: SaleTransaction | null) => void;
  activePreOrderModal: CustomerPreOrder | null;
  setActivePreOrderModal: (po: CustomerPreOrder | null) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Staff authentication is backed by Firebase Auth. isAdminAuthenticated is true
  // only when signed in with the shared staff Email/Password account (a
  // non-anonymous user); anonymous customers are always false. The Firebase SDK
  // persists the session, so a reload keeps staff signed in.
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  // Gate the Firestore listeners until the first auth session exists, so listens
  // never fire without a token (locked security rules require request.auth != null).
  const [authReady, setAuthReady] = useState<boolean>(false);
  // Mirrors staff status for use inside the (stable) snapshot listener closure.
  const isStaffRef = useRef<boolean>(false);

  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // Customer share links (?mode=preorder) stay pinned to the portal even for staff.
  const preorderPinned =
    typeof window !== 'undefined' && window.location.search.includes('mode=preorder');

  // User vs Admin UI mode. No login is required for customers to view & submit
  // pre-order checklists; the auth listener promotes the mode to 'admin' once the
  // shared staff account signs in.
  const [userRole, setUserRoleState] = useState<UserRole>('user');

  const setUserRole = (role: UserRole) => {
    if (role === 'admin') {
      if (!isAdminAuthenticated) {
        setIsAdminLoginModalOpen(true);
        return;
      }
      setUserRoleState('admin');
    } else {
      setUserRoleState('user');
      setActiveView('checklist-portal');
    }
  };

  // Sign in as staff using the shared account. onAuthStateChanged then flips
  // isAdminAuthenticated and switches into the POS workspace.
  //
  // This call ALWAYS needs the network — Firebase Auth has no offline password
  // check. An already-signed-in register keeps working offline (the session is
  // restored from IndexedDB), but a fresh sign-in cannot happen without a
  // connection, so that case is reported as its own failure rather than as a
  // bad password.
  const loginAdmin = async (password: string): Promise<StaffLoginResult> => {
    try {
      await signInWithEmailAndPassword(auth, STAFF_EMAIL, password.trim());
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string } | null)?.code || '';
      console.warn(`Staff login failed (${code || 'unknown'}):`, err);

      switch (code) {
        case 'auth/network-request-failed':
        case 'auth/timeout':
          return {
            ok: false,
            message:
              'No internet connection, so the password could not be checked. Sign-in needs a connection even though the register itself works offline. Reconnect and try again — a register that was already signed in stays signed in.',
          };
        case 'auth/too-many-requests':
          return {
            ok: false,
            message:
              'Too many failed attempts, so sign-in is temporarily blocked on this device. Wait a few minutes, then try again with the correct password.',
          };
        case 'auth/user-disabled':
          return {
            ok: false,
            message:
              'The shared staff account has been disabled. Ask the store owner to re-enable it in the Firebase console.',
          };
        case 'auth/operation-not-allowed':
        case 'auth/invalid-email':
        case 'auth/configuration-not-found':
          return {
            ok: false,
            message: `Staff sign-in is not set up correctly on the server (${code}). Tell the store owner — no password will work until it is fixed.`,
          };
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/user-not-found':
          return {
            ok: false,
            message:
              'Incorrect staff password. Please check with the store owner and try again.',
          };
        default:
          return {
            ok: false,
            message: `Sign-in failed${
              code ? ` (${code})` : ''
            }. Check the password, then tell the store owner if it keeps happening.`,
          };
      }
    }
  };

  // Sign out of staff and drop back to an anonymous customer session. The auth
  // listener re-signs-in anonymously and resets the UI to the portal.
  const logoutAdmin = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign-out failed:', err);
    }
    setActiveView('checklist-portal');
  };

  // ── Unified Central Database (Firestore is the source of truth) ──────────────
  // These five datasets are driven entirely by the Firestore onSnapshot listeners
  // below. Firestore's IndexedDB offline cache persists them across reloads and
  // serves them when offline, so we start empty and let the cache/server fill them.
  const [products, setProducts] = useState<Product[]>([]);

  const [activeBranch, setActiveBranch] = useState<BranchName>(() =>
    // Normalized, so a register that was last used on the old "USA Branch" label
    // reopens on the renamed branch instead of silently reverting to Main.
    normalizeBranch(localStorage.getItem('henz_active_branch_v3'))
  );

  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    const saved = localStorage.getItem('henz_held_carts_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [
      {
        id: 'cart-1',
        name: 'Order #1 (Walk-in)',
        items: [],
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customerType: 'Walk-in',
      },
    ];
  });

  const [activeCartIndex, setActiveCartIndex] = useState<number>(0);

  // 1 Unified Central Database: Transactions Table (tagged by branch)
  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);

  // 1 Unified Central Database: Pre-Orders Table (tagged by pickup branch)
  const [preOrders, setPreOrders] = useState<CustomerPreOrder[]>([]);

  // 1 Unified Central Database: Inter-Branch Stock Transfers Ledger
  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>([]);

  // Starter Checklist Preset Kits (Manageable & Persistent)
  const [presetKits, setPresetKits] = useState<PresetKit[]>([]);

  const [isJulyPeakSeasonMode, setIsJulyPeakSeasonMode] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ActiveNavView>(() => {
    return userRole === 'user' ? 'checklist-portal' : 'pos';
  });
  const [recentCompletedSale, setRecentCompletedSale] = useState<SaleTransaction | null>(null);
  const [activePreOrderModal, setActivePreOrderModal] = useState<CustomerPreOrder | null>(null);

  // Cloud sync status — drives the header online/offline + "syncing" indicator.
  // Seeded from navigator.onLine only as a first guess; the Firestore listeners
  // take over with the real answer (see markSyncState) as soon as they report.
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  // How many documents currently hold local changes the server hasn't accepted.
  const [pendingWriteCount, setPendingWriteCount] = useState<number>(0);
  const pendingWritesRef = useRef<Record<string, boolean>>({});
  const pendingCountsRef = useRef<Record<string, number>>({});
  const fromCacheRef = useRef<Record<string, boolean>>({});

  // Cloud writes that were REJECTED outright (see SyncFailure in types.ts for why
  // this is not the same thing as "waiting for the internet"). Surfaced in the UI
  // by SyncFailureBanner so a lost sale can never pass for a queued one.
  const [syncFailures, setSyncFailures] = useState<SyncFailure[]>([]);

  const reportSyncFailure = (kind: SyncFailure['kind'], label: string, err: unknown) => {
    const code = (err as { code?: string } | null)?.code;
    const message = code || (err instanceof Error ? err.message : String(err));
    console.error(`[sync] ${kind} REJECTED — ${label} (check auth / rules / data):`, err);
    setSyncFailures((prev) =>
      [
        { id: newDocId('sf'), kind, label, message, at: new Date().toLocaleString() },
        ...prev,
      ].slice(0, 20)
    );
  };

  const dismissSyncFailure = (id: string) => {
    setSyncFailures((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Firebase Auth session ────────────────────────────────────────────────────
  // Every visitor gets a session: customers sign in anonymously; staff replace it
  // by signing in with the shared Email/Password account. This drives both the
  // admin gate and (via authReady) when the Firestore listeners may attach.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // No session yet — provision an anonymous one so reads/writes carry a token.
        isStaffRef.current = false;
        setIsAdminAuthenticated(false);
        signInAnonymously(auth).catch((err) => {
          console.warn(
            'Anonymous sign-in failed — enable Anonymous authentication in the Firebase console. ' +
              'Loading in degraded mode against the currently-deployed rules.',
            err
          );
          // Don't freeze on a blank screen: still open the listeners so the POS
          // loads if the deployed rules allow it (e.g. during initial setup).
          setAuthReady(true);
        });
        return;
      }
      const isStaff = !user.isAnonymous;
      isStaffRef.current = isStaff;
      setIsAdminAuthenticated(isStaff);
      if (isStaff && !preorderPinned) {
        setUserRoleState('admin');
        setActiveView((v) => (v === 'checklist-portal' ? 'pos' : v));
      } else if (!isStaff) {
        setUserRoleState('user');
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [preorderPinned]);

  // ── Firestore real-time sync engine ─────────────────────────────────────────
  // One onSnapshot listener per collection keeps all five datasets live. With the
  // offline cache enabled (see lib/firebase.ts), these fire from cache instantly
  // (even offline) and again from the server on reconnect, so the UI is always
  // driven by Firestore — never by ad-hoc local copies.
  useEffect(() => {
    if (!authReady) return; // Hold off until a Firebase Auth session exists.
    let isInitialLoad = true; // Prevents new-order chime spam on first paint
    const seeded: Record<string, boolean> = {};

    // Aggregate sync health across all five listeners for the header indicator.
    //
    // Two distinct facts come off every snapshot's metadata, and the header needs
    // both:
    //   • hasPendingWrites — this device has local changes the server has not
    //     acknowledged yet. Counted per document so staff can see HOW MUCH is
    //     waiting, not just that something is.
    //   • fromCache — Firestore served this snapshot from its own IndexedDB cache
    //     because it currently has no backend connection. This is the honest
    //     answer to "are we online?": `navigator.onLine` only knows whether a
    //     network interface exists, so it happily reports true on a café Wi-Fi
    //     that cannot reach Google at all. Firestore drops fromCache to false on
    //     every listener the moment its channel is up, and raises it on all of
    //     them when the channel goes down.
    const markSyncState = (
      key: string,
      snap: {
        metadata: { hasPendingWrites: boolean; fromCache: boolean };
        forEach: (cb: (d: { metadata: { hasPendingWrites: boolean } }) => void) => void;
      }
    ) => {
      pendingWritesRef.current[key] = snap.metadata.hasPendingWrites;
      setIsSyncing(Object.values(pendingWritesRef.current).some(Boolean));

      let pending = 0;
      snap.forEach((d) => {
        if (d.metadata.hasPendingWrites) pending++;
      });
      pendingCountsRef.current[key] = pending;
      setPendingWriteCount(
        Object.values(pendingCountsRef.current).reduce((sum, n) => sum + n, 0)
      );

      fromCacheRef.current[key] = snap.metadata.fromCache;
      // A pulled cable is worth reflecting instantly, before Firestore notices.
      const deviceOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const someListenerServerBacked = Object.values(fromCacheRef.current).some((c) => !c);
      setIsCloudOnline(deviceOffline ? false : someListenerServerBacked);
    };

    // Seed a collection's defaults ONLY when the server (not the offline cache)
    // confirms it is empty. This first-run provisioning never clobbers existing
    // cloud data, because a cold offline cache reports fromCache = true.
    const seedIfEmpty = (
      key: string,
      snap: { empty: boolean; metadata: { fromCache: boolean } },
      colName: string,
      initial: { id: string }[]
    ) => {
      if (snap.empty && !snap.metadata.fromCache && !seeded[key]) {
        seeded[key] = true;
        initial.forEach((item) => {
          setDoc(doc(db, colName, item.id), item).catch(() => {});
        });
      }
    };

    const subscriptions: Array<() => void> = [];

    try {
      // 1. Products
      subscriptions.push(
        onSnapshot(
          collection(db, COLLECTIONS.products),
          { includeMetadataChanges: true },
          (snap) => {
            const list: Product[] = [];
            snap.forEach((d) => list.push(d.data() as Product));
            setProducts(list);
            markSyncState('products', snap);
            seedIfEmpty('products', snap, COLLECTIONS.products, INITIAL_PRODUCTS);
          },
          (err) => console.warn('Firestore products listener:', err)
        )
      );

      // 2. Sales Transactions
      subscriptions.push(
        onSnapshot(
          collection(db, COLLECTIONS.transactions),
          { includeMetadataChanges: true },
          (snap) => {
            const list: SaleTransaction[] = [];
            snap.forEach((d) => {
              const data = d.data() as SaleTransaction;
              list.push({ ...data, branch: normalizeBranch(data.branch) });
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setTransactions(list);
            markSyncState('transactions', snap);
            // Deliberately NOT seeded. Sales are the store's real books — the
            // owner asked for the sales report to start from zero, and seeding
            // demo receipts here would silently re-create them the moment the
            // collection was emptied. An empty sales report is a correct one.
          },
          (err) => console.warn('Firestore transactions listener:', err)
        )
      );

      // 3. Customer Pre-Orders (chimes for staff when a new order arrives from a customer)
      subscriptions.push(
        onSnapshot(
          collection(db, COLLECTIONS.preOrders),
          { includeMetadataChanges: true },
          (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added' && !isInitialLoad && !change.doc.metadata.hasPendingWrites) {
                if (isStaffRef.current) soundEffects.playQRScanChime();
              }
            });
            const list: CustomerPreOrder[] = [];
            snap.forEach((d) => {
              const data = d.data() as CustomerPreOrder;
              if (data && data.orderNumber) {
                list.push({ ...data, pickupBranch: normalizeBranch(data.pickupBranch) });
              }
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPreOrders(list);
            markSyncState('preOrders', snap);
            seedIfEmpty('preOrders', snap, COLLECTIONS.preOrders, INITIAL_PREORDERS);
            isInitialLoad = false;
          },
          (err) => console.warn('Firestore pre-orders listener:', err)
        )
      );

      // 4. Inter-Branch Stock Transfers ledger
      subscriptions.push(
        onSnapshot(
          collection(db, COLLECTIONS.stockTransfers),
          { includeMetadataChanges: true },
          (snap) => {
            const list: StockTransferRecord[] = [];
            snap.forEach((d) => {
              const data = d.data() as StockTransferRecord;
              list.push({
                ...data,
                fromBranch: normalizeBranch(data.fromBranch),
                toBranch: normalizeBranch(data.toBranch),
              });
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setStockTransfers(list);
            markSyncState('stockTransfers', snap);
            seedIfEmpty('stockTransfers', snap, COLLECTIONS.stockTransfers, INITIAL_TRANSFERS);
          },
          (err) => console.warn('Firestore stock-transfers listener:', err)
        )
      );

      // 5. Preset Starter Kits
      subscriptions.push(
        onSnapshot(
          collection(db, COLLECTIONS.presetKits),
          { includeMetadataChanges: true },
          (snap) => {
            const list: PresetKit[] = [];
            snap.forEach((d) => list.push(d.data() as PresetKit));
            setPresetKits(list);
            markSyncState('presetKits', snap);
            seedIfEmpty('presetKits', snap, COLLECTIONS.presetKits, PRESET_KITS);
          },
          (err) => console.warn('Firestore preset-kits listener:', err)
        )
      );

      // Cold-start reachability check. Before any listener has been acked, every
      // snapshot legitimately reads fromCache = true, so this probe (which forces
      // a server read) is what distinguishes "still connecting" from "genuinely
      // cannot reach Firestore". Its result was previously thrown away.
      testFirestoreConnection()
        .then((reachable) => {
          // Don't overrule a listener that has already reported from the server.
          const alreadyProven = Object.values(fromCacheRef.current).some((c) => !c);
          if (!alreadyProven) setIsCloudOnline(reachable);
        })
        .catch(() => setIsCloudOnline(false));
    } catch (err) {
      console.warn('Firestore initialization notice:', err);
    }

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [authReady]);

  // Device-level connectivity events. Losing the interface means we are certainly
  // offline, so that is applied immediately. REGAINING it proves nothing — the
  // Wi-Fi may be a captive portal that cannot reach Google — so on 'online' we
  // verify with a real server read instead of just claiming to be back.
  useEffect(() => {
    const handleOnline = () => {
      testFirestoreConnection()
        .then((reachable) => setIsCloudOnline(reachable))
        .catch(() => setIsCloudOnline(false));
    };
    const handleOffline = () => setIsCloudOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist device-local working state only: the selected branch and the open
  // register tabs, so a reload on this terminal keeps the cashier's place. These
  // are intentionally NOT synced across branches — each terminal owns its tabs.
  useEffect(() => {
    localStorage.setItem('henz_active_branch_v3', activeBranch);
  }, [activeBranch]);

  useEffect(() => {
    localStorage.setItem('henz_held_carts_v3', JSON.stringify(heldCarts));
  }, [heldCarts]);

  // Unified Database Metadata
  const databaseMeta: UnifiedDatabaseMeta = {
    version: '3.0.0-PROD',
    databaseId: 'henz-central-db-iloilo-01',
    connectedBranches: [
      {
        branchId: 'main',
        name: BRANCH_MAIN,
        location:
          'Casa Conching Bldg., Jalandoni St., Iloilo City Proper — in front of University of San Agustin Gate 5',
        status: 'online',
        lastSyncTime: 'Live (Synchronized)',
      },
      {
        branchId: 'djabez',
        name: BRANCH_DJABEZ,
        location:
          "D'Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper — in front of the Jalandoni Flyover & JD Bakeshop",
        status: 'online',
        lastSyncTime: 'Live (Synchronized)',
      },
    ],
    lastBackupTime: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    totalProductsCount: products.length,
    totalTransactionsCount: transactions.length,
    totalPreOrdersCount: preOrders.length,
    totalTransfersCount: stockTransfers.length,
  };

  const exportDatabaseJSON = () => {
    const backupData = {
      meta: databaseMeta,
      exportTimestamp: new Date().toISOString(),
      branches: [BRANCH_MAIN, BRANCH_DJABEZ],
      products,
      transactions,
      preOrders,
      stockTransfers,
      presetKits,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HENZ_Unified_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importDatabaseJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.products && Array.isArray(parsed.products)) {
        // Write the imported records into Firestore; the onSnapshot listeners
        // then refresh local state. Fire-and-forget so a large import doesn't
        // block the UI (writes queue and sync automatically if offline).
        const writeAll = (colName: string, items: { id: string }[]) => {
          items.forEach((item) => {
            if (item && item.id) setDoc(doc(db, colName, item.id), item).catch(() => {});
          });
        };
        writeAll(COLLECTIONS.products, parsed.products);
        if (Array.isArray(parsed.transactions)) writeAll(COLLECTIONS.transactions, parsed.transactions);
        if (Array.isArray(parsed.preOrders)) writeAll(COLLECTIONS.preOrders, parsed.preOrders);
        if (Array.isArray(parsed.stockTransfers)) writeAll(COLLECTIONS.stockTransfers, parsed.stockTransfers);
        if (Array.isArray(parsed.presetKits)) writeAll(COLLECTIONS.presetKits, parsed.presetKits);
        soundEffects.playSuccessPayment();
        return true;
      }
    } catch (e) {
      console.error('Failed to import database JSON', e);
    }
    soundEffects.playErrorBeep();
    return false;
  };

  const resetDatabaseToDefaults = () => {
    // Restore the default catalog by writing the seed records to Firestore; the
    // listeners then repopulate local state on every synced terminal.
    const writeAll = (colName: string, items: { id: string }[]) => {
      items.forEach((item) => setDoc(doc(db, colName, item.id), item).catch(() => {}));
    };
    writeAll(COLLECTIONS.products, INITIAL_PRODUCTS);
    // Sales are intentionally left alone: this button restores the *catalogue*,
    // and re-seeding demo receipts would put fake revenue back into the report.
    writeAll(COLLECTIONS.preOrders, INITIAL_PREORDERS);
    writeAll(COLLECTIONS.stockTransfers, INITIAL_TRANSFERS);
    writeAll(COLLECTIONS.presetKits, PRESET_KITS);
    soundEffects.playQRScanChime();
  };

  // Ensure active cart index is in range
  const safeCartIndex = activeCartIndex >= 0 && activeCartIndex < heldCarts.length ? activeCartIndex : 0;
  const currentCart = heldCarts[safeCartIndex] || { id: 'default', name: 'Order #1', items: [], createdAt: '', customerType: 'Walk-in' };
  const currentCartItems = currentCart.items;

  // Add Cart / Tab (Multi-Customer Support so 1 customer packing doesn't block counter)
  const addNewCart = (name?: string, customerType: HeldCart['customerType'] = 'Student') => {
    const nextNum = heldCarts.length + 1;
    const newCart: HeldCart = {
      id: `cart-${Date.now()}`,
      name: name || `Order #${nextNum} (${customerType})`,
      items: [],
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerType,
    };
    setHeldCarts((prev) => [...prev, newCart]);
    setActiveCartIndex(heldCarts.length);
  };

  const closeCart = (cartId: string) => {
    if (heldCarts.length <= 1) {
      setHeldCarts([
        {
          id: `cart-${Date.now()}`,
          name: 'Order #1 (Walk-in)',
          items: [],
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          customerType: 'Walk-in',
        },
      ]);
      setActiveCartIndex(0);
      return;
    }
    const idx = heldCarts.findIndex((c) => c.id === cartId);
    const updated = heldCarts.filter((c) => c.id !== cartId);
    setHeldCarts(updated);
    setActiveCartIndex(Math.max(0, idx - 1));
  };

  const updateCartName = (cartId: string, name: string, customerType?: HeldCart['customerType']) => {
    setHeldCarts((prev) =>
      prev.map((c) =>
        c.id === cartId
          ? {
              ...c,
              name,
              customerType: customerType || c.customerType,
            }
          : c
      )
    );
  };

  // Add Item to Current Active Cart
  const addToCart = (product: Product, quantity = 1) => {
    soundEffects.playScanBeep();
    setHeldCarts((prev) => {
      const active = prev[safeCartIndex];
      if (!active) return prev;

      const existingIndex = active.items.findIndex((item) => item.product.id === product.id);
      let updatedItems: CartItem[];

      if (existingIndex > -1) {
        updatedItems = active.items.map((item, idx) => {
          if (idx === existingIndex) {
            const newQty = item.quantity + quantity;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice,
            };
          }
          return item;
        });
      } else {
        const newItem: CartItem = {
          product,
          quantity,
          unitPrice: product.price,
          subtotal: quantity * product.price,
        };
        updatedItems = [newItem, ...active.items];
      }

      return prev.map((c, idx) => (idx === safeCartIndex ? { ...c, items: updatedItems } : c));
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setHeldCarts((prev) => {
      const active = prev[safeCartIndex];
      if (!active) return prev;

      const updatedItems = active.items.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
            subtotal: quantity * item.unitPrice,
          };
        }
        return item;
      });

      return prev.map((c, idx) => (idx === safeCartIndex ? { ...c, items: updatedItems } : c));
    });
  };

  const removeFromCart = (productId: string) => {
    setHeldCarts((prev) => {
      const active = prev[safeCartIndex];
      if (!active) return prev;
      return prev.map((c, idx) =>
        idx === safeCartIndex
          ? { ...c, items: c.items.filter((item) => item.product.id !== productId) }
          : c
      );
    });
  };

  const clearCurrentCart = () => {
    setHeldCarts((prev) =>
      prev.map((c, idx) => (idx === safeCartIndex ? { ...c, items: [] } : c))
    );
  };

  // Load an Online Pre-Order directly into Cart (1-Second QR Load)
  const loadPreOrderIntoCart = (preOrderId: string): boolean => {
    const order = preOrders.find((po) => po.id === preOrderId || po.orderNumber === preOrderId || po.qrCodeValue === preOrderId);
    if (!order) {
      soundEffects.playErrorBeep();
      return false;
    }

    soundEffects.playQRScanChime();

    const cartItems: CartItem[] = [];
    order.items.forEach((item) => {
      const fullProd = products.find((p) => p.id === item.productId);
      if (fullProd) {
        cartItems.push({
          product: fullProd,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        });
      }
    });

    const newCart: HeldCart = {
      id: `cart-po-${order.orderNumber}`,
      name: `QR: ${order.customerName.split(' ')[0]} (${order.orderNumber})`,
      items: cartItems,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: order.customerName,
      customerType: order.schoolOrClinic.toLowerCase().includes('clinic') ? 'Clinic' : 'Student',
      sourcePreOrderId: order.id,
    };

    setHeldCarts((prev) => [...prev, newCart]);
    setActiveCartIndex(heldCarts.length);
    return true;
  };

  // Load a Preset Kit (e.g. BSN 1st Year Kit with 24 items)
  const loadPresetKitIntoCart = (kitId: string) => {
    const kit = presetKits.find((k) => k.id === kitId);
    if (!kit) return;

    soundEffects.playQRScanChime();
    kit.items.forEach((ki) => {
      const prod = products.find((p) => p.id === ki.productId);
      if (prod) {
        addToCart(prod, ki.quantity);
      }
    });
  };

  // Complete a Sale & Deduct Inventory in the Active Branch (Main or D'Jabez) in the 1 Unified DB
  const completeSale = (saleData: {
    customerName: string;
    customerType: HeldCart['customerType'];
    paymentMethod: SaleTransaction['paymentMethod'];
    amountTendered?: number;
    referenceNumber?: string;
    bankName?: string;
    discountAmount?: number;
    cashierName?: string;
  }): SaleTransaction | null => {
    const active = heldCarts[safeCartIndex];
    if (!active || active.items.length === 0) {
      soundEffects.playErrorBeep();
      return null;
    }

    const subtotal = active.items.reduce((acc, item) => acc + item.subtotal, 0);
    const discount = saleData.discountAmount || 0;
    const grandTotal = Math.max(0, subtotal - discount);
    const taxAmount = Math.round(grandTotal * 0.12);
    const totalItemCount = active.items.reduce((acc, item) => acc + item.quantity, 0);

    const now = new Date();
    // Receipt number: date-stamped plus a 5-character random code, e.g.
    // HENZ-RCP-20260822-K7M2D. NOT `transactions.length + 1` — that counter is
    // computed from this terminal's cached list, so two registers (or one
    // register that is offline and behind) mint the SAME receipt number for two
    // different sales. A duplicated receipt number is a records problem the store
    // cannot fix after the fact, since the printed copy is already with the
    // customer. 5 characters over a 31-letter alphabet gives ~28.6M codes; the
    // loop below additionally rejects any code this device has already seen.
    const receiptNum = uniqueSerial(
      (code) => `HENZ-RCP-${dateStamp(now)}-${code}`,
      new Set(transactions.map((t) => t.receiptNumber)),
      5
    );

    const newTransaction: SaleTransaction = {
      // Random suffix on top of the timestamp. Without it, two terminals
      // completing a sale in the same millisecond produce the same document ID,
      // and because `transactions` is `allow update: if false` in
      // firestore.rules the second write is REJECTED rather than merged — which
      // would silently discard that sale AND its stock deductions.
      id: newDocId('tx', now),
      receiptNumber: receiptNum,
      timestamp: now.toLocaleString(),
      branch: activeBranch,
      cashierName: saleData.cashierName || 'Cashier 1',
      customerName: saleData.customerName || active.customerName || 'Customer Walk-in',
      customerType: saleData.customerType || active.customerType || 'Student',
      items: [...active.items],
      totalItemCount,
      subtotal,
      discountAmount: discount,
      taxAmount,
      grandTotal,
      paymentMethod: saleData.paymentMethod,
      amountTendered: saleData.amountTendered,
      changeDue: saleData.amountTendered ? Math.max(0, saleData.amountTendered - grandTotal) : 0,
      referenceNumber: saleData.referenceNumber,
      bankName: saleData.bankName,
      preOrderRefCode: active.sourcePreOrderId,
      status: 'Completed',
    };

    // Deduct stock in the active branch. increment() is atomic and race-safe
    // across terminals (and offline-compatible), so two registers selling the
    // same item never clobber each other's deduction.
    const stockField = branchStockField(activeBranch);

    // Commit the whole sale atomically to Firestore: the transaction record,
    // every per-item stock deduction, and (if this cart came from a pre-order)
    // the "Claimed" flag all land together or not at all. The onSnapshot
    // listeners then update products/transactions/preOrders locally.
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.transactions, newTransaction.id), newTransaction);
    active.items.forEach((item) => {
      batch.update(doc(db, COLLECTIONS.products, item.product.id), {
        [stockField]: increment(-item.quantity),
      });
    });
    if (active.sourcePreOrderId) {
      batch.update(doc(db, COLLECTIONS.preOrders, active.sourcePreOrderId), {
        orderStatus: 'Claimed',
      });
    }
    // A genuinely offline commit does NOT reject — Firestore appends it to a
    // durable on-device queue and replays it on reconnect, so the promise just
    // stays unsettled. Anything that DOES reject here is a real, permanent
    // failure (expired session, security rule, invalid data) that has taken the
    // sale AND its stock deductions with it. Report it as such; the old
    // "queued offline, will sync" message described a lost sale as a safe one.
    batch.commit().catch((err) =>
      reportSyncFailure(
        'Sale',
        `Receipt ${receiptNum} — ₱${grandTotal.toLocaleString()} (${totalItemCount} item${
          totalItemCount === 1 ? '' : 's'
        })`,
        err
      )
    );

    setRecentCompletedSale(newTransaction);
    soundEffects.playSuccessPayment();

    // Close the device-local cart tab (heldCarts is per-terminal working state)
    closeCart(active.id);

    return newTransaction;
  };

  // Add Customer Pre-Order to the Centralized Database
  const addCustomerPreOrder = (orderInput: {
    customerName: string;
    schoolOrClinic: string;
    contactNumber: string;
    email?: string;
    pickupBranch: BranchName;
    targetPickupDate: string;
    items: { productId: string; quantity: number }[];
    paymentStatus: CustomerPreOrder['paymentStatus'];
    paymentMethod: CustomerPreOrder['paymentMethod'];
    paymentRefNumber?: string;
    notes?: string;
  }): CustomerPreOrder => {
    // Human-facing order number: date-stamped plus a short random code (see
    // src/utils/ids.ts for why random and not a running count). Generated fully
    // client-side so it works OFFLINE, and safe to read aloud or type into the
    // order tracker.
    const now = new Date();
    const nextOrderNum = uniqueSerial(
      (code) => `HNZ-${dateStamp(now)}-${code}`,
      new Set(preOrders.map((o) => o.orderNumber))
    );
    const orderItemsMapped = orderInput.items.map((i) => {
      const prod = products.find((p) => p.id === i.productId);
      return {
        productId: i.productId,
        productName: prod ? prod.name : 'Medical Item',
        barcode: prod ? prod.barcode : '000000000000',
        quantity: i.quantity,
        unitPrice: prod ? prod.price : 0,
        unit: prod ? prod.unit : 'pcs',
      };
    });

    const totalAmount = orderItemsMapped.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const totalItems = orderItemsMapped.reduce((acc, item) => acc + item.quantity, 0);

    const newOrder: CustomerPreOrder = {
      // Random suffix on top of the timestamp so two orders created in the same
      // millisecond on different devices get distinct document IDs — otherwise
      // the second setDoc would silently overwrite (lose) the first.
      id: newDocId('po', now),
      orderNumber: nextOrderNum,
      qrCodeValue: `HENZ-ORDER-${nextOrderNum}`,
      customerName: orderInput.customerName,
      schoolOrClinic: orderInput.schoolOrClinic,
      contactNumber: orderInput.contactNumber,
      email: orderInput.email,
      pickupBranch: orderInput.pickupBranch,
      targetPickupDate: orderInput.targetPickupDate,
      items: orderItemsMapped,
      totalItems,
      totalAmount,
      paymentStatus: orderInput.paymentStatus,
      paymentMethod: orderInput.paymentMethod,
      paymentRefNumber: orderInput.paymentRefNumber,
      orderStatus: 'Pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      notes: orderInput.notes,
    };

    soundEffects.playQRScanChime();

    // Write to Firestore; the onSnapshot listener adds it to local state (and
    // chimes on the staff terminal). A genuinely offline write does NOT reject —
    // it queues and syncs later — so a rejection/throw here is a real failure
    // (auth, rules, or invalid data) that must be surfaced, not swallowed.
    try {
      setDoc(doc(db, COLLECTIONS.preOrders, newOrder.id), newOrder).catch((err) => {
        reportSyncFailure('Pre-order', `Order ${newOrder.orderNumber} — ${newOrder.customerName}`, err);
      });
    } catch (err) {
      reportSyncFailure(
        'Pre-order',
        `Order ${newOrder.orderNumber} — ${newOrder.customerName} (invalid data)`,
        err
      );
    }

    return newOrder;
  };

  const updatePreOrderStatus = (orderId: string, status: PreOrderStatus, packedItemIds?: string[]) => {
    // Write to Firestore; the onSnapshot listener reflects it into local state.
    const orderNumber = preOrders.find((o) => o.id === orderId)?.orderNumber || orderId;
    try {
      updateDoc(doc(db, COLLECTIONS.preOrders, orderId), {
        orderStatus: status,
        ...(packedItemIds ? { packedItemIds } : {}),
      }).catch((err) => {
        reportSyncFailure('Order status', `Order ${orderNumber} → ${status}`, err);
      });
    } catch (err) {
      reportSyncFailure('Order status', `Order ${orderNumber} → ${status} (invalid data)`, err);
    }
  };

  // Stock Transfer between the Main Branch (Casa Conching) and the D'Jabez
  // Branch (Gen. Luna St.) with a central ledger entry.
  const transferStock = (
    productId: string,
    from: BranchKey,
    to: BranchKey,
    quantity: number,
    staffName = 'Staff Logistics',
    notes = 'Inter-branch rebalancing'
  ) => {
    if (from === to || quantity <= 0) return;
    const targetProd = products.find((p) => p.id === productId);
    if (!targetProd) return;

    const fromBranchName = branchNameForKey(from);
    const toBranchName = branchNameForKey(to);

    // Record in central transfer audit log. Like receipts, the transfer number is
    // date-stamped + random rather than `stockTransfers.length + 1`, and the
    // document ID carries a random suffix — `stock_transfers` is also
    // `allow update: if false`, so a same-millisecond ID clash between the two
    // branches would reject the whole batch and lose the stock movement.
    const now = new Date();
    const transferRecord: StockTransferRecord = {
      id: newDocId('tr', now),
      transferNumber: uniqueSerial(
        (code) => `HENZ-TR-${dateStamp(now)}-${code}`,
        new Set(stockTransfers.map((t) => t.transferNumber))
      ),
      timestamp: now.toLocaleString(),
      productId: targetProd.id,
      productName: targetProd.name,
      sku: targetProd.sku,
      fromBranch: fromBranchName,
      toBranch: toBranchName,
      quantity,
      transferredBy: staffName,
      notes,
    };

    // Move the quantity between branches and log the transfer atomically. The
    // Inventory UI bounds `quantity` to available stock, so increment() is safe.
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.products, productId), {
      [branchStockField(BRANCH_MAIN)]: increment(from === 'main' ? -quantity : quantity),
      [branchStockField(BRANCH_DJABEZ)]: increment(from === 'djabez' ? -quantity : quantity),
    });
    batch.set(doc(db, COLLECTIONS.stockTransfers, transferRecord.id), transferRecord);
    batch.commit().catch((err) =>
      reportSyncFailure(
        'Stock transfer',
        `${transferRecord.transferNumber} — ${quantity}× ${targetProd.name}`,
        err
      )
    );

    soundEffects.playQRScanChime();
  };

  // Restock Shipment into specified Branch
  const restockProduct = (
    productId: string,
    quantity: number,
    target: BranchKey,
    batchNumber?: string,
    expiryDate?: string
  ) => {
    const prodName = products.find((p) => p.id === productId)?.name || productId;
    try {
      updateDoc(doc(db, COLLECTIONS.products, productId), {
        [branchStockField(branchNameForKey(target))]: increment(quantity),
        ...(batchNumber ? { batchNumber } : {}),
        ...(expiryDate ? { expiryDate } : {}),
      }).catch((err) => reportSyncFailure('Inventory', `Restock ${quantity}× ${prodName}`, err));
    } catch (err) {
      reportSyncFailure('Inventory', `Restock ${quantity}× ${prodName} (invalid data)`, err);
    }
    soundEffects.playQRScanChime();
  };

  // CRUD: Update Product
  const updateProduct = (product: Product) => {
    setDoc(doc(db, COLLECTIONS.products, product.id), product).catch((err) =>
      reportSyncFailure('Inventory', `Update ${product.name}`, err)
    );
  };

  // CRUD: Add Product
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: newDocId('prod'),
    };
    setDoc(doc(db, COLLECTIONS.products, newProd.id), newProd).catch((err) =>
      reportSyncFailure('Inventory', `New product ${newProd.name}`, err)
    );
  };

  // CRUD: Delete Product
  const deleteProduct = (productId: string) => {
    const prodName = products.find((p) => p.id === productId)?.name || productId;
    deleteDoc(doc(db, COLLECTIONS.products, productId)).catch((err) =>
      reportSyncFailure('Inventory', `Delete ${prodName}`, err)
    );
  };

  // CRUD: Add Preset Starter Kit
  const addPresetKit = (kitData: Omit<PresetKit, 'id'>): PresetKit => {
    const newKit: PresetKit = {
      ...kitData,
      id: `kit-custom-${Date.now()}-${randomCode(4)}`,
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    };
    setDoc(doc(db, COLLECTIONS.presetKits, newKit.id), newKit).catch((err) =>
      reportSyncFailure('Starter kit', `New kit ${newKit.name}`, err)
    );
    soundEffects.playQRScanChime();
    return newKit;
  };

  // CRUD: Update Preset Starter Kit
  const updatePresetKit = (updatedKit: PresetKit) => {
    setDoc(doc(db, COLLECTIONS.presetKits, updatedKit.id), updatedKit).catch((err) =>
      reportSyncFailure('Starter kit', `Update ${updatedKit.name}`, err)
    );
    soundEffects.playQRScanChime();
  };

  // CRUD: Delete Preset Starter Kit
  const deletePresetKit = (kitId: string) => {
    const kitName = presetKits.find((k) => k.id === kitId)?.name || kitId;
    deleteDoc(doc(db, COLLECTIONS.presetKits, kitId)).catch((err) =>
      reportSyncFailure('Starter kit', `Delete ${kitName}`, err)
    );
    soundEffects.playScanBeep();
  };

  // Reset Preset Starter Kits to default clinical catalog
  const resetPresetKitsToDefaults = () => {
    PRESET_KITS.forEach((kit) => {
      setDoc(doc(db, COLLECTIONS.presetKits, kit.id), kit).catch((err) =>
        reportSyncFailure('Starter kit', `Restore default kit ${kit.name}`, err)
      );
    });
    soundEffects.playQRScanChime();
  };

  return (
    <POSContext.Provider
      value={{
        userRole,
        setUserRole,
        isAdminAuthenticated,
        isAdminLoginModalOpen,
        setIsAdminLoginModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isDatabaseModalOpen,
        setIsDatabaseModalOpen,
        loginAdmin,
        logoutAdmin,
        products,
        presetKits,
        addPresetKit,
        updatePresetKit,
        deletePresetKit,
        resetPresetKitsToDefaults,
        activeBranch,
        setActiveBranch,
        heldCarts,
        activeCartIndex: safeCartIndex,
        setActiveCartIndex,
        addNewCart,
        closeCart,
        updateCartName,
        currentCartItems,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCurrentCart,
        loadPreOrderIntoCart,
        loadPresetKitIntoCart,
        completeSale,
        transactions,
        preOrders,
        stockTransfers,
        addCustomerPreOrder,
        updatePreOrderStatus,
        transferStock,
        restockProduct,
        updateProduct,
        addProduct,
        deleteProduct,
        isCloudOnline,
        isSyncing,
        pendingWriteCount,
        syncFailures,
        dismissSyncFailure,
        databaseMeta,
        exportDatabaseJSON,
        importDatabaseJSON,
        resetDatabaseToDefaults,
        isJulyPeakSeasonMode,
        setIsJulyPeakSeasonMode,
        activeView,
        setActiveView,
        recentCompletedSale,
        setRecentCompletedSale,
        activePreOrderModal,
        setActivePreOrderModal,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
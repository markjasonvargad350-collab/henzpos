import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Product,
  CartItem,
  HeldCart,
  SaleTransaction,
  CustomerPreOrder,
  PreOrderStatus,
  BranchName,
  StockTransferRecord,
  UnifiedDatabaseMeta,
  PresetKit,
} from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_PREORDERS } from '../data/initialPreOrders';
import { INITIAL_TRANSACTIONS } from '../data/initialTransactions';
import { INITIAL_TRANSFERS } from '../data/initialTransfers';
import { PRESET_KITS } from '../data/presetKits';
import { soundEffects } from '../utils/audio';
import { db, auth, STAFF_EMAIL, testFirestoreConnection } from '../lib/firebase';
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

export const BRANCH_MAIN: BranchName = 'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper';
export const BRANCH_USA: BranchName = 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)';

// Firestore collection names — single source of truth (Firestore names are case-sensitive).
// These must exactly match the collection names in firestore.rules.
export const COLLECTIONS = {
  products: 'products',
  transactions: 'transactions',
  preOrders: 'preOrders',
  stockTransfers: 'stock_transfers',
  presetKits: 'preset_kits',
} as const;

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
  loginAdmin: (password: string) => Promise<boolean>;
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
    from: 'main' | 'usa',
    to: 'main' | 'usa',
    quantity: number,
    staffName?: string,
    notes?: string
  ) => void;
  restockProduct: (
    productId: string,
    quantity: number,
    target: 'main' | 'usa',
    batchNumber?: string,
    expiryDate?: string
  ) => void;
  updateProduct: (product: Product) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  deleteProduct: (productId: string) => void;
  isCloudOnline: boolean;
  isSyncing: boolean;
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
  const loginAdmin = async (password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, STAFF_EMAIL, password.trim());
      return true;
    } catch (err) {
      console.warn('Staff login failed:', err);
      return false;
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

  const [activeBranch, setActiveBranch] = useState<BranchName>(() => {
    const saved = localStorage.getItem('henz_active_branch_v3');
    if (saved === BRANCH_USA) return BRANCH_USA;
    return BRANCH_MAIN;
  });

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
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const pendingWritesRef = useRef<Record<string, boolean>>({});

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

    // Aggregate pending-write status across collections for the header indicator.
    const markPending = (key: string, snap: { metadata: { hasPendingWrites: boolean } }) => {
      pendingWritesRef.current[key] = snap.metadata.hasPendingWrites;
      setIsSyncing(Object.values(pendingWritesRef.current).some(Boolean));
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
            markPending('products', snap);
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
            snap.forEach((d) => list.push(d.data() as SaleTransaction));
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setTransactions(list);
            markPending('transactions', snap);
            seedIfEmpty('transactions', snap, COLLECTIONS.transactions, INITIAL_TRANSACTIONS);
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
              if (data && data.orderNumber) list.push(data);
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPreOrders(list);
            markPending('preOrders', snap);
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
            snap.forEach((d) => list.push(d.data() as StockTransferRecord));
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setStockTransfers(list);
            markPending('stockTransfers', snap);
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
            markPending('presetKits', snap);
            seedIfEmpty('presetKits', snap, COLLECTIONS.presetKits, PRESET_KITS);
          },
          (err) => console.warn('Firestore preset-kits listener:', err)
        )
      );

      // Probe initial connectivity (best-effort; the online/offline effect owns the flag)
      testFirestoreConnection().catch(() => {});
    } catch (err) {
      console.warn('Firestore initialization notice:', err);
    }

    return () => {
      subscriptions.forEach((unsub) => unsub());
    };
  }, [authReady]);

  // Track device connectivity so the header can show online vs. offline (queued) sync.
  useEffect(() => {
    const handleOnline = () => setIsCloudOnline(true);
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
        location: 'Casa Conching Bldg., Jalandoni St, Iloilo City Proper',
        status: 'online',
        lastSyncTime: 'Live (Synchronized)',
      },
      {
        branchId: 'usa',
        name: BRANCH_USA,
        location: 'In front of University of San Agustin Gate 5 (USA Gym)',
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
      branches: [BRANCH_MAIN, BRANCH_USA],
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
    writeAll(COLLECTIONS.transactions, INITIAL_TRANSACTIONS);
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

  // Complete a Sale & Deduct Inventory in the Active Branch (Main or USA) in the 1 Unified DB
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
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const receiptNum = `HENZ-RCP-${dateCode}-${String(transactions.length + 1).padStart(3, '0')}`;

    const newTransaction: SaleTransaction = {
      id: `tx-${Date.now()}`,
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
    const isUsa = activeBranch.includes('USA Branch') || activeBranch.includes('San Agustin');
    const stockField = isUsa ? 'stockUsaBranch' : 'stockMainBranch';

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
    batch.commit().catch((err) => console.warn('Sale queued offline, will sync:', err));

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
    // Human-facing order number: date-stamped plus a short, unambiguous random
    // code. Generated fully client-side so it works OFFLINE, and RANDOM rather
    // than a running count (`preOrders.length + …`) — otherwise two customers
    // ordering at the same moment on different devices compute the same count
    // and collide on the same number. The alphabet omits easily-confused
    // characters (0/O, 1/I/L) so the code is safe to read aloud and type into
    // the tracker. The loop regenerates on the rare clash with a known order.
    const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const randomCode = (len: number) =>
      Array.from({ length: len }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const existingNumbers = new Set(preOrders.map((o) => o.orderNumber));
    let nextOrderNum = `HNZ-${datePart}-${randomCode(4)}`;
    for (let i = 0; i < 10 && existingNumbers.has(nextOrderNum); i++) {
      nextOrderNum = `HNZ-${datePart}-${randomCode(4)}`;
    }
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
      id: `po-${Date.now()}-${randomCode(4)}`,
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
        console.error('Pre-order write REJECTED (check auth / rules / data):', err);
      });
    } catch (err) {
      console.error('Pre-order write threw synchronously (invalid data):', err);
    }

    return newOrder;
  };

  const updatePreOrderStatus = (orderId: string, status: PreOrderStatus, packedItemIds?: string[]) => {
    // Write to Firestore; the onSnapshot listener reflects it into local state.
    try {
      updateDoc(doc(db, COLLECTIONS.preOrders, orderId), {
        orderStatus: status,
        ...(packedItemIds ? { packedItemIds } : {}),
      }).catch((err) => {
        console.warn('Status update queued offline, will sync:', err);
      });
    } catch {
      // offline fallback
    }
  };

  // Stock Transfer between Main Branch (Casa Conching) & USA Branch (Gate 5) with Central Ledger
  const transferStock = (
    productId: string,
    from: 'main' | 'usa',
    to: 'main' | 'usa',
    quantity: number,
    staffName = 'Staff Logistics',
    notes = 'Inter-branch rebalancing'
  ) => {
    if (from === to || quantity <= 0) return;
    const targetProd = products.find((p) => p.id === productId);
    if (!targetProd) return;

    const fromBranchName = from === 'main' ? BRANCH_MAIN : BRANCH_USA;
    const toBranchName = to === 'main' ? BRANCH_MAIN : BRANCH_USA;

    // Record in central transfer audit log
    const transferRecord: StockTransferRecord = {
      id: `tr-${Date.now()}`,
      transferNumber: `HENZ-TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(stockTransfers.length + 1).padStart(2, '0')}`,
      timestamp: new Date().toLocaleString(),
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
      stockMainBranch: increment(from === 'main' ? -quantity : quantity),
      stockUsaBranch: increment(from === 'usa' ? -quantity : quantity),
    });
    batch.set(doc(db, COLLECTIONS.stockTransfers, transferRecord.id), transferRecord);
    batch.commit().catch((err) => console.warn('Transfer queued offline, will sync:', err));

    soundEffects.playQRScanChime();
  };

  // Restock Shipment into specified Branch
  const restockProduct = (
    productId: string,
    quantity: number,
    target: 'main' | 'usa',
    batchNumber?: string,
    expiryDate?: string
  ) => {
    try {
      updateDoc(doc(db, COLLECTIONS.products, productId), {
        [target === 'main' ? 'stockMainBranch' : 'stockUsaBranch']: increment(quantity),
        ...(batchNumber ? { batchNumber } : {}),
        ...(expiryDate ? { expiryDate } : {}),
      }).catch((err) => console.warn('Restock queued offline, will sync:', err));
    } catch {
      // offline fallback
    }
    soundEffects.playQRScanChime();
  };

  // CRUD: Update Product
  const updateProduct = (product: Product) => {
    setDoc(doc(db, COLLECTIONS.products, product.id), product).catch((err) =>
      console.warn('Product update queued offline, will sync:', err)
    );
  };

  // CRUD: Add Product
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    setDoc(doc(db, COLLECTIONS.products, newProd.id), newProd).catch((err) =>
      console.warn('New product queued offline, will sync:', err)
    );
  };

  // CRUD: Delete Product
  const deleteProduct = (productId: string) => {
    deleteDoc(doc(db, COLLECTIONS.products, productId)).catch((err) =>
      console.warn('Product delete queued offline, will sync:', err)
    );
  };

  // CRUD: Add Preset Starter Kit
  const addPresetKit = (kitData: Omit<PresetKit, 'id'>): PresetKit => {
    const newKit: PresetKit = {
      ...kitData,
      id: `kit-custom-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    };
    setDoc(doc(db, COLLECTIONS.presetKits, newKit.id), newKit).catch((err) =>
      console.warn('Preset kit queued offline, will sync:', err)
    );
    soundEffects.playQRScanChime();
    return newKit;
  };

  // CRUD: Update Preset Starter Kit
  const updatePresetKit = (updatedKit: PresetKit) => {
    setDoc(doc(db, COLLECTIONS.presetKits, updatedKit.id), updatedKit).catch((err) =>
      console.warn('Preset kit update queued offline, will sync:', err)
    );
    soundEffects.playQRScanChime();
  };

  // CRUD: Delete Preset Starter Kit
  const deletePresetKit = (kitId: string) => {
    deleteDoc(doc(db, COLLECTIONS.presetKits, kitId)).catch((err) =>
      console.warn('Preset kit delete queued offline, will sync:', err)
    );
    soundEffects.playScanBeep();
  };

  // Reset Preset Starter Kits to default clinical catalog
  const resetPresetKitsToDefaults = () => {
    PRESET_KITS.forEach((kit) => {
      setDoc(doc(db, COLLECTIONS.presetKits, kit.id), kit).catch(() => {});
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
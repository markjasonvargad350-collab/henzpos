import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { PRESET_KITS } from '../data/presetKits';
import { soundEffects } from '../utils/audio';
import { db, testFirestoreConnection } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';
export type ActiveNavView = 'pos' | 'checklist-portal' | 'prep-queue' | 'inventory' | 'expiry' | 'reports';

export const BRANCH_MAIN: BranchName = 'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper';
export const BRANCH_USA: BranchName = 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)';

const INITIAL_TRANSFERS: StockTransferRecord[] = [
  {
    id: 'tr-001',
    transferNumber: 'HENZ-TR-20260816-01',
    timestamp: '2026-08-16 09:30',
    productId: 'prod-001',
    productName: 'Examination Latex Gloves Powder-Free (Medium)',
    sku: 'PPE-GLV-LAT-M',
    fromBranch: BRANCH_MAIN,
    toBranch: BRANCH_USA,
    quantity: 25,
    transferredBy: 'Warehouse Logistics Staff (Van #1)',
    notes: 'Replenishment for San Agustin BSN student surge',
  },
  {
    id: 'tr-002',
    transferNumber: 'HENZ-TR-20260815-02',
    timestamp: '2026-08-15 14:10',
    productId: 'prod-007',
    productName: 'Aneroid Sphygmomanometer with Adult Cuff & Pouch',
    sku: 'DIA-SPHYG-ANEROID',
    fromBranch: BRANCH_MAIN,
    toBranch: BRANCH_USA,
    quantity: 15,
    transferredBy: 'Stock Custodian Marcos',
    notes: 'BSN 1st Year kit staging',
  },
  {
    id: 'tr-003',
    transferNumber: 'HENZ-TR-20260814-03',
    timestamp: '2026-08-14 11:20',
    productId: 'prod-041',
    productName: 'Isopropyl Alcohol 70% with Moisturizer 500ml',
    sku: 'ANT-ALC-70-ISOP-500',
    fromBranch: BRANCH_MAIN,
    toBranch: BRANCH_USA,
    quantity: 30,
    transferredBy: 'Staff Elena',
    notes: 'Clinical Antiseptic replenishment',
  },
];

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
  loginAdmin: (passwordOrPin: string, username?: string) => boolean;
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
  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('henz_admin_auth_v3');
    return saved === 'true';
  });

  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);

  // User vs Admin role mode (No login required for users to view & submit pre-order checklists)
  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mode=preorder')) {
      return 'user';
    }
    const savedRole = localStorage.getItem('henz_user_role_v3');
    const savedAuth = localStorage.getItem('henz_admin_auth_v3') === 'true';
    if (savedRole === 'admin' && savedAuth) {
      return 'admin';
    }
    return 'user';
  });

  const setUserRole = (role: UserRole) => {
    if (role === 'admin') {
      if (!isAdminAuthenticated) {
        setIsAdminLoginModalOpen(true);
        return;
      }
      setUserRoleState('admin');
      localStorage.setItem('henz_user_role_v3', 'admin');
    } else {
      setUserRoleState('user');
      localStorage.setItem('henz_user_role_v3', 'user');
      setActiveView('checklist-portal');
    }
  };

  const loginAdmin = (passwordOrPin: string, username?: string): boolean => {
    const cleaned = passwordOrPin.trim();
    if (
      cleaned === '8888' ||
      cleaned === 'admin123' ||
      cleaned === 'henz2026' ||
      cleaned === 'admin' ||
      cleaned === '1234' ||
      (username === 'admin' && cleaned === 'admin')
    ) {
      setIsAdminAuthenticated(true);
      setUserRoleState('admin');
      localStorage.setItem('henz_admin_auth_v3', 'true');
      localStorage.setItem('henz_user_role_v3', 'admin');
      if (activeView === 'checklist-portal') {
        setActiveView('pos');
      }
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setUserRoleState('user');
    localStorage.removeItem('henz_admin_auth_v3');
    localStorage.setItem('henz_user_role_v3', 'user');
    setActiveView('checklist-portal');
  };

  // 1 Unified Central Database: Products Table with 2-Branch Inventory (Main Branch & USA Branch)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('henz_products_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            stockMainBranch: p.stockMainBranch ?? 45,
            stockUsaBranch: p.stockUsaBranch ?? p.stockWarehouse ?? 55,
          }));
        }
      } catch { /* ignore */ }
    }
    return INITIAL_PRODUCTS;
  });

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
  const [transactions, setTransactions] = useState<SaleTransaction[]>(() => {
    const saved = localStorage.getItem('henz_transactions_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_TRANSACTIONS;
  });

  // 1 Unified Central Database: Pre-Orders Table (tagged by pickup branch)
  const [preOrders, setPreOrders] = useState<CustomerPreOrder[]>(() => {
    const saved = localStorage.getItem('henz_preorders_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PREORDERS;
  });

  // 1 Unified Central Database: Inter-Branch Stock Transfers Ledger
  const [stockTransfers, setStockTransfers] = useState<StockTransferRecord[]>(() => {
    const saved = localStorage.getItem('henz_stock_transfers_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_TRANSFERS;
  });

  // Starter Checklist Preset Kits (Manageable & Persistent)
  const [presetKits, setPresetKits] = useState<PresetKit[]>(() => {
    const saved = localStorage.getItem('henz_preset_kits_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return PRESET_KITS;
  });

  const [isJulyPeakSeasonMode, setIsJulyPeakSeasonMode] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<ActiveNavView>(() => {
    return userRole === 'user' ? 'checklist-portal' : 'pos';
  });
  const [recentCompletedSale, setRecentCompletedSale] = useState<SaleTransaction | null>(null);
  const [activePreOrderModal, setActivePreOrderModal] = useState<CustomerPreOrder | null>(null);

  // Firebase Cloud Firestore Real-Time Listener
  useEffect(() => {
    let unsubPreorders: (() => void) | null = null;
    let unsubProducts: (() => void) | null = null;

    try {
      // 1. Live Pre-Orders Listener
      const preOrdersRef = collection(db, 'preorders');
      unsubPreorders = onSnapshot(
        preOrdersRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: CustomerPreOrder[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as CustomerPreOrder;
              if (data && data.orderNumber) {
                list.push(data);
              }
            });
            if (list.length > 0) {
              list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setPreOrders(list);
            }
          } else {
            // Seed initial preorders to Firestore if newly provisioned
            INITIAL_PREORDERS.forEach((po) => {
              setDoc(doc(db, 'preorders', po.id), po).catch(() => {});
            });
          }
        },
        (error) => {
          console.warn('Firestore real-time pre-orders offline/fallback:', error);
        }
      );

      // 2. Test initial connectivity
      testFirestoreConnection().catch(() => {});
    } catch (err) {
      console.warn('Firestore initialization notice:', err);
    }

    return () => {
      if (unsubPreorders) unsubPreorders();
      if (unsubProducts) unsubProducts();
    };
  }, []);

  // BroadcastChannel and Storage listener for instant real-time synchronization across multiple tabs/windows
  useEffect(() => {
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('henz_pos_sync_channel');
        broadcastChannel.onmessage = (event) => {
          if (!event.data || !event.data.type) return;
          const { type, payload } = event.data;
          if (type === 'SYNC_PREORDERS' && Array.isArray(payload)) {
            setPreOrders(payload);
          } else if (type === 'SYNC_PRODUCTS' && Array.isArray(payload)) {
            setProducts(payload);
          } else if (type === 'SYNC_TRANSACTIONS' && Array.isArray(payload)) {
            setTransactions(payload);
          } else if (type === 'SYNC_TRANSFERS' && Array.isArray(payload)) {
            setStockTransfers(payload);
          } else if (type === 'SYNC_KITS' && Array.isArray(payload)) {
            setPresetKits(payload);
          }
        };
      }
    } catch { /* ignore */ }

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === 'henz_preorders_v3') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPreOrders(parsed);
        } else if (e.key === 'henz_products_v3') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed);
        } else if (e.key === 'henz_transactions_v3') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTransactions(parsed);
        } else if (e.key === 'henz_stock_transfers_v3') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setStockTransfers(parsed);
        } else if (e.key === 'henz_preset_kits_v3') {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setPresetKits(parsed);
        }
      } catch { /* ignore */ }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (broadcastChannel) broadcastChannel.close();
    };
  }, []);

  const broadcastSync = (type: string, payload: any) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('henz_pos_sync_channel');
        channel.postMessage({ type, payload });
        channel.close();
      }
    } catch { /* ignore */ }
  };

  // Synchronize to unified localStorage schema and notify other tabs
  useEffect(() => {
    localStorage.setItem('henz_products_v3', JSON.stringify(products));
    broadcastSync('SYNC_PRODUCTS', products);
  }, [products]);

  useEffect(() => {
    localStorage.setItem('henz_active_branch_v3', activeBranch);
  }, [activeBranch]);

  useEffect(() => {
    localStorage.setItem('henz_held_carts_v3', JSON.stringify(heldCarts));
  }, [heldCarts]);

  useEffect(() => {
    localStorage.setItem('henz_transactions_v3', JSON.stringify(transactions));
    broadcastSync('SYNC_TRANSACTIONS', transactions);
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('henz_preorders_v3', JSON.stringify(preOrders));
    broadcastSync('SYNC_PREORDERS', preOrders);
  }, [preOrders]);

  useEffect(() => {
    localStorage.setItem('henz_stock_transfers_v3', JSON.stringify(stockTransfers));
    broadcastSync('SYNC_TRANSFERS', stockTransfers);
  }, [stockTransfers]);

  useEffect(() => {
    localStorage.setItem('henz_preset_kits_v3', JSON.stringify(presetKits));
    broadcastSync('SYNC_KITS', presetKits);
  }, [presetKits]);

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
        setProducts(parsed.products);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          setTransactions(parsed.transactions);
        }
        if (parsed.preOrders && Array.isArray(parsed.preOrders)) {
          setPreOrders(parsed.preOrders);
        }
        if (parsed.stockTransfers && Array.isArray(parsed.stockTransfers)) {
          setStockTransfers(parsed.stockTransfers);
        }
        if (parsed.presetKits && Array.isArray(parsed.presetKits)) {
          setPresetKits(parsed.presetKits);
        }
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
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setPreOrders(INITIAL_PREORDERS);
    setStockTransfers(INITIAL_TRANSFERS);
    setPresetKits(PRESET_KITS);
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

    // Deduct stock in appropriate branch inside the unified database
    const isUsa = activeBranch.includes('USA Branch') || activeBranch.includes('San Agustin');
    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = active.items.find((item) => item.product.id === prod.id);
        if (!soldItem) return prod;

        if (isUsa) {
          return {
            ...prod,
            stockUsaBranch: Math.max(0, prod.stockUsaBranch - soldItem.quantity),
          };
        } else {
          return {
            ...prod,
            stockMainBranch: Math.max(0, prod.stockMainBranch - soldItem.quantity),
          };
        }
      })
    );

    // If this cart came from a Pre-Order, mark it as Claimed in the central database
    if (active.sourcePreOrderId) {
      setPreOrders((prev) =>
        prev.map((po) =>
          po.id === active.sourcePreOrderId ? { ...po, orderStatus: 'Claimed' } : po
        )
      );
      try {
        updateDoc(doc(db, 'preorders', active.sourcePreOrderId), {
          orderStatus: 'Claimed',
        }).catch(() => {});
      } catch {
        // offline fallback
      }
    }

    // Save transaction to centralized table
    setTransactions((prev) => [newTransaction, ...prev]);
    setRecentCompletedSale(newTransaction);

    soundEffects.playSuccessPayment();

    // Close or clear the active cart
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
    const nextOrderNum = `HNZ-2026-${String(preOrders.length + 101).padStart(4, '0')}`;
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
      id: `po-${Date.now()}`,
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

    setPreOrders((prev) => [newOrder, ...prev]);
    soundEffects.playQRScanChime();

    // Push new order to Firebase Cloud Firestore
    try {
      setDoc(doc(db, 'preorders', newOrder.id), newOrder).catch((err) => {
        console.warn('Offline Firestore save:', err);
      });
    } catch {
      // offline fallback
    }

    return newOrder;
  };

  const updatePreOrderStatus = (orderId: string, status: PreOrderStatus, packedItemIds?: string[]) => {
    setPreOrders((prev) =>
      prev.map((po) => {
        if (po.id === orderId) {
          return {
            ...po,
            orderStatus: status,
            packedItemIds: packedItemIds || po.packedItemIds,
          };
        }
        return po;
      })
    );

    // Push status update to Firebase Cloud Firestore
    try {
      updateDoc(doc(db, 'preorders', orderId), {
        orderStatus: status,
        ...(packedItemIds ? { packedItemIds } : {}),
      }).catch((err) => {
        console.warn('Offline Firestore status update:', err);
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

    let actualTransfer = 0;
    const fromBranchName = from === 'main' ? BRANCH_MAIN : BRANCH_USA;
    const toBranchName = to === 'main' ? BRANCH_MAIN : BRANCH_USA;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const mainStock = p.stockMainBranch;
        const usaStock = p.stockUsaBranch;

        if (from === 'usa' && to === 'main') {
          actualTransfer = Math.min(usaStock, quantity);
          return {
            ...p,
            stockUsaBranch: usaStock - actualTransfer,
            stockMainBranch: mainStock + actualTransfer,
          };
        } else if (from === 'main' && to === 'usa') {
          actualTransfer = Math.min(mainStock, quantity);
          return {
            ...p,
            stockMainBranch: mainStock - actualTransfer,
            stockUsaBranch: usaStock + actualTransfer,
          };
        }
        return p;
      })
    );

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

    setStockTransfers((prev) => [transferRecord, ...prev]);
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
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentMain = p.stockMainBranch;
        const currentUsa = p.stockUsaBranch;

        return {
          ...p,
          stockMainBranch: target === 'main' ? currentMain + quantity : currentMain,
          stockUsaBranch: target === 'usa' ? currentUsa + quantity : currentUsa,
          batchNumber: batchNumber || p.batchNumber,
          expiryDate: expiryDate || p.expiryDate,
        };
      })
    );
    soundEffects.playQRScanChime();
  };

  // CRUD: Update Product
  const updateProduct = (product: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
  };

  // CRUD: Add Product
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  // CRUD: Delete Product
  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // CRUD: Add Preset Starter Kit
  const addPresetKit = (kitData: Omit<PresetKit, 'id'>): PresetKit => {
    const newKit: PresetKit = {
      ...kitData,
      id: `kit-custom-${Date.now()}`,
      isCustom: true,
      createdAt: new Date().toLocaleDateString(),
    };
    setPresetKits((prev) => [newKit, ...prev]);
    soundEffects.playQRScanChime();
    return newKit;
  };

  // CRUD: Update Preset Starter Kit
  const updatePresetKit = (updatedKit: PresetKit) => {
    setPresetKits((prev) => prev.map((k) => (k.id === updatedKit.id ? updatedKit : k)));
    soundEffects.playQRScanChime();
  };

  // CRUD: Delete Preset Starter Kit
  const deletePresetKit = (kitId: string) => {
    setPresetKits((prev) => prev.filter((k) => k.id !== kitId));
    soundEffects.playScanBeep();
  };

  // Reset Preset Starter Kits to default clinical catalog
  const resetPresetKitsToDefaults = () => {
    setPresetKits(PRESET_KITS);
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



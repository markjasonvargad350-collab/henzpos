export type ShelfLifeType = 'short' | 'long';

export type BranchName =
  | 'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper'
  | 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)';

export type ProductCategory =
  | 'PPE & Infection Control'
  | 'Chemical & Reagents'
  | 'Consumables & Accessories'
  | 'Laboratory Equipment & Glasswares'
  | 'Medical Footwear & Apparel'
  | 'Diagnostic & Monitoring'
  | 'Syringes & Needles'
  | 'Wound Care & Dressings'
  | 'Surgical Instruments'
  | 'Sterilization & Antiseptics'
  | 'IV Therapy & Fluids'
  | 'Student Clinical Kits'
  | 'Hospital & Clinic Supplies';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  genericName?: string;
  category: ProductCategory;
  unit: string; // 'piece', 'box (100s)', 'roll', 'bottle (500ml)', 'set'
  price: number; // in PHP (₱)
  costPrice: number;
  stockMainBranch: number; // Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper
  stockUsaBranch: number; // USA Branch - In front of University of San Agustin Gate 5 (USA Gym)
  minStockLevel: number;
  isFastMoving: boolean; // Fast moving restocked per month / daily
  shelfLifeType: ShelfLifeType; // 'short' (consumables/sterile/solutions) vs 'long' (instruments/apparatus)
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  fdaRegistrationNo: string; // FDA CPR / CDRRHR registration #
  description?: string;
}

export interface StockTransferRecord {
  id: string;
  transferNumber: string; // e.g. TR-2026-001
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  fromBranch: BranchName;
  toBranch: BranchName;
  quantity: number;
  transferredBy: string;
  notes?: string;
}

export interface UnifiedDatabaseMeta {
  version: string;
  databaseId: string;
  connectedBranches: {
    branchId: 'main' | 'usa';
    name: BranchName;
    location: string;
    status: 'online' | 'synced';
    lastSyncTime: string;
  }[];
  lastBackupTime: string;
  totalProductsCount: number;
  totalTransactionsCount: number;
  totalPreOrdersCount: number;
  totalTransfersCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  customNote?: string;
}

export interface HeldCart {
  id: string;
  name: string; // e.g. "Customer #1", "BSN St. Paul's", "Walk-in"
  items: CartItem[];
  createdAt: string;
  customerName?: string;
  customerType?: 'Student' | 'Clinic' | 'Walk-in' | 'Wholesale';
  sourcePreOrderId?: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Payment';

export interface SaleTransaction {
  id: string;
  receiptNumber: string;
  timestamp: string;
  branch: BranchName;
  cashierName: string;
  customerName: string;
  customerType: 'Student' | 'Clinic' | 'Walk-in' | 'Wholesale';
  items: CartItem[];
  totalItemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeDue?: number;
  referenceNumber?: string; // For GCash / Bank
  bankName?: string;
  preOrderRefCode?: string;
  status: 'Completed' | 'Refunded';
}

export type PreOrderStatus = 'Pending' | 'Preparing' | 'Ready for Pickup' | 'Claimed' | 'Cancelled';
export type PreOrderPaymentStatus = 'Unpaid (Pay Later at Store)' | 'Paid via GCash' | 'Paid via Bank';

export interface CustomerPreOrder {
  id: string;
  orderNumber: string; // date-stamped + random, e.g. "HNZ-20260818-7K2F"
  qrCodeValue: string;
  customerName: string;
  schoolOrClinic: string;
  contactNumber: string;
  email?: string;
  pickupBranch: BranchName;
  targetPickupDate: string;
  items: {
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    unit: string;
  }[];
  totalItems: number;
  totalAmount: number;
  paymentStatus: PreOrderPaymentStatus;
  paymentMethod: PaymentMethod;
  paymentRefNumber?: string;
  orderStatus: PreOrderStatus;
  createdAt: string;
  preparedByStaff?: string;
  packedItemIds?: string[]; // IDs of items checked during staff prep
  notes?: string;
}

export interface PresetKit {
  id: string;
  name: string;
  targetAudience: string; // e.g. "BSN Level 1 Student Kit", "MedTech Phlebotomy Pack"
  description: string;
  category: string;
  items: {
    productId: string;
    quantity: number;
  }[];
  discountPercentage?: number;
  isCustom?: boolean;
  createdAt?: string;
}

/**
 * A cloud write that was REJECTED — not one that is merely waiting for the
 * internet to come back.
 *
 * The distinction matters and is easy to get backwards: an offline Firestore
 * write does not fail. It is appended to a durable on-device queue and replayed
 * automatically on reconnect, so the promise simply stays unsettled. Therefore
 * every rejection we do see is a real, permanent problem — bad data, an expired
 * session, or a security rule saying no — and treating it as "queued offline,
 * will sync" hides a lost sale behind a reassuring message.
 */
export interface SyncFailure {
  id: string;
  kind: 'Sale' | 'Pre-order' | 'Stock transfer' | 'Order status' | 'Inventory' | 'Starter kit';
  /** What was lost, in the staff's own terms, e.g. "Receipt HENZ-RCP-…  ₱1,250". */
  label: string;
  /** The Firestore error code where available, otherwise the message. */
  message: string;
  at: string;
}


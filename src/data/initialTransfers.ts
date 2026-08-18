import { StockTransferRecord } from '../types';

// Branch name strings are hardcoded here (matching the other seed-data files) to
// avoid a circular import with POSContext, which owns the BRANCH_MAIN/BRANCH_USA
// constants. These strings must stay in sync with those constants.
const BRANCH_MAIN = 'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper';
const BRANCH_USA = 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)';

export const INITIAL_TRANSFERS: StockTransferRecord[] = [
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

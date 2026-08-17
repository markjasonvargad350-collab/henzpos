/**
 * Store & Branch Profile Manager
 * Controls branch locations, hours, contact numbers, and pickup instructions
 */

export interface BranchProfile {
  id: 'main' | 'usa';
  name: string;
  shortName: string;
  address: string;
  landmark: string;
  operatingHours: string;
  contactNumber: string;
  managerName: string;
  pickupInstructions: string;
  status: 'Open' | 'Busy (High Rush)' | 'Closed';
}

export interface StoreGeneralSettings {
  storeName: string;
  tagline: string;
  warehouseLocation: string;
  tinNumber: string;
  fdaLtoNumber: string;
  emergencyHotline: string;
  email: string;
  facebookPageUrl: string;
  facebookMessengerUrl: string;
  branches: Record<'main' | 'usa', BranchProfile>;
}

export const DEFAULT_STORE_SETTINGS: StoreGeneralSettings = {
  storeName: 'HENZ HEALTH CARE PRODUCTS TRADING',
  tagline: 'Your Trusted Partner for Medical Supplies • Chemical & Reagents • Consumables & Accessories • Laboratory Equipment & Glasswares • Affordable & Student-Friendly Prices',
  warehouseLocation: 'Casa Conching Bldg., Jalandoni St., Iloilo City Proper, Iloilo City',
  tinNumber: '298-410-912-000',
  fdaLtoNumber: 'FDA-CDRRHR-LTO-2023-01984',
  emergencyHotline: '+63 917 302 1995 / 0917-302-1995',
  email: 'orders.henzhealthcare@gmail.com',
  facebookPageUrl: 'https://www.facebook.com/profile.php?id=100054474294473',
  facebookMessengerUrl: 'https://m.me/100054474294473',
  branches: {
    main: {
      id: 'main',
      name: 'Main Branch - Casa Conching Bldg., Jalandoni St, Iloilo City Proper',
      shortName: 'Main Branch (Casa Conching)',
      address: 'Ground Floor, Casa Conching Building, Jalandoni Street, Iloilo City Proper, Iloilo City',
      landmark: 'In front of University of San Agustin Gate 5 (USA Gym) • Near UI-PHINMA route',
      operatingHours: 'Mon - Fri: 6:30 AM - 6:30 PM | Sat: 7:30 AM - 6:00 PM | Sun: 9:00 AM - 6:00 PM',
      contactNumber: '+63 917 302 1995 / 0917-302-1995',
      managerName: 'Grace A. (Branch Supervisor)',
      pickupInstructions: 'Proceed to Counter 1 (Pre-Order Claim Desk) or show reference QR to staff. Express pickup for Augustinian & Ilonggo medical students.',
      status: 'Open',
    },
    usa: {
      id: 'usa',
      name: 'USA Branch - In front of University of San Agustin Gate 5 (USA Gym)',
      shortName: 'USA Branch (San Agustin Gate 5)',
      address: 'Door 2, Casa Conching Commercial Arcade, in front of USA Gym Gate 5, General Luna / Jalandoni St.',
      landmark: 'Directly facing University of San Agustin Gate 5 (USA Gym)',
      operatingHours: 'Mon - Fri: 6:30 AM - 6:30 PM | Sat: 7:30 AM - 6:00 PM | Sun: 9:00 AM - 6:00 PM',
      contactNumber: '+63 917 302 1995 / 0998-441-2093',
      managerName: 'Arnel M. (USA Station Lead)',
      pickupInstructions: 'Express pickup station right across Gate 5. Dedicated priority desk for nursing, medtech, and pharmacy students.',
      status: 'Open',
    },
  },
};

const STORE_SETTINGS_KEY = 'henz_store_branch_settings_v1';

export function getStoreSettings(): StoreGeneralSettings {
  try {
    const saved = localStorage.getItem(STORE_SETTINGS_KEY);
    return saved ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_STORE_SETTINGS;
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreGeneralSettings): void {
  try {
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

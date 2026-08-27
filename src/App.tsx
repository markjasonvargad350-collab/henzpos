/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { HeaderNav } from './components/common/HeaderNav';
import { POSTerminal } from './components/pos/POSTerminal';
import { DigitalChecklistPortal } from './components/checklist/DigitalChecklistPortal';
import { OrderPrepQueue } from './components/prep/OrderPrepQueue';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { ReportsView } from './components/reports/ReportsView';
import { DemandForecast } from './components/forecast/DemandForecast';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { PWAStatusToast } from './components/common/PWAStatusToast';
import { SharePreOrderModal } from './components/common/SharePreOrderModal';
import { SyncFailureBanner } from './components/common/SyncFailureBanner';
import { UnifiedDatabaseModal } from './components/database/UnifiedDatabaseModal';

const MainLayout: React.FC = () => {
  const {
    activeView,
    userRole,
    isAdminLoginModalOpen,
    setIsAdminLoginModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
  } = usePOS();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-600 selection:text-white">
      {/* Top Main Navigation Header with Role Switcher */}
      <HeaderNav />

      {/* Main Content Area Routing */}
      <main className="flex-1 pb-10">
        {userRole === 'user' ? (
          // In customer mode, only the Pre-Order Checklist Portal is rendered without requiring login
          <DigitalChecklistPortal />
        ) : (
          // In admin mode, full POS and store management suite is available
          <>
            {activeView === 'pos' && <POSTerminal />}
            {activeView === 'checklist-portal' && <DigitalChecklistPortal />}
            {activeView === 'prep-queue' && <OrderPrepQueue />}
            {activeView === 'inventory' && <InventoryManagement />}
            {activeView === 'reports' && <ReportsView />}
            {activeView === 'forecast' && <DemandForecast />}
          </>
        )}
      </main>

      {/* Admin Authentication Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
      />

      {/* Share Pre-Order Portal Link Modal */}
      <SharePreOrderModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Unified Database Architecture & 2-Branch Status Modal */}
      <UnifiedDatabaseModal />

      {/* Offline-ready confirmation / new-version prompt (service worker) */}
      <PWAStatusToast />

      {/* Loud, non-dismissing-on-its-own alert for writes the cloud REJECTED */}
      <SyncFailureBanner />

      {/* Clean Medical Retail Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 justify-center">
            <span className="font-bold text-slate-800">HENZ Health Care Products Trading</span>
            <span className="text-slate-300">•</span>
            <span>Medical Supplies & Nursing Duty Kits</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 justify-center">
            <span>Main (Casa Conching, Jalandoni St) &amp; D&apos;Jabez (21 Gen. Luna St)</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">FDA Regulatory Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <MainLayout />
    </POSProvider>
  );
}

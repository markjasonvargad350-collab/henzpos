import React, { useState } from 'react';
import {
  CreditCard,
  ClipboardList,
  PackageCheck,
  Boxes,
  BarChart3,
  TrendingUp,
  Building2,
  Share2,
  Lock,
  LogOut,
  Settings,
  Stethoscope,
  ShoppingBag,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { usePOS, ActiveNavView, BRANCH_MAIN, BRANCH_DJABEZ } from '../../context/POSContext';
import { StoreSettingsModal } from './StoreSettingsModal';

export const HeaderNav: React.FC = () => {
  const {
    userRole,
    setUserRole,
    isAdminAuthenticated,
    setIsAdminLoginModalOpen,
    setIsShareModalOpen,
    logoutAdmin,
    activeView,
    setActiveView,
    activeBranch,
    setActiveBranch,
    preOrders,
    heldCarts,
    isCloudOnline,
    isSyncing,
    pendingWriteCount,
  } = usePOS();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const pendingPreOrdersCount = preOrders.filter(
    (p) => p.orderStatus === 'Pending' || p.orderStatus === 'Preparing'
  ).length;

  const adminNavItems: { id: ActiveNavView; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'pos', label: 'Cashier Register', icon: CreditCard, badge: heldCarts.length > 1 ? heldCarts.length : undefined },
    { id: 'checklist-portal', label: 'Pre-Order Portal', icon: ClipboardList },
    { id: 'prep-queue', label: 'Prep Desk', icon: PackageCheck, badge: pendingPreOrdersCount > 0 ? pendingPreOrdersCount : undefined },
    { id: 'inventory', label: 'Inventory & Expiry', icon: Boxes },
    { id: 'reports', label: 'Sales & Reports', icon: BarChart3 },
    { id: 'forecast', label: 'Demand Forecast', icon: TrendingUp },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        {/* Top Medical Utility Bar */}
        <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold tracking-wide text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>HENZ HEALTH CARE PRODUCTS TRADING</span>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Medical Supplies & Nursing Kits (Jalandoni St & Gen. Luna St)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Cloud sync status — hybrid database health at a glance. isCloudOnline
                reflects whether Firestore itself is reachable (not merely whether a
                network interface exists), and the count is real unsynced documents. */}
            <div
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-semibold ${
                isSyncing
                  ? 'bg-amber-950/70 border-amber-600/40 text-amber-300'
                  : isCloudOnline
                  ? 'bg-emerald-950/70 border-emerald-600/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-600/50 text-slate-300'
              }`}
              title={
                isCloudOnline
                  ? isSyncing
                    ? `Saving ${pendingWriteCount} record${
                        pendingWriteCount === 1 ? '' : 's'
                      } to the cloud…`
                    : 'Online — all branches synced in real time'
                  : `Offline — cannot reach the database. ${
                      pendingWriteCount > 0
                        ? `${pendingWriteCount} record${
                            pendingWriteCount === 1 ? '' : 's'
                          } saved on this device, waiting to sync.`
                        : 'Changes are saved on this device.'
                    } They sync automatically when the connection returns; do not clear this browser's data in the meantime.`
              }
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : isCloudOnline ? (
                <Cloud className="w-3 h-3" />
              ) : (
                <CloudOff className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {isSyncing ? 'Syncing…' : isCloudOnline ? 'Online' : 'Offline'}
              </span>
              {pendingWriteCount > 0 && (
                <span
                  className={`ml-0.5 px-1 rounded-full text-[10px] font-bold ${
                    isCloudOnline ? 'bg-amber-500/25' : 'bg-amber-400 text-slate-900'
                  }`}
                >
                  {pendingWriteCount}
                </span>
              )}
            </div>

            {/* Quick Share Student Link */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer font-medium"
              title="Share Student Pre-Order QR Link"
            >
              <Share2 className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Share Portal</span>
            </button>

            {/* Store & POS Settings */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer font-medium"
              title="Branch, Receipt & Cloud Settings"
            >
              <Settings className="w-3 h-3 text-emerald-400" />
              <span>Settings</span>
            </button>

            {/* Role Switcher / Admin Login */}
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Staff Active
                </span>
                <button
                  onClick={logoutAdmin}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-600/40 transition cursor-pointer"
                  title="Log out of Staff Mode"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                title="Staff / Cashier Login"
              >
                <Lock className="w-3 h-3" />
                <span>Staff Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Branding & Navigation Row */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Current Branch */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/10">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                  HENZ Health Care
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Medical POS
                </span>
              </div>

              {/* Branch Selector Pill */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <select
                  value={activeBranch}
                  onChange={(e) => setActiveBranch(e.target.value as any)}
                  className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-0.5 px-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={BRANCH_MAIN}>Main Branch (Casa Conching, Jalandoni St)</option>
                  <option value={BRANCH_DJABEZ}>D'Jabez Branch (21 Gen. Luna St)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          {userRole === 'user' ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block">Student & Clinic Pre-Order Portal</span>
                <span className="text-[11px] text-emerald-600 font-medium">Select Supplies • Generate QR • Pay at Counter</span>
              </div>
              <button
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cashier POS Login</span>
              </button>
            </div>
          ) : (
            <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-white text-emerald-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Unified Settings Modal */}
      <StoreSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
};

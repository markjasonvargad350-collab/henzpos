import React, { useState } from 'react';
import {
  X,
  Building2,
  Receipt,
  Mail,
  Database,
  Lock,
  LogOut,
  CheckCircle2,
  Printer,
  Shield,
  Smartphone,
  Save,
} from 'lucide-react';
import { usePOS, BRANCH_MAIN, BRANCH_USA } from '../../context/POSContext';
import { getReceiptSettings, saveReceiptSettings } from '../../utils/receiptSettings';
import { getEmailSettings, saveEmailSettings, EmailSettings } from '../../utils/emailNotifier';

interface StoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'branch' | 'receipt' | 'email' | 'system';

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    activeBranch,
    setActiveBranch,
    isAdminAuthenticated,
    logoutAdmin,
    databaseMeta,
    setIsDatabaseModalOpen,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<TabType>('branch');
  const [receiptSettings, setReceiptSettingsState] = useState(getReceiptSettings);
  const [emailConfig, setEmailConfigState] = useState<EmailSettings>(getEmailSettings);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptSettings(receiptSettings);
    setSaveToast('Receipt settings saved successfully!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailSettings(emailConfig);
    setSaveToast('Email notification settings saved!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-xs">
              ⚙️
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Store & POS Settings</h3>
              <p className="text-xs text-slate-400">
                HENZ Health Care Products Trading Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('branch')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'branch'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Branch Selection</span>
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'receipt'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Thermal Receipt & BIR TIN</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'system'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin & Cloud Sync</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {saveToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveToast}</span>
            </div>
          )}

          {/* TAB 1: BRANCH CONFIG */}
          {activeTab === 'branch' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Select your active physical branch location. Real-time stock counts and cashier transaction records will automatically link to this branch.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setActiveBranch(BRANCH_MAIN)}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    activeBranch === BRANCH_MAIN
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Main Branch</span>
                      {activeBranch === BRANCH_MAIN && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">Casa Conching Bldg., Jalandoni St, Iloilo City</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    Warehouse hub & bulk replenishment center
                  </p>
                </div>

                <div
                  onClick={() => setActiveBranch(BRANCH_USA)}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    activeBranch === BRANCH_USA
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">USA Branch</span>
                      {activeBranch === BRANCH_USA && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">In front of Univ. of San Agustin Gate 5 (USA Gym)</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    Primary medical student express retail counter
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECEIPT SETTINGS */}
          {activeTab === 'receipt' && (
            <form onSubmit={handleSaveReceipt} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Store Name on Header</label>
                  <input
                    type="text"
                    value={receiptSettings.storeName}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, storeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Printer Roll Width</label>
                  <select
                    value={receiptSettings.printerWidth}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, printerWidth: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="80mm">80mm Standard POS Thermal Roll</option>
                    <option value="58mm">58mm Compact Mini Bluetooth Printer</option>
                    <option value="A4">A4 Full Sheet Formal Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">BIR Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    value={receiptSettings.taxIdNumber}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, taxIdNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">FDA License to Operate (LTO)</label>
                  <input
                    type="text"
                    value={receiptSettings.fdaLicenseNumber}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, fdaLicenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Footer Medical Notice</label>
                <input
                  type="text"
                  value={receiptSettings.footerNotice}
                  onChange={(e) => setReceiptSettingsState({ ...receiptSettings, footerNotice: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Receipt Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EMAIL ALERTS */}
          {activeTab === 'email' && (
            <form onSubmit={handleSaveEmail} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Send automatic confirmation emails and digital receipts to students upon pre-order submission and counter completion.
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sender Email / Notification Center</label>
                <input
                  type="email"
                  value={emailConfig.senderEmail}
                  onChange={(e) => setEmailConfigState({ ...emailConfig, senderEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={emailConfig.enabled}
                    onChange={(e) => setEmailConfigState({ ...emailConfig, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Enable automated customer email notifications & invoices</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={emailConfig.autoSendOnReady}
                    onChange={(e) => setEmailConfigState({ ...emailConfig, autoSendOnReady: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>Auto-notify student when their order has been packed and is ready at counter</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Email Configuration</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SYSTEM & CLOUD */}
          {activeTab === 'system' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Admin Authentication Status</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {isAdminAuthenticated ? 'Logged In as Admin / Staff' : 'Guest View'}
                  </span>
                </div>
                <p className="text-slate-500">
                  Staff default PINs: <code className="bg-white px-1.5 py-0.5 rounded border">8888</code> or <code className="bg-white px-1.5 py-0.5 rounded border">admin123</code>
                </p>
                {isAdminAuthenticated && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        logoutAdmin();
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of Admin Mode</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">Central Database Synchronization</h4>
                  <p className="text-slate-500 mt-0.5">
                    Unified stock sync across Casa Conching Main & USA Gate 5 Branch
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDatabaseModalOpen(true);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  View Database Monitor
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

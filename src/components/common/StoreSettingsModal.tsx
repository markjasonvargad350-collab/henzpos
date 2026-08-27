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
  KeyRound,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { usePOS, BRANCH_MAIN, BRANCH_DJABEZ } from '../../context/POSContext';
import { getReceiptSettings, saveReceiptSettings } from '../../utils/receiptSettings';
import { getEmailSettings, saveEmailSettings, EmailSettings } from '../../utils/emailNotifier';
import { hashAdminCode } from '../../lib/adminCode';

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
    userRole,
    changeAdminCode,
    isAdminCodeConfigured,
    logoutAdmin,
    databaseMeta,
    setIsDatabaseModalOpen,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<TabType>('branch');
  const [receiptSettings, setReceiptSettingsState] = useState(getReceiptSettings);
  const [emailConfig, setEmailConfigState] = useState<EmailSettings>(getEmailSettings);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Admin-code management (system tab, admin only). The code is stored only as a
  // SHA-256 hash on this device — see src/lib/adminCode.ts. currentCode is required
  // only when a code already exists (rotating it); the first-time set skips it.
  const codeAlreadySet = isAdminCodeConfigured();
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedHash, setSavedHash] = useState('');
  const [hashCopied, setHashCopied] = useState(false);

  if (!isOpen) return null;

  const handleChangeAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeMsg(null);
    setSavedHash('');
    setHashCopied(false);
    const next = newCode.trim();
    if (next !== confirmCode.trim()) {
      setCodeMsg({ ok: false, text: 'The new code and its confirmation do not match.' });
      return;
    }
    const result = await changeAdminCode(currentCode.trim(), next);
    if (!result.ok) {
      setCodeMsg({ ok: false, text: result.message || 'Could not update the admin code.' });
      return;
    }
    // Re-derive the stored hash so the owner can optionally bake it into the
    // deployment config for a store-wide default (see note below the form).
    const hash = await hashAdminCode(next);
    setSavedHash(hash);
    setCodeMsg({
      ok: true,
      text: codeAlreadySet
        ? 'Admin code changed on this device.'
        : 'Admin code set on this device. You now have full admin access.',
    });
    setCurrentCode('');
    setNewCode('');
    setConfirmCode('');
  };

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(savedHash);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; the hash is still shown for manual copy */
    }
  };

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
                    <p className="text-xs text-slate-600">Casa Conching Bldg., Jalandoni St, Iloilo City Proper</p>
                    <p className="text-[11px] text-slate-500">In front of University of San Agustin Gate 5</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    Warehouse hub & bulk replenishment center
                  </p>
                </div>

                <div
                  onClick={() => setActiveBranch(BRANCH_DJABEZ)}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                    activeBranch === BRANCH_DJABEZ
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">D&apos;Jabez Branch</span>
                      {activeBranch === BRANCH_DJABEZ && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">D&apos;Jabez Bldg., 21 Gen. Luna St., Iloilo City Proper</p>
                    <p className="text-[11px] text-slate-500">In front of the Jalandoni Flyover &amp; JD Bakeshop</p>
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
                    value={receiptSettings.storeHeaderTitle}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, storeHeaderTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Printer Roll Width</label>
                  <select
                    value={receiptSettings.paperWidth}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, paperWidth: e.target.value as any })}
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
                    value={receiptSettings.tinNumber}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, tinNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">FDA License to Operate (LTO)</label>
                  <input
                    type="text"
                    value={receiptSettings.fdaLtoNumber}
                    onChange={(e) => setReceiptSettingsState({ ...receiptSettings, fdaLtoNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Footer Medical Notice</label>
                <input
                  type="text"
                  value={receiptSettings.customFooterNote}
                  onChange={(e) => setReceiptSettingsState({ ...receiptSettings, customFooterNote: e.target.value })}
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
                  <span className="font-bold text-slate-800">Access Level</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      userRole === 'admin'
                        ? 'bg-indigo-100 text-indigo-800'
                        : isAdminAuthenticated
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {userRole === 'admin'
                      ? 'Admin — full access'
                      : isAdminAuthenticated
                      ? 'Staff — limited'
                      : 'Guest View'}
                  </span>
                </div>
                <p className="text-slate-500">
                  Everyone signs in with the shared staff account for limited access (register,
                  pre-orders, prep desk, inventory). Full admin access — reports, forecast, this
                  Settings panel and the database monitor — is unlocked separately with the admin
                  code below.
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
                      <span>Sign Out of This Device</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Admin access code — set or rotate the second gate that unlocks full
                  admin. Stored only as a SHA-256 hash on this device (localStorage);
                  the plain code is never persisted. Admin only. */}
              {userRole === 'admin' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      Admin Access Code
                    </h4>
                    <p className="text-slate-500 mt-0.5">
                      {codeAlreadySet
                        ? 'Enter the current code, then choose a new one to rotate it on this device.'
                        : 'No admin code is set on this device yet. Create one to control who can unlock full admin access.'}
                    </p>
                  </div>

                  <form onSubmit={handleChangeAdminCode} className="space-y-2">
                    {codeAlreadySet && (
                      <input
                        type="password"
                        value={currentCode}
                        onChange={(e) => setCurrentCode(e.target.value)}
                        placeholder="Current admin code"
                        autoComplete="off"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                    <input
                      type="password"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="New admin code (min 4 characters)"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="password"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      placeholder="Confirm new admin code"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />

                    {codeMsg && (
                      <div
                        className={`p-2.5 rounded-lg flex items-center gap-2 font-medium ${
                          codeMsg.ok
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        {codeMsg.ok ? (
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 shrink-0" />
                        )}
                        <span>{codeMsg.text}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{codeAlreadySet ? 'Change Admin Code' : 'Set Admin Code'}</span>
                    </button>
                  </form>

                  {savedHash && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <p className="text-slate-500">
                        Optional — to make this the same code on <b>every</b> device, paste this
                        hash into <code className="bg-slate-200 px-1 rounded">adminCodeHash</code> in{' '}
                        <code className="bg-slate-200 px-1 rounded">firebase-applet-config.json</code>{' '}
                        and redeploy. Otherwise it stays on this device only.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-[11px] text-slate-700">
                          {savedHash}
                        </code>
                        <button
                          type="button"
                          onClick={copyHash}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {hashCopied ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*
                Admin only. The Database Monitor can export every customer's name,
                phone and email plus every sale to a file, reset the catalogue, and
                clear old records — none of which belongs on a screen a customer or
                limited staff can reach.
              */}
              {userRole === 'admin' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800">Central Database Synchronization</h4>
                    <p className="text-slate-500 mt-0.5">
                      Unified stock sync across Casa Conching Main &amp; D&apos;Jabez Gen. Luna Branch
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
              )}
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

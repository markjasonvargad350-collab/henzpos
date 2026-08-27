import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, Check, X, Lock } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Elevates a signed-in staff session to full admin by checking the in-app admin
 * code. On a device where no code exists yet, it doubles as a one-time "create
 * admin code" screen (bootstrap) — see lib/adminCode.ts for the storage model.
 */
export const AdminUnlockModal: React.FC<AdminUnlockModalProps> = ({ isOpen, onClose }) => {
  const { unlockAdmin, changeAdminCode, isAdminCodeConfigured } = usePOS();

  const configured = isAdminCodeConfigured();

  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setConfirmCode('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!configured && code.trim() !== confirmCode.trim()) {
      setErrorMessage('The two codes do not match. Type the same code twice.');
      soundEffects.playErrorBeep();
      return;
    }

    setIsLoading(true);

    // Bootstrap: no code exists yet, so set it first, then unlock with it.
    if (!configured) {
      const setResult = await changeAdminCode('', code.trim());
      if (!setResult.ok) {
        setIsLoading(false);
        setErrorMessage(setResult.message || 'Could not set the admin code.');
        soundEffects.playErrorBeep();
        return;
      }
    }

    const result = await unlockAdmin(code.trim());
    setIsLoading(false);

    if (result.ok) {
      soundEffects.playQRScanChime();
      onClose();
    } else {
      soundEffects.playErrorBeep();
      setErrorMessage(result.message || 'Incorrect admin code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-indigo-500/40 p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {configured ? 'Unlock Admin Access' : 'Create Admin Code'}
            </h3>
            <p className="text-xs text-slate-500">
              {configured
                ? 'Full access: Sales & Reports, Demand Forecast, Settings & Database'
                : 'Set the code that unlocks full admin access on this device'}
            </p>
          </div>
        </div>

        {/* Explains that this is a second gate on top of the staff sign-in */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-800 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 text-indigo-500 mt-0.5" />
          <span>
            You are signed in as <span className="font-bold">staff</span>. The admin code is a
            second step that opens financial reports, the demand forecast, store settings and the
            database tools. It stays unlocked until you lock it or reload.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {configured ? 'Admin Code' : 'New Admin Code'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={configured ? 'Enter admin code…' : 'Choose an admin code (min 4 chars)…'}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
              />
            </div>
          </div>

          {!configured && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Admin Code</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder="Re-type the admin code…"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                This is separate from the staff password. Keep it with the store owner — anyone
                who knows it gets full access on this device.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !code}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-950/30 cursor-pointer"
            >
              {isLoading ? (
                <span>{configured ? 'Unlocking…' : 'Saving…'}</span>
              ) : (
                <>
                  {configured ? <ShieldCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{configured ? 'Unlock Admin' : 'Create & Unlock'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

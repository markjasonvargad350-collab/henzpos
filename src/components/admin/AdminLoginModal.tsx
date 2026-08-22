import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, KeyRound, AlertCircle, WifiOff, X } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginAdmin, isCloudOnline } = usePOS();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const result = await loginAdmin(password.trim());
    setIsLoading(false);

    if (result.ok) {
      soundEffects.playQRScanChime();
      onClose();
    } else {
      soundEffects.playErrorBeep();
      // The reason comes from the context, which distinguishes a wrong password
      // from a failure to reach the auth server at all.
      setErrorMessage(
        result.message ||
          'Incorrect staff password. Please check with the store owner and try again.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-emerald-500/40 p-6 space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              HENZ Staff Sign-In
            </h3>
            <p className="text-xs text-slate-500">
              Restricted portal for cashier checkout, inventory & packing desk
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Firebase Auth has no offline password check, so warn before the
              cashier types a password that cannot possibly be verified. */}
          {!isCloudOnline && !errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <span className="font-bold">No connection right now.</span> Signing in needs
                internet, even though the register keeps working offline once signed in.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Password:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter shared staff password..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              All cashiers share one secure staff account. Ask the store owner for the current password.
            </p>
          </div>

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
              disabled={isLoading || !password}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In as Staff</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

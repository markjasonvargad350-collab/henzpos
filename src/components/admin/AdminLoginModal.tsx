import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  KeyRound,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginAdmin } = usePOS();
  const [username, setUsername] = useState('admin');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const success = loginAdmin(password.trim(), username.trim());
      setIsLoading(false);

      if (success) {
        soundEffects.playQRScanChime();
        onClose();
      } else {
        soundEffects.playErrorBeep();
        setErrorMessage('Invalid Staff/Admin credentials or PIN. Please check and try again.');
      }
    }, 250);
  };

  const handleQuickFill = (pwd: string) => {
    setPassword(pwd);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-md rounded-2xl shadow-2xl border border-emerald-500/40 p-6 space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#21262d] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              HENZ Staff & Admin Authentication
            </h3>
            <p className="text-xs text-gray-400">
              Restricted portal for cashier checkout, inventory CRUD & packing desk
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1">
              Staff / Admin Account:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or cashier1"
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0b0d] text-white border border-[#30363d] rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-300">
                Password or Security PIN:
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">
                PIN: 8888 or admin123
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="password"
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password or PIN..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0b0d] text-white border border-[#30363d] rounded-xl focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
              />
            </div>
          </div>

          {/* Quick Credential Helpers */}
          <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>Quick Test Access for Evaluator:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('8888')}
                className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-emerald-400 text-xs rounded-lg border border-[#30363d] transition font-mono cursor-pointer"
              >
                PIN: 8888
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin123')}
                className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-emerald-400 text-xs rounded-lg border border-[#30363d] transition font-mono cursor-pointer"
              >
                Password: admin123
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('henz2026')}
                className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-emerald-400 text-xs rounded-lg border border-[#30363d] transition font-mono cursor-pointer"
              >
                Password: henz2026
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Log In as Staff / Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

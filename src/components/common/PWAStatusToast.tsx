import { CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// How often an already-open register re-checks for a new deploy. A POS station
// can stay open for days, so without this a cashier could sit on an old build
// long after a fix ships.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Service-worker lifecycle UI.
 *
 * Two jobs:
 *  1. Confirm to staff (once, on first install) that the register is now cached
 *     and will open even with no internet.
 *  2. Offer an explicit "Update now" when a new deploy is waiting. This is a
 *     prompt, never automatic — a POS must not reload itself mid-sale.
 */
export const PWAStatusToast: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        // No point hitting the network while offline; the next tick will catch it.
        if (navigator.onLine) registration.update().catch(() => {});
      }, UPDATE_CHECK_INTERVAL_MS);
    },
  });

  // The "ready to work offline" note is informational — let it fade on its own.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 8000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm print:hidden">
      {needRefresh ? (
        <div className="bg-white border border-emerald-200 rounded-lg shadow-lg p-4 ring-1 ring-emerald-600/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900">A new version is ready</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Finish the current sale first — updating reloads the register.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Update now
                </button>
                <button
                  onClick={() => setNeedRefresh(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={() => setNeedRefresh(false)}
              className="ml-auto text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 ring-1 ring-slate-900/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                Offline mode ready
              </p>
              <p className="text-xs text-slate-600">
                The register now opens without internet on this device.
              </p>
            </div>
            <button
              onClick={() => setOfflineReady(false)}
              className="ml-auto text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

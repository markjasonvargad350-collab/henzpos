import { AlertTriangle, X } from 'lucide-react';
import React from 'react';
import { usePOS } from '../../context/POSContext';

/**
 * Surfaces cloud writes that were REJECTED.
 *
 * This exists because the failure it reports is otherwise invisible: the cashier
 * sees a printed receipt and a cleared cart whether or not the sale reached the
 * cloud. Being offline is NOT one of these cases — Firestore queues offline
 * writes and replays them on reconnect, so anything shown here needs a human to
 * re-enter it.
 */
export const SyncFailureBanner: React.FC = () => {
  const { syncFailures, dismissSyncFailure } = usePOS();

  if (syncFailures.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md space-y-2 print:hidden">
      {syncFailures.slice(0, 4).map((f) => (
        <div
          key={f.id}
          className="bg-white border-2 border-red-300 rounded-lg shadow-xl p-4 ring-1 ring-red-600/10"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-red-800">{f.kind} was NOT saved</p>
              <p className="text-xs text-slate-800 font-semibold mt-1 break-words">{f.label}</p>
              <p className="text-xs text-slate-600 mt-1">
                This was rejected by the database, not delayed by a slow connection — it will
                not retry on its own. Re-enter it, then tell the store owner.
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-1.5">
                {f.message} • {f.at}
              </p>
            </div>
            <button
              onClick={() => dismissSyncFailure(f.id)}
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {syncFailures.length > 4 && (
        <p className="text-xs text-red-700 font-semibold text-right pr-1">
          + {syncFailures.length - 4} more failed write
          {syncFailures.length - 4 === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
};

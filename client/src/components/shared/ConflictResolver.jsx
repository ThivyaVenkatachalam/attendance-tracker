import { AlertTriangle, GitCompare, RefreshCw, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/shared';

export function ConflictResolver({
  conflict,
  showCompare = false,
  onReload,
  onRetry,
  onCompare,
  onDismiss,
}) {
  if (!conflict) return null;

  const { latest, attempted } = conflict;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-warning-light text-warning">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900">Conflict Detected</h2>
            <p className="text-sm text-neutral-500">
              This attendance record was updated by someone else while you were editing.
            </p>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-3 mb-4 text-sm">
          <p className="text-neutral-500 mb-1">Latest value on server</p>
          <div className="flex items-center gap-2">
            <Badge label={latest?.status ?? 'unknown'} variant={latest?.status} />
            <span className="text-neutral-400 text-xs">version {latest?.version ?? '-'}</span>
          </div>
        </div>

        {showCompare && (
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-neutral-500 mb-2">Your change</p>
              <Badge label={attempted?.status ?? 'unknown'} variant={attempted?.status} />
              <p className="text-xs text-neutral-400 mt-2">based on version {attempted?.version ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-neutral-500 mb-2">Server latest</p>
              <Badge label={latest?.status ?? 'unknown'} variant={latest?.status} />
              <p className="text-xs text-neutral-400 mt-2">version {latest?.version ?? '-'}</p>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <button className="btn-primary w-full" onClick={onReload}>
            <RefreshCw size={16} /> Reload Latest
          </button>
          <button className="btn-secondary w-full" onClick={onRetry}>
            <RotateCcw size={16} /> Retry Update
          </button>
          <button className="btn-secondary w-full" onClick={onCompare}>
            <GitCompare size={16} /> Compare Changes
          </button>
          <button
            className="text-sm text-neutral-400 hover:text-neutral-600 mt-1"
            onClick={onDismiss}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

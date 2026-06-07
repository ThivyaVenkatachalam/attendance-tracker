// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-neutral-200 border-t-primary`} />
  );
}

// ── Badge ─────────────────────────────────────────────────────
const badgeVariants = {
  present:  'badge-success',
  approved: 'badge-success',
  absent:   'badge-danger',
  rejected: 'badge-danger',
  leave:    'badge-warning',
  pending:  'badge-warning',
  recommended: 'badge-primary',
  default:  'badge-neutral',
};

export function Badge({ label, variant }) {
  const cls = badgeVariants[variant ?? label?.toLowerCase()] ?? badgeVariants.default;
  return <span className={cls}>{label}</span>;
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({ title, value, sub, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'text-primary bg-primary-light',
    success: 'text-success bg-success-light',
    warning: 'text-warning bg-warning-light',
    danger:  'text-danger  bg-danger-light',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      {Icon && (
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={22} />
        </div>
      )}
      <div>
        <p className="text-sm text-neutral-500">{title}</p>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-neutral-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ message = 'No data found', icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
      {Icon && <Icon size={40} className="mb-3 opacity-40" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Warning Banner ────────────────────────────────────────────
export function WarningBanner({ message }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning-light border border-warning/20 text-warning text-sm font-medium">
      ⚠️ {message}
    </div>
  );
}

// ── Draft Banner ──────────────────────────────────────────────
export function DraftBanner({ onRestore, onDiscard }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-primary-light border border-primary/20 text-sm">
      <span className="text-primary font-medium">📝 You have unsaved changes from your last session</span>
      <div className="flex gap-2">
        <button className="btn-primary text-xs py-1 px-3" onClick={onRestore}>Restore</button>
        <button className="btn-secondary text-xs py-1 px-3" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  );
}

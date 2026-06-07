import { useEffect, useState } from 'react';
import { useLeaveStore } from '@/store/leaveStore';
import { Badge, Spinner, EmptyState, Modal } from '@/components/shared';
import { PlusCircle, FileText, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// ── Timeline component ────────────────────────────────────────
function LeaveTimeline({ leave }) {
  const steps = [
    {
      key: 'applied',
      label: 'Applied',
      description: `Submitted on ${format(new Date(leave.created_at), 'dd MMM yyyy, hh:mm a')}`,
      icon: Clock,
      done: true,
      color: 'text-primary bg-primary-light',
      line: 'bg-primary',
    },
    {
      key: 'under_review',
      label: 'Under Review',
      description:
        leave.status === 'pending'
          ? 'Awaiting faculty or HOD decision'
          : `Reviewed ${leave.updated_at ? format(new Date(leave.updated_at), 'dd MMM yyyy') : ''}`,
      icon: AlertCircle,
      done: leave.status !== 'pending',
      active: leave.status === 'pending',
      color:
        leave.status === 'pending'
          ? 'text-warning bg-warning-light'
          : 'text-primary bg-primary-light',
      line:
        leave.status === 'pending' ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-primary',
    },
    {
      key: 'decision',
      label: leave.status === 'rejected' ? 'Rejected' : 'Approved',
      description:
        leave.status === 'pending'
          ? 'Pending decision'
          : leave.status === 'approved'
          ? `Approved — ${differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} day(s) granted`
          : leave.rejection_reason
          ? `Reason: ${leave.rejection_reason}`
          : 'Request was rejected',
      icon: leave.status === 'rejected' ? XCircle : CheckCircle,
      done: leave.status !== 'pending',
      color:
        leave.status === 'pending'
          ? 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800'
          : leave.status === 'approved'
          ? 'text-success bg-success-light'
          : 'text-danger bg-danger-light',
      line: 'bg-neutral-200 dark:bg-neutral-700',
    },
  ];

  return (
    <div className="mt-4 pl-1">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center shrink-0
                transition-all duration-300
                ${step.color}
                ${step.active ? 'ring-2 ring-offset-2 ring-warning' : ''}
              `}>
                <Icon size={15} />
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[24px] mt-1 mb-1 rounded-full transition-colors ${step.line}`} />
              )}
            </div>

            {/* Text */}
            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <p className={`text-sm font-semibold ${step.done || step.active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
                {step.label}
              </p>
              <p className={`text-xs mt-0.5 ${step.done || step.active ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-300 dark:text-neutral-600'}`}>
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Leave card with expandable timeline ──────────────────────
function LeaveCard({ leave }) {
  const [expanded, setExpanded] = useState(false);
  const days = differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;

  return (
    <div className="card p-4 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge label={leave.status} variant={leave.status} />
            <span className="text-sm text-neutral-500">
              {format(new Date(leave.start_date), 'dd MMM')} →{' '}
              {format(new Date(leave.end_date), 'dd MMM yyyy')}
            </span>
            <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {days} day{days !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">{leave.reason}</p>
        </div>
        <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
          <p className="text-xs text-neutral-400">
            {format(new Date(leave.created_at), 'dd MMM yyyy')}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? (
              <><ChevronUp size={13} /> Hide timeline</>
            ) : (
              <><ChevronDown size={13} /> View timeline</>
            )}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {expanded && <LeaveTimeline leave={leave} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function StudentLeave() {
  const { leaves, loading, fetchMyLeaves, applyLeave } = useLeaveStore();
  const [showModal, setShowModal]   = useState(false);
  const [form,      setForm]        = useState({ start_date: '', end_date: '', reason: '' });
  const [errors,    setErrors]      = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMyLeaves(); }, []);

  const validate = () => {
    const e = {};
    if (!form.start_date) e.start_date = 'Required';
    if (!form.end_date)   e.end_date   = 'Required';
    if (!form.reason.trim()) e.reason  = 'Required';
    else if (form.reason.trim().length < 10) e.reason = 'Use at least 10 characters';
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = 'End date must be after start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const result = await applyLeave(form);
    setSubmitting(false);
    if (result.success) {
      setShowModal(false);
      setForm({ start_date: '', end_date: '', reason: '' });
    }
  };

  // Summary counts
  const counts = {
    pending:  leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">Student</p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Leave Requests</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> Apply for Leave
        </button>
      </div>

      {/* Summary pills */}
      {leaves.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-warning-light text-warning">
            <Clock size={12} /> {counts.pending} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-success-light text-success">
            <CheckCircle size={12} /> {counts.approved} Approved
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-danger-light text-danger">
            <XCircle size={12} /> {counts.rejected} Rejected
          </span>
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : leaves.length === 0
          ? <EmptyState message="No leave requests yet" icon={FileText} />
          : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <LeaveCard key={l.id} leave={l} />
              ))}
            </div>
          )
      }

      {/* Apply modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Apply for Leave">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className={`input ${errors.start_date ? 'border-danger' : ''}`}
                value={form.start_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
              {errors.start_date && <p className="text-xs text-danger mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className={`input ${errors.end_date ? 'border-danger' : ''}`}
                value={form.end_date}
                min={form.start_date || new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
              {errors.end_date && <p className="text-xs text-danger mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea
              className={`input resize-none h-24 ${errors.reason ? 'border-danger' : ''}`}
              placeholder="Briefly explain the reason for leave..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            {errors.reason && <p className="text-xs text-danger mt-1">{errors.reason}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

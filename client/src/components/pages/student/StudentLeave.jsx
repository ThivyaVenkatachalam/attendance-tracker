import { useEffect, useState } from 'react';
import { useLeaveStore } from '@/store/leaveStore';
import { Badge, Spinner, EmptyState, Modal } from '@/components/shared';
import { PlusCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentLeave() {
  const { leaves, loading, fetchMyLeaves, applyLeave } = useLeaveStore();
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({ start_date: '', end_date: '', reason: '' });
  const [errors,    setErrors]    = useState({});
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Leave Requests</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={16} /> Apply for Leave
        </button>
      </div>

      {loading
        ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : leaves.length === 0
          ? <EmptyState message="No leave requests yet" icon={FileText} />
          : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <div key={l.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge label={l.status} variant={l.status} />
                        <span className="text-sm text-neutral-500">
                          {format(new Date(l.start_date), 'dd MMM')} →{' '}
                          {format(new Date(l.end_date),   'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">{l.reason}</p>
                    </div>
                    <p className="text-xs text-neutral-400 shrink-0">
                      {format(new Date(l.created_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
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

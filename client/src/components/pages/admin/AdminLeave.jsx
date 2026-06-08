import { useEffect, useState } from 'react';
import { useLeaveStore } from '@/store/leaveStore';
import { useAuthStore } from '@/store/authStore';
import { Badge, Spinner, EmptyState, ConfirmDialog } from '@/components/shared';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminLeave() {
  const { leaves, loading, fetchAll, reviewLeave } = useLeaveStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('pending');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchAll({ status: filter }); }, [filter]);

  const tabs = ['pending', 'approved', 'rejected'];

  // Only admin can approve/reject
  const getActions = (leave) => {
    if (user?.role !== 'admin') return [];
    if (leave.status !== 'pending') return [];
    return [
      { action: 'approved', label: 'Approve', icon: CheckCircle, className: 'btn-success' },
      { action: 'rejected', label: 'Reject', icon: XCircle, className: 'btn-danger' },
    ];
  };

  const handleReview = async () => {
    if (!confirm) return;
    await reviewLeave(confirm.id, confirm.action);
    fetchAll({ status: filter });
  };

  const confirmTitle = confirm?.action === 'approved' ? 'Approve Leave' : 'Reject Leave';
  const confirmLabel = confirm?.action === 'approved' ? 'Yes, Approve' : 'Yes, Reject';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {user?.role === 'hod' ? 'Leave Requests' : 'Leave Requests'}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {user?.role === 'admin'
            ? 'Review and approve or reject student leave requests.'
            : 'View leave requests from your department students.'}
        </p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto">
        {tabs.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors
              ${filter === s
                ? 'border-primary text-primary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading
        ? <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        : leaves.length === 0
          ? <EmptyState message={`No ${filter} leave requests`} icon={FileText} />
          : (
            <div className="space-y-3">
              {leaves.map((leave) => {
                const actions = getActions(leave);
                return (
                  <div key={leave.id} className="card p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <p className="font-medium text-neutral-900">{leave.student_name}</p>
                          <Badge label={leave.status} variant={leave.status} />
                        </div>
                        <p className="text-sm text-neutral-500 mb-1">
                          {leave.roll_no} | {leave.department} Sem {leave.semester}
                        </p>
                        <p className="text-sm text-neutral-600 mb-2">
                          {format(new Date(leave.start_date), 'dd MMM yyyy')} to{' '}
                          {format(new Date(leave.end_date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-sm text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                          {leave.reason}
                        </p>
                      </div>

                      {actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 shrink-0 lg:flex-col">
                          {actions.map(({ action, label, icon: Icon, className }) => (
                            <button
                              key={action}
                              className={`${className} text-xs py-1.5 px-3`}
                              onClick={() => setConfirm({ id: leave.id, action })}
                            >
                              <Icon size={14} /> {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      }

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleReview}
        title={confirmTitle}
        message={`Are you sure you want to ${confirm?.action} this leave request? This will update matching absence records.`}
        confirmLabel={confirmLabel}
        variant={confirm?.action === 'rejected' ? 'danger' : 'success'}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/api/dashboardApi';
import { StatCard, Spinner } from '@/components/shared';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function FacultyDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardApi.getFacultyDashboard()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data)   return <p className="text-neutral-400">Failed to load</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Faculty Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Today's Sessions"     value={data.todays_sessions}      icon={ClipboardList} color="primary" />
        <StatCard title="Attendance Submitted" value={data.attendance_submitted}  icon={CheckCircle}   color="success" />
        <StatCard title="Attendance Pending"   value={data.attendance_pending}    icon={Clock}         color="warning" />
      </div>

      {/* Today's sessions */}
      <div className="card p-5">
        <h2 className="font-semibold text-neutral-900 mb-4">Today's Sessions</h2>
        {data.sessions?.length === 0
          ? <p className="text-sm text-neutral-400">No sessions scheduled for today</p>
          : (
            <div className="space-y-3">
              {data.sessions?.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3
                     rounded-lg border border-neutral-200 hover:border-primary/40 transition-colors">
                  <div>
                    <p className="font-medium text-neutral-900">{s.subject}</p>
                    <p className="text-sm text-neutral-500">
                      {s.department} · Sem {s.semester} · {format(new Date(s.session_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <button
                    className="btn-primary text-xs py-1.5 px-3"
                    onClick={() => navigate(`/faculty/sessions/${s.id}/attendance`)}
                  >
                    {s.submitted ? 'Edit' : 'Mark Attendance'}
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

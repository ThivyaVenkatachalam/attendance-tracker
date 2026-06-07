import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axiosInstance';
import { Spinner, EmptyState, Badge } from '@/components/shared';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

export default function FacultySessions() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/attendance/sessions')
      .then(r => setSessions(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">My Sessions</h1>
      {sessions.length === 0
        ? <EmptyState message="No sessions assigned" icon={ClipboardList} />
        : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id}
                className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <p className="font-medium text-neutral-900">{s.subject}</p>
                  <p className="text-sm text-neutral-500">
                    {s.department} · Sem {s.semester} ·{' '}
                    {format(new Date(s.session_date), 'dd MMM yyyy')}
                  </p>
                  <div className="mt-1">
                    {s.attendance_submitted
                      ? <span className="badge-success">✓ Submitted</span>
                      : <span className="badge-warning">Pending</span>}
                  </div>
                </div>
                <button
                  className="btn-primary text-sm"
                  onClick={() => navigate(`/faculty/sessions/${s.id}/attendance`)}
                >
                  {s.attendance_submitted ? 'Edit' : 'Mark'}
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

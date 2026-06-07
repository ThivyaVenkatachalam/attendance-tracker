import { useEffect, useState } from 'react';
import api from '@/api/axiosInstance';
import { Spinner, EmptyState } from '@/components/shared';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/attendance/sessions')
      .then(r => setSessions(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">All Sessions</h1>
      {sessions.length === 0
        ? <EmptyState message="No sessions found" icon={ClipboardList} />
        : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  {['Date', 'Subject', 'Faculty', 'Department', 'Semester'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-neutral-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 text-neutral-600">
                      {format(new Date(s.session_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{s.subject}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.faculty_name}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.department}</td>
                    <td className="px-4 py-3 text-neutral-600">Sem {s.semester}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

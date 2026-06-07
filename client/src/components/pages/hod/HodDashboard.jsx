import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Bell, CalendarDays, ClipboardList, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState, Spinner, StatCard } from '@/components/shared';
import { portalApi } from '@/api/portalApi';

export default function HodDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    portalApi.getHod()
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sendAlerts = async () => {
    setSending(true);
    try {
      const res = await portalApi.sendLowAttendanceAlerts();
      const result = res.data.data;
      toast.success(`Alerts sent: ${result.sent.length}, skipped: ${result.skipped.length}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to send alerts');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-neutral-400">Failed to load HOD portal</p>;

  const stats = data.stats ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">HOD Portal</h1>
          <p className="text-sm text-neutral-500 mt-1">{data.department}</p>
        </div>
        <button className="btn-primary" onClick={sendAlerts} disabled={sending}>
          {sending ? <Spinner size="sm" /> : <><Bell size={16} /> Send Parent Alerts</>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={Number(stats.total_students ?? 0)} icon={Users} color="primary" />
        <StatCard title="Faculty" value={Number(stats.total_faculty ?? 0)} icon={Users} color="success" />
        <StatCard title="Sessions" value={Number(stats.total_sessions ?? 0)} icon={CalendarDays} color="warning" />
        <StatCard title="Below 75%" value={data.low_attendance_count} icon={AlertTriangle} color="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-semibold text-neutral-900 mb-4">Low Attendance Students</h2>
          {data.low_attendance?.length === 0
            ? <EmptyState message="No students below threshold" icon={AlertTriangle} />
            : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.low_attendance.map((student) => (
                  <div key={student.id} className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0">
                    <div>
                      <p className="font-medium text-neutral-900">{student.name}</p>
                      <p className="text-xs text-neutral-500">{student.roll_no} · Sem {student.semester}</p>
                    </div>
                    <span className="badge-danger">{student.attendance_pct}%</span>
                  </div>
                ))}
              </div>
            )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-neutral-900 mb-4">Recent Parent Alerts</h2>
          {data.email_logs?.length === 0
            ? <EmptyState message="No parent alerts sent yet" icon={Mail} />
            : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.email_logs.map((log) => (
                  <div key={log.id} className="border-b border-neutral-100 py-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-neutral-900">{log.student_name}</p>
                      <span className="badge-success">{log.status}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {log.parent_email} · {format(new Date(log.created_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-neutral-900 mb-4">Upcoming Sessions</h2>
        {data.upcoming_sessions?.length === 0
          ? <EmptyState message="No sessions found" icon={ClipboardList} />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.upcoming_sessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-neutral-200 p-4">
                  <p className="font-medium text-neutral-900">{session.subject}</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {format(new Date(session.session_date), 'dd MMM yyyy')} · {session.faculty_name}
                  </p>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

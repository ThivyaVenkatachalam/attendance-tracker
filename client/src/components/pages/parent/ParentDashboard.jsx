import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, ClipboardList, UserRound } from 'lucide-react';
import { EmptyState, Spinner, StatCard } from '@/components/shared';
import { portalApi } from '@/api/portalApi';

const pct = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
};

export default function ParentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getParent()
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-neutral-400">Failed to load parent portal</p>;

  const students = data.students ?? [];
  const warned = students.filter((student) => student.is_warned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Parent Portal</h1>
        <p className="text-sm text-neutral-500 mt-1">Attendance overview for linked students.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Linked Students" value={students.length} icon={UserRound} color="primary" />
        <StatCard title="Below 75%" value={warned.length} icon={AlertTriangle} color="danger" />
        <StatCard title="Recent Records" value={data.recent_records?.length ?? 0} icon={ClipboardList} color="success" />
      </div>

      {students.length === 0
        ? <EmptyState message="No students linked to this parent account" icon={UserRound} />
        : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {students.map((student) => (
              <section key={student.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-neutral-900">{student.name}</h2>
                    <p className="text-sm text-neutral-500">
                      {student.roll_no} · {student.department} Sem {student.semester}
                    </p>
                  </div>
                  <span className={student.is_warned ? 'badge-danger' : 'badge-success'}>
                    {pct(student.summary?.attendance_pct)}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Present</p>
                    <p className="text-lg font-bold text-success">{Number(student.summary?.present_count ?? 0)}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Absent</p>
                    <p className="text-lg font-bold text-danger">{Number(student.summary?.absent_count ?? 0)}</p>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Leave</p>
                    <p className="text-lg font-bold text-warning">{Number(student.summary?.leave_count ?? 0)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-neutral-800 mb-2">Subject Breakdown</p>
                  <div className="space-y-2">
                    {student.subjects?.map((subject) => (
                      <div key={subject.subject} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">{subject.subject}</span>
                        <span className={Number(subject.pct ?? 0) < 75 ? 'text-danger font-medium' : 'text-success font-medium'}>
                          {pct(subject.pct)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

      <section className="card p-5">
        <h2 className="font-semibold text-neutral-900 mb-4">Recent Attendance</h2>
        {data.recent_records?.length === 0
          ? <EmptyState message="No recent attendance records" icon={ClipboardList} />
          : (
            <div className="space-y-2">
              {data.recent_records.map((record, index) => (
                <div key={`${record.student_id}-${record.subject}-${index}`} className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0">
                  <div>
                    <p className="font-medium text-neutral-900">{record.student_name}</p>
                    <p className="text-xs text-neutral-500">
                      {record.subject} · {format(new Date(record.session_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <span className={`badge-${record.status === 'present' ? 'success' : record.status === 'leave' ? 'warning' : 'danger'}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

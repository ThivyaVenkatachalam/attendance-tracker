import { useEffect, useState } from 'react';
import { attendanceApi } from '@/api/attendanceApi';
import { EmptyState, Spinner } from '@/components/shared';
import { ClipboardList } from 'lucide-react';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export default function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attendanceApi.getMyAttendance()
      .then(r => setRecords(r.data.data.by_subject ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">My Attendance</h1>

      {records.length === 0 ? (
        <EmptyState message="No attendance records yet" icon={ClipboardList} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {['Subject', 'Total', 'Present', 'Leave', 'Absent', 'Percentage'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {records.map((r, i) => {
                const total = toNumber(r.total_sessions ?? r.total);
                const present = toNumber(r.present_count ?? r.present);
                const leave = toNumber(r.leave_count);
                const absent = toNumber(r.absent_count, Math.max(total - present - leave, 0));
                const pct = toNumber(r.attendance_pct ?? r.pct);

                return (
                  <tr key={i} className={`hover:bg-neutral-50 ${pct < 75 ? 'bg-danger-light/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-neutral-900">{r.subject}</td>
                    <td className="px-4 py-3 text-neutral-600">{total}</td>
                    <td className="px-4 py-3 text-success font-medium">{present}</td>
                    <td className="px-4 py-3 text-warning font-medium">{leave}</td>
                    <td className="px-4 py-3 text-danger font-medium">{absent}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${pct < 75 ? 'text-danger' : 'text-success'}`}>
                        {pct.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

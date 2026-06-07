import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, MapPin, Upload, Users } from 'lucide-react';
import { EmptyState, Spinner, Badge } from '@/components/shared';
import { portalApi } from '@/api/portalApi';
import { attendanceApi } from '@/api/attendanceApi';
import { useAuthStore } from '@/store/authStore';

const timeLabel = (session) => {
  if (!session.start_time) return 'Time not set';
  const end = session.end_time ? ` - ${session.end_time.slice(0, 5)}` : '';
  return `${session.start_time.slice(0, 5)}${end}`;
};

export default function TimetablePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const { user } = useAuthStore();
  const canImport = ['admin', 'hod'].includes(user?.role);

  const loadTimetable = () => {
    setLoading(true);
    portalApi.getTimetable()
      .then((res) => setSessions(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);

    try {
      const res = await attendanceApi.importTimetable(formData);
      const result = res.data.data;
      toast.success(`Imported ${result.imported} timetable sessions`);
      if (result.skipped > 0) toast.error(`${result.skipped} rows skipped`);
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Timetable import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Timetable</h1>
          <p className="text-sm text-neutral-500 mt-1">Organized sessions by date, time, subject, and faculty.</p>
        </div>
        {canImport && (
          <div className="flex flex-wrap gap-2">
            <label className="btn-primary cursor-pointer">
              {importing ? <Spinner size="sm" /> : <Upload size={16} />}
              Import Timetable
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <a href="/sample_timetable.csv" download className="btn-secondary text-sm">
              Sample CSV
            </a>
          </div>
        )}
      </div>

      {sessions.length === 0
        ? <EmptyState message="No timetable sessions found" icon={CalendarDays} />
        : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr className="text-left text-neutral-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Faculty</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sessions.map((session) => {
                  const marked = Number(session.marked_count ?? 0);
                  return (
                    <tr key={session.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-700">
                        {format(new Date(session.session_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={15} /> {timeLabel(session)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{session.subject}</td>
                      <td className="px-4 py-3 text-neutral-600">{session.faculty_name}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={15} /> {session.department} Sem {session.semester}
                        </span>
                        {session.room && (
                          <span className="ml-3 inline-flex items-center gap-1.5 text-neutral-400">
                            <MapPin size={15} /> {session.room}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={marked > 0 ? 'Marked' : 'Pending'} variant={marked > 0 ? 'approved' : 'pending'} />
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

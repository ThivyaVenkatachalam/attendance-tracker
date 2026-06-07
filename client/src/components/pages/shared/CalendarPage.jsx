import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { EmptyState, Spinner } from '@/components/shared';
import { portalApi } from '@/api/portalApi';

const timeLabel = (session) => {
  if (!session.start_time) return 'Time not set';
  const end = session.end_time ? ` - ${session.end_time.slice(0, 5)}` : '';
  return `${session.start_time.slice(0, 5)}${end}`;
};

export default function CalendarPage() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getCalendar()
      .then((res) => setDays(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Calendar</h1>
        <p className="text-sm text-neutral-500 mt-1">Daily class schedule and attendance status.</p>
      </div>

      {days.length === 0
        ? <EmptyState message="No calendar sessions found" icon={CalendarDays} />
        : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {days.map((day) => (
              <section key={day.date} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-neutral-900">{format(new Date(day.date), 'EEEE')}</p>
                    <p className="text-sm text-neutral-500">{format(new Date(day.date), 'dd MMM yyyy')}</p>
                  </div>
                  <span className="badge-neutral">{day.sessions.length} sessions</span>
                </div>

                <div className="space-y-3">
                  {day.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-neutral-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-neutral-900">{session.subject}</p>
                          <p className="text-sm text-neutral-500 mt-1">{session.faculty_name}</p>
                        </div>
                        <span className={Number(session.marked_count ?? 0) > 0 ? 'badge-success' : 'badge-warning'}>
                          {Number(session.marked_count ?? 0) > 0 ? 'Marked' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {timeLabel(session)}</span>
                        <span>{session.department} Sem {session.semester}</span>
                        {session.room && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {session.room}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '@/api/dashboardApi';
import { EmptyState, Spinner, WarningBanner } from '@/components/shared';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
} from 'lucide-react';

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function SummaryTile({ label, value, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    primary: 'bg-primary-light text-primary',
  };

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className="text-xl font-bold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

function SubjectRow({ subject }) {
  const pct = toNumber(subject.attendance_pct);
  const total = toNumber(subject.total);
  const present = toNumber(subject.present);
  const leave = toNumber(subject.leave_count);
  const absent = toNumber(subject.absent_count, Math.max(total - present - leave, 0));
  const tone = pct < 75 ? 'bg-danger' : pct < 85 ? 'bg-warning' : 'bg-success';

  return (
    <div className="py-4 border-b border-neutral-100 last:border-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900">{subject.subject}</p>
          <p className="text-sm text-neutral-500">
            {present} present, {leave} leave, {absent} absent out of {total}
          </p>
        </div>
        <div className="sm:w-64">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-neutral-500">Attendance</span>
            <span className={`font-bold ${pct < 75 ? 'text-danger' : 'text-success'}`}>
              {pct.toFixed(2)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStudentDashboard()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-neutral-400">Failed to load</p>;

  const overallPct = toNumber(data.overall_pct);
  const isWarned = overallPct < 75;
  const subjectWise = data.subject_wise ?? [];
  const attendedCount = toNumber(data.present_count) + toNumber(data.leave_count);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-neutral-500">Student Overview</p>
        <h1 className="text-2xl font-bold text-neutral-900">My Dashboard</h1>
      </div>

      {isWarned && (
        <WarningBanner message={`Your attendance is ${overallPct.toFixed(2)}%, below the required 75%.`} />
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(280px,420px)_1fr] gap-5">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-500">Overall Attendance</p>
              <p className={`text-5xl font-bold mt-2 ${isWarned ? 'text-danger' : 'text-success'}`}>
                {overallPct.toFixed(2)}%
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                {attendedCount} attended out of {data.total_sessions} classes
              </p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${isWarned ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}>
              {isWarned ? <AlertTriangle size={24} /> : <CalendarCheck size={24} />}
            </div>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden mt-6">
            <div
              className={`h-full rounded-full ${isWarned ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${Math.min(overallPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryTile label="Total Classes" value={data.total_sessions} icon={BookOpen} tone="primary" />
          <SummaryTile label="Leave Counted" value={data.leave_count} icon={FileText} tone="warning" />
          <SummaryTile label="Classes Missed" value={data.absent_count} icon={AlertTriangle} tone={data.absent_count > 0 ? 'danger' : 'neutral'} />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="font-semibold text-neutral-900">Subject Breakdown</h2>
            <Link to="/student/attendance" className="btn-secondary text-xs py-1.5 px-3">
              View Details <ArrowRight size={14} />
            </Link>
          </div>
          {subjectWise.length === 0
            ? <EmptyState message="No attendance records yet" icon={ClipboardList} />
            : subjectWise.map((subject) => <SubjectRow key={subject.subject} subject={subject} />)}
        </div>

        <div className="space-y-3">
          <Link to="/student/attendance" className="card p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
            <span className="font-medium text-neutral-900">My Attendance</span>
            <ArrowRight size={18} className="text-neutral-400" />
          </Link>
          <Link to="/student/leave" className="card p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
            <span className="font-medium text-neutral-900">Leave Requests</span>
            <ArrowRight size={18} className="text-neutral-400" />
          </Link>
        </div>
      </section>
    </div>
  );
}

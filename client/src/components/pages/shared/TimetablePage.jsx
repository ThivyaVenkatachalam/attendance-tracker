import { useEffect, useMemo, useState } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock,
  Download, MapPin, Plus, Upload, Users,
} from 'lucide-react';
import api from '@/api/axiosInstance';
import { attendanceApi } from '@/api/attendanceApi';
import { portalApi } from '@/api/portalApi';
import { useAuthStore } from '@/store/authStore';
import { EmptyState, Modal, Spinner } from '@/components/shared';

// Fixed time slots per subject
const SUBJECT_TIMES = {
  'Engineering Mathematics I':  { start: '08:00', end: '09:00', room: 'Hall A'       },
  'Programming in C':           { start: '09:00', end: '10:00', room: 'Lab 1'        },
  'Engineering Physics':        { start: '10:00', end: '11:00', room: 'Hall B'       },
  'Engineering Chemistry':      { start: '11:00', end: '12:00', room: 'Hall C'       },
  'Basic Electronics':          { start: '09:00', end: '10:00', room: 'Lab 2'        },
  'Engineering Mechanics':      { start: '10:00', end: '11:00', room: 'Hall D'       },
  'Engineering Drawing':        { start: '14:00', end: '16:00', room: 'Drawing Hall' },
  'Data Structures':            { start: '09:00', end: '10:00', room: 'CS101'        },
  'Database Management':        { start: '10:00', end: '11:00', room: 'CS102'        },
  'Computer Organization':      { start: '11:00', end: '12:00', room: 'CS103'        },
  'Discrete Mathematics':       { start: '14:00', end: '15:00', room: 'Hall A'       },
  'Circuit Theory':             { start: '09:00', end: '10:00', room: 'EC101'        },
  'Signals and Systems':        { start: '10:00', end: '11:00', room: 'EC102'        },
  'Digital Electronics':        { start: '11:00', end: '12:00', room: 'EC Lab'       },
  'Thermodynamics':             { start: '09:00', end: '10:00', room: 'ME101'        },
  'Fluid Mechanics':            { start: '10:00', end: '11:00', room: 'ME102'        },
  'Manufacturing Processes':    { start: '14:00', end: '16:00', room: 'Workshop'     },
  'Operating Systems':          { start: '09:00', end: '10:00', room: 'CS201'        },
  'Computer Networks':          { start: '10:00', end: '11:00', room: 'CS202'        },
  'Software Engineering':       { start: '11:00', end: '12:00', room: 'CS203'        },
  'Theory of Computation':      { start: '14:00', end: '15:00', room: 'CS204'        },
  'VLSI Design':                { start: '09:00', end: '10:00', room: 'EC Lab'       },
  'Microprocessors':            { start: '10:00', end: '11:00', room: 'EC201'        },
  'Communication Systems':      { start: '11:00', end: '12:00', room: 'EC202'        },
  'Heat Transfer':              { start: '09:00', end: '10:00', room: 'ME201'        },
  'Machine Design':             { start: '10:00', end: '11:00', room: 'ME202'        },
  'Industrial Engineering':     { start: '14:00', end: '15:00', room: 'ME203'        },
  'Machine Learning':           { start: '09:00', end: '10:00', room: 'CS301'        },
  'Cloud Computing':            { start: '10:00', end: '11:00', room: 'CS302'        },
  'Information Security':       { start: '11:00', end: '12:00', room: 'CS303'        },
  'Project Work':               { start: '14:00', end: '17:00', room: 'Project Lab'  },
  'Embedded Systems':           { start: '09:00', end: '10:00', room: 'EC301'        },
  'Wireless Networks':          { start: '10:00', end: '11:00', room: 'EC302'        },
};

const ALL_SLOTS = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00'];

function resolveTime(session) {
  if (session.start_time) return {
    start: session.start_time.slice(0, 5),
    end:   session.end_time?.slice(0, 5) ?? null,
    room:  session.room ?? null,
  };
  return SUBJECT_TIMES[session.subject] ?? { start: '09:00', end: '10:00', room: null };
}

const DEPT_STYLES = {
  'Computer Science': { border: '#0284C7', bg: '#E0F2FE' },
  'Electronics':      { border: '#16A34A', bg: '#DCFCE7' },
  'Mechanical':       { border: '#D97706', bg: '#FEF3C7' },
};

const emptyForm = {
  subject: '', faculty_id: '', department: '', semester: '3',
  session_date: format(new Date(), 'yyyy-MM-dd'),
  start_time: '09:00', end_time: '10:00', room: '',
};

const getSessionDate = (s) => new Date(s.session_date);
const getMonday      = (d) => startOfWeek(d, { weekStartsOn: 1 });
const isInWeek       = (s, w) =>
  Array.from({ length: 5 }, (_, i) => addDays(w, i))
    .some((d) => isSameDay(getSessionDate(s), d));

const preferredWeek = (sessions) => {
  const cur = getMonday(new Date());
  if (sessions.some((s) => isInWeek(s, cur))) return cur;
  if (!sessions.length) return cur;
  const sorted = [...sessions].sort((a, b) => getSessionDate(a) - getSessionDate(b));
  const up = sorted.find((s) => getSessionDate(s) >= new Date());
  return getMonday(getSessionDate(up ?? sorted[sorted.length - 1]));
};

function SessionCard({ session }) {
  const marked = Number(session.marked_count ?? 0);
  const { start, end, room } = resolveTime(session);
  const style = DEPT_STYLES[session.department] ?? { border: '#9CA3AF', bg: '#F3F4F6' };

  return (
    <div style={{
      borderLeft: `3px solid ${style.border}`,
      background: style.bg,
      borderRadius: '6px',
      padding: '6px 8px',
      marginBottom: '4px',
      fontSize: '11px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: '#111827', lineHeight: 1.3, fontSize: '11px' }}>
          {session.subject}
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '1px 5px',
          borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0,
          background: marked > 0 ? '#DCFCE7' : '#FEF3C7',
          color:      marked > 0 ? '#16A34A' : '#D97706',
        }}>
          {marked > 0 ? '✓ Done' : '○ Pending'}
        </span>
      </div>
      <div style={{ color: '#6B7280', marginTop: '3px', lineHeight: 1.6 }}>
        <div>🕐 {start}{end ? `–${end}` : ''}</div>
        <div>👤 {session.faculty_name ?? 'TBA'}</div>
        {room && <div>📍 {room}</div>}
        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
          {session.department} · Sem {session.semester}
        </div>
      </div>
    </div>
  );
}

export default function TimetablePage() {
  const [sessions,   setSessions]   = useState([]);
  const [faculty,    setFaculty]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [importing,  setImporting]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState(emptyForm);
  const [activeWeek, setActiveWeek] = useState(getMonday(new Date()));
  const [filterDept, setFilterDept] = useState('All');
  const { user } = useAuthStore();
  const canImport = ['admin', 'hod'].includes(user?.role);
  const canAdd    = user?.role === 'admin';

  const loadTimetable = (targetWeek = null) => {
    setLoading(true);
    portalApi.getTimetable()
      .then((res) => {
        const rows = Array.isArray(res.data.data) ? res.data.data : [];
        setSessions(rows);
        if (targetWeek) { setActiveWeek(targetWeek); return; }
        setActiveWeek((cur) =>
          rows.some((s) => isInWeek(s, cur)) ? cur : preferredWeek(rows)
        );
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTimetable(); }, []);
  useEffect(() => {
    if (!canAdd) return;
    api.get('/users/faculty')
      .then((res) => setFaculty(res.data.data?.faculty ?? []))
      .catch(() => setFaculty([]));
  }, [canAdd]);

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(activeWeek, i)),
    [activeWeek]
  );

  const departments = useMemo(() => {
    const d = [...new Set(sessions.map((s) => s.department).filter(Boolean))];
    return ['All', ...d];
  }, [sessions]);

  const weekSessions = useMemo(() => {
    let f = sessions.filter((s) => isInWeek(s, activeWeek));
    if (filterDept !== 'All') f = f.filter((s) => s.department === filterDept);
    return f;
  }, [sessions, activeWeek, filterDept]);

  const activeSlots = useMemo(() => {
    const used = new Set(weekSessions.map((s) => resolveTime(s).start));
    return ALL_SLOTS.filter((t) => used.has(t));
  }, [weekSessions]);

  const sessionsForCell = (day, slot) =>
    weekSessions.filter((s) =>
      isSameDay(getSessionDate(s), day) && resolveTime(s).start === slot
    );

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setImporting(true);
    try {
      const res = await attendanceApi.importTimetable(fd);
      toast.success(`Imported ${res.data.data.imported} sessions`);
      loadTimetable();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Import failed');
    } finally { setImporting(false); }
  };

  const updateForm = (field, value) => {
    setForm((cur) => {
      const next = { ...cur, [field]: value };
      if (field === 'faculty_id') {
        const f = faculty.find((x) => String(x.id) === value);
        if (f?.department) next.department = f.department;
      }
      if (field === 'subject' && SUBJECT_TIMES[value]) {
        next.start_time = SUBJECT_TIMES[value].start;
        next.end_time   = SUBJECT_TIMES[value].end;
        next.room       = SUBJECT_TIMES[value].room;
      }
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await attendanceApi.createSession({
        ...form, semester: Number(form.semester),
        start_time: form.start_time || null,
        end_time:   form.end_time   || null,
        room:       form.room       || null,
      });
      toast.success('Session added');
      setModalOpen(false);
      setForm(emptyForm);
      loadTimetable(getMonday(new Date(form.session_date)));
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Could not add session');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const COL_W = 160; // px per day column
  const TIME_W = 80; // px for time column
  const totalW = TIME_W + COL_W * 5;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Timetable</h1>
          <p className="text-sm text-neutral-500 mt-1">Weekly class schedule — Monday to Friday.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setActiveWeek((d) => addDays(d, -7))}>
            <ChevronLeft size={16} /> Previous
          </button>
          <button className="btn-secondary" onClick={() => setActiveWeek(getMonday(new Date()))}>
            This Week
          </button>
          <button className="btn-secondary" onClick={() => setActiveWeek((d) => addDays(d, 7))}>
            Next <ChevronRight size={16} />
          </button>
          {canAdd && (
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add Session
            </button>
          )}
          {canImport && (
            <label className="btn-primary cursor-pointer">
              {importing ? <Spinner size="sm" /> : <Upload size={16} />} Import
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          )}
          {canImport && (
            <a href="/sample_timetable.csv" download className="btn-secondary text-sm">
              <Download size={16} /> Sample
            </a>
          )}
        </div>
      </div>

      {/* Dept filter */}
      <div className="flex gap-2 flex-wrap">
        {departments.map((d) => (
          <button key={d} onClick={() => setFilterDept(d)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filterDept === d
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-primary'
              }`}>
            {d}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-neutral-500 flex-wrap items-center">
        {Object.entries(DEPT_STYLES).map(([dept, s]) => (
          <span key={dept} className="flex items-center gap-1.5">
            <span style={{ width:12, height:12, borderRadius:3, background:s.bg, borderLeft:`3px solid ${s.border}`, display:'inline-block' }} />
            {dept}
          </span>
        ))}
        <span className="ml-2 flex items-center gap-1" style={{ color:'#16A34A' }}>✓ Marked</span>
        <span className="flex items-center gap-1" style={{ color:'#D97706' }}>○ Pending</span>
      </div>

      {/* Week info bar */}
      <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded-lg px-4 py-2.5 border border-neutral-200 dark:border-neutral-700">
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white text-sm">
            {format(activeWeek, 'dd MMM')} – {format(addDays(activeWeek, 4), 'dd MMM yyyy')}
          </span>
          <span className="ml-3 text-xs text-neutral-500">{weekSessions.length} sessions this week</span>
        </div>
        <CalendarDays size={18} className="text-neutral-400" />
      </div>

      {/* THE GRID — inline styles to guarantee correct layout */}
      <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#fff' }}>
        <div style={{ minWidth: `${totalW}px` }}>

          {/* Day headers row */}
          <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' }}>
            <div style={{ width: TIME_W, flexShrink: 0, padding: '10px 12px',
              fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase',
              borderRight: '1px solid #E5E7EB' }}>
              Time
            </div>
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} style={{
                  width: COL_W, flexShrink: 0, padding: '10px 12px',
                  borderLeft: '1px solid #E5E7EB',
                  background: isToday ? '#EFF6FF' : 'transparent',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700,
                    color: isToday ? '#0284C7' : '#111827' }}>
                    {format(day, 'EEE')}
                    {isToday && (
                      <span style={{ marginLeft: 6, fontSize: '9px', background: '#0284C7',
                        color: '#fff', borderRadius: '10px', padding: '1px 6px' }}>
                        Today
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: isToday ? '#0284C7' : '#6B7280', marginTop: 2 }}>
                    {format(day, 'dd MMM')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slot rows */}
          {activeSlots.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
              No sessions scheduled for this week
            </div>
          ) : activeSlots.map((slot, rowIdx) => (
            <div key={slot} style={{
              display: 'flex',
              borderBottom: rowIdx < activeSlots.length - 1 ? '1px solid #F3F4F6' : 'none',
              background: slot === '12:00' ? '#FFFBEB' : '#fff',
            }}>
              {/* Time label */}
              <div style={{
                width: TIME_W, flexShrink: 0, padding: '10px 8px',
                background: '#F9FAFB', borderRight: '1px solid #E5E7EB',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{slot}</span>
                {slot === '12:00' && (
                  <span style={{ fontSize: '9px', color: '#D97706', fontWeight: 600, marginTop: 2 }}>LUNCH</span>
                )}
              </div>

              {/* Day cells */}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                const cells   = sessionsForCell(day, slot);
                return (
                  <div key={`${day.toISOString()}-${slot}`} style={{
                    width: COL_W, flexShrink: 0, minHeight: 90, padding: '6px',
                    borderLeft: '1px solid #F3F4F6',
                    background: isToday ? '#F0F9FF' : 'transparent',
                  }}>
                    {cells.length === 0 ? (
                      slot === '12:00' ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '11px', color: '#D1D5DB' }}>—</div>
                      ) : (
                        <div style={{ height: '100%', minHeight: 78, border: '1px dashed #E5E7EB', borderRadius: 6 }} />
                      )
                    ) : cells.map((s) => <SessionCard key={s.id} session={s} />)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add session modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Session" size="lg">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Subject</label>
              <input className="input" value={form.subject}
                onChange={(e) => updateForm('subject', e.target.value)} required />
            </div>
            <div>
              <label className="label">Faculty</label>
              <select className="input" value={form.faculty_id}
                onChange={(e) => updateForm('faculty_id', e.target.value)} required>
                <option value="">Select faculty</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.department}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department}
                onChange={(e) => updateForm('department', e.target.value)} required />
            </div>
            <div>
              <label className="label">Semester</label>
              <select className="input" value={form.semester}
                onChange={(e) => updateForm('semester', e.target.value)} required>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.session_date}
                onChange={(e) => updateForm('session_date', e.target.value)} required />
            </div>
            <div>
              <label className="label">Room</label>
              <input className="input" value={form.room} placeholder="CS101"
                onChange={(e) => updateForm('room', e.target.value)} />
            </div>
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={form.start_time}
                onChange={(e) => updateForm('start_time', e.target.value)} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="time" className="input" value={form.end_time}
                onChange={(e) => updateForm('end_time', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Plus size={16} />} Add Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

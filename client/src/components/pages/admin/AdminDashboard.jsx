import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, AlertTriangle, ClipboardList, Download, FileText, Upload, Bell } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { attendanceApi } from '@/api/attendanceApi';
import { dashboardApi } from '@/api/dashboardApi';
import { portalApi } from '@/api/portalApi';
import { StatCard, Spinner, WarningBanner } from '@/components/shared';

const COLORS = ['#4F46E5', '#DC2626', '#D97706'];

export default function AdminDashboard() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [sending,      setSending]      = useState(false);
  const fileInputRef = useRef(null);

  const loadDashboard = () => {
    setLoading(true);
    dashboardApi.getAdminDashboard()
      .then((response) => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please choose a CSV file');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setImportResult(null);
    try {
      const response = await attendanceApi.importCSV(formData);
      const result = response.data.data;
      setImportResult(result);
      toast.success(`Imported ${result.imported} attendance records`);
      loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'CSV import failed');
    } finally {
      setUploading(false);
    }
  };

  const sendAlerts = async () => {
    setSending(true);
    try {
      const res = await portalApi.sendLowAttendanceAlerts();
      const result = res.data.data;
      if (result.sent.length > 0) {
        toast.success(`✅ ${result.sent.length} parent alert${result.sent.length > 1 ? 's' : ''} sent successfully`);
      } else if (result.skipped.length > 0) {
        toast(`⏭️ ${result.skipped.length} already notified today`, { icon: 'ℹ️' });
      } else {
        toast('No students below 75% with linked parents', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to send alerts');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data)   return <p className="text-neutral-400">Failed to load dashboard</p>;

  const total = (data.present_count ?? 0) + (data.absent_count ?? 0) + (data.leave_count ?? 0);
  const pieData = [
    { name: 'Present',  value: data.present_count, pct: total ? ((data.present_count / total) * 100).toFixed(1) : 0 },
    { name: 'Absent',   value: data.absent_count,  pct: total ? ((data.absent_count  / total) * 100).toFixed(1) : 0 },
    { name: 'On Leave', value: data.leave_count,   pct: total ? ((data.leave_count   / total) * 100).toFixed(1) : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor attendance and manage records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Send Alerts button */}
          <button
            className="btn-primary"
            onClick={sendAlerts}
            disabled={sending}
          >
            {sending ? <Spinner size="sm" /> : <Bell size={16} />}
            {sending ? 'Sending...' : 'Send Parent Alerts'}
          </button>

          {/* Import CSV */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Spinner size="sm" /> : <Upload size={16} />}
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
            disabled={uploading}
          />
          <a href="/sample_attendance.csv" download className="btn-secondary text-sm">
            <Download size={16} /> Sample
          </a>
        </div>
      </div>

      <WarningBanner message="CSV must include roll_no or student_id, session_id, and status. Accepted statuses are present, absent, and leave." />

      {/* Alert info banner */}
      {data.below_75_count > 0 && (
        <div className="card p-4 border-l-4 border-warning bg-warning-light/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning shrink-0" />
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {data.below_75_count} student{data.below_75_count > 1 ? 's' : ''} below 75% attendance
              </p>
              <p className="text-xs text-neutral-500">Click "Send Parent Alerts" to notify their parents by email.</p>
            </div>
          </div>
          <button
            className="btn-primary text-xs py-1.5 px-3 shrink-0"
            onClick={sendAlerts}
            disabled={sending}
          >
            {sending ? <Spinner size="sm" /> : <Bell size={13} />}
            Notify Now
          </button>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-semibold text-neutral-900">Import Summary</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Imported {importResult.imported} records, skipped {importResult.skipped}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge-success">{importResult.imported} imported</span>
              <span className="badge-warning">{importResult.skipped} skipped</span>
              <span className="badge-danger">{importResult.errors?.length ?? 0} errors</span>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <div className="mt-3 max-h-36 overflow-y-auto space-y-1">
              {importResult.errors.slice(0, 6).map((error, index) => (
                <p key={index} className="text-sm text-danger bg-danger-light rounded px-3 py-2">
                  Row {error.row}: {error.reason || error.message || 'Could not import this row'}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students"      value={data.total_students}       icon={Users}          color="primary"  />
        <StatCard title="Overall Attendance"  value={`${data.overall_pct}%`}    icon={ClipboardList}  color="success"  />
        <StatCard title="Below 75%"           value={data.below_75_count}       icon={AlertTriangle}  color="danger"   />
        <StatCard title="Pending Leave"       value={data.pending_leave_count}  icon={FileText}       color="warning"  />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">Overall Attendance Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ pct }) => `${pct}%`}
              >
                {pieData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${props.payload.pct}% (${value} records)`, name]} />
              <Legend formatter={(value, entry) => `${value} (${entry.payload.pct}%)`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">
            Students Below 75%
            <span className="ml-2 text-xs font-normal text-danger">({data.warned_students?.length} students)</span>
          </h2>
          {data.warned_students?.length === 0 ? (
            <p className="text-sm text-neutral-400">All students are above threshold</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.warned_students?.map((student) => (
                <div key={student.student_id}
                  className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{student.name}</p>
                    <p className="text-xs text-neutral-400">{student.roll_no} — {student.department}</p>
                  </div>
                  <span className="badge-danger">{student.overall_attendance_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, AlertTriangle, ClipboardList, Download, FileText, Upload } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { attendanceApi } from '@/api/attendanceApi';
import { dashboardApi } from '@/api/dashboardApi';
import { StatCard, Spinner, WarningBanner } from '@/components/shared';

const COLORS = ['#4F46E5', '#DC2626', '#D97706'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadDashboard = () => {
    setLoading(true);
    dashboardApi.getAdminDashboard()
      .then((response) => setData(response.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-neutral-400">Failed to load dashboard</p>;

  const pieData = [
    { name: 'Present', value: data.present_count },
    { name: 'Absent', value: data.absent_count },
    { name: 'On Leave', value: data.leave_count },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor attendance and import approved CSV records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={data.total_students} icon={Users} color="primary" />
        <StatCard title="Overall Attendance" value={`${data.overall_pct}%`} icon={ClipboardList} color="success" />
        <StatCard title="Below 75%" value={data.below_75_count} icon={AlertTriangle} color="danger" />
        <StatCard title="Pending Leave" value={data.pending_leave_count} icon={FileText} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-neutral-900 mb-4">Overall Attendance Breakdown</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                {pieData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-neutral-900 mb-4">
            Students Below 75%
            <span className="ml-2 text-xs font-normal text-danger">({data.warned_students?.length} students)</span>
          </h2>
          {data.warned_students?.length === 0 ? (
            <p className="text-sm text-neutral-400">All students are above threshold</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.warned_students?.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{student.name}</p>
                    <p className="text-xs text-neutral-400">{student.roll_no} - {student.department}</p>
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

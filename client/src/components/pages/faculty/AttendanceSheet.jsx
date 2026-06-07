import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAttendanceStore } from '@/store/attendanceStore';
import { useDraft } from '@/hooks/useDraft';
import { ConflictResolver } from '@/components/shared/ConflictResolver';
import { Spinner, DraftBanner } from '@/components/shared';
import { Save, CheckSquare, XSquare, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['present', 'absent', 'leave'];

function printAttendanceSheet(records, sessionId) {
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const rows = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.roll_no ?? '-'}</td>
      <td>${r.student_name ?? '-'}</td>
      <td class="status ${r.status}">${r.status}</td>
    </tr>
  `).join('');

  const present = records.filter(r => r.status === 'present').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const leave   = records.filter(r => r.status === 'leave').length;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Sheet — Session ${sessionId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111; }
        .header { border-bottom: 2px solid #4F46E5; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; color: #4F46E5; }
        .header p  { font-size: 13px; color: #6B7280; margin-top: 4px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
        .summary .pill { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .pill.present { background: #DCFCE7; color: #16A34A; }
        .pill.absent  { background: #FEE2E2; color: #DC2626; }
        .pill.leave   { background: #FEF3C7; color: #D97706; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #F3F4F6; text-align: left; padding: 10px 12px;
             font-weight: 600; color: #374151; border-bottom: 2px solid #E5E7EB; }
        td { padding: 9px 12px; border-bottom: 1px solid #F3F4F6; }
        tr:last-child td { border-bottom: none; }
        .status { font-weight: 600; text-transform: capitalize; }
        .status.present { color: #16A34A; }
        .status.absent  { color: #DC2626; }
        .status.leave   { color: #D97706; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #9CA3AF; }
        .sign-box { border-top: 1px solid #D1D5DB; padding-top: 6px; min-width: 160px; text-align: center; font-size: 12px; color: #6B7280; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📋 AttendEase — Attendance Sheet</h1>
        <p>Session ID: ${sessionId} &nbsp;|&nbsp; Date: ${date} &nbsp;|&nbsp; Total Students: ${records.length}</p>
      </div>

      <div class="summary">
        <span class="pill present">✓ Present: ${present}</span>
        <span class="pill absent">✗ Absent: ${absent}</span>
        <span class="pill leave">◷ Leave: ${leave}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Roll No</th>
            <th>Student Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="footer">
        <p>Printed on ${new Date().toLocaleString('en-IN')}</p>
        <div class="sign-box">Faculty Signature</div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

export default function AttendanceSheet() {
  const { sessionId } = useParams();
  const {
    records,
    loading,
    conflict,
    loadSession,
    bulkMark,
    reloadLatest,
    retryUpdate,
    clearConflict,
  } = useAttendanceStore();

  const { restoreDraft, saveToDraft, discardDraft } = useDraft(sessionId);
  const [localRecords, setLocalRecords] = useState([]);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { loadSession(sessionId); }, [loadSession, sessionId]);

  useEffect(() => {
    if (records.length === 0) return;
    restoreDraft().then((draft) => {
      setShowDraftBanner(Boolean(draft));
      setLocalRecords(records);
      setDirty(false);
    });
  }, [records, restoreDraft]);

  useEffect(() => {
    if (dirty && localRecords.length > 0) saveToDraft(localRecords);
  }, [dirty, localRecords, saveToDraft]);

  const changedRecords = useMemo(() => {
    const serverByStudent = new Map(records.map((r) => [r.student_id, r]));
    return localRecords.filter((r) => {
      const server = serverByStudent.get(r.student_id);
      return !server || server.status !== r.status;
    });
  }, [localRecords, records]);

  const handleStatusChange = (studentId, newStatus) => {
    setLocalRecords((prev) =>
      prev.map((r) => r.student_id === studentId ? { ...r, status: newStatus } : r)
    );
    setDirty(true);
  };

  const markAll = (status) => {
    setLocalRecords((prev) => prev.map((r) => ({ ...r, status })));
    setDirty(true);
  };

  const handleSave = async () => {
    if (changedRecords.length === 0) {
      toast.success('No attendance changes to save');
      await discardDraft();
      setDirty(false);
      return;
    }
    setSaving(true);
    const result = await bulkMark(sessionId, changedRecords.map((r) => ({
      student_id: r.student_id,
      status: r.status,
      version: r.version,
    })));
    setSaving(false);
    if (result.success) {
      await discardDraft();
      setDirty(false);
    }
  };

  const handleRestoreDraft = async () => {
    const draft = await restoreDraft();
    if (draft) { setLocalRecords(draft); setDirty(true); }
    setShowDraftBanner(false);
    toast.success('Draft restored');
  };

  const handleDiscardDraft = async () => {
    await discardDraft();
    setShowDraftBanner(false);
    setLocalRecords(records);
    setDirty(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const present = localRecords.filter(r => r.status === 'present').length;
  const absent  = localRecords.filter(r => r.status === 'absent').length;
  const leave   = localRecords.filter(r => r.status === 'leave').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Attendance Sheet</h1>
        <div className="flex gap-2">
          {/* Print button */}
          <button
            className="btn-secondary text-sm"
            onClick={() => printAttendanceSheet(localRecords, sessionId)}
            disabled={localRecords.length === 0}
          >
            <Printer size={16} /> Print / Download
          </button>
          {/* Save button */}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : (
              <><Save size={16} />Save All{changedRecords.length > 0 ? ` (${changedRecords.length})` : ''}</>
            )}
          </button>
        </div>
      </div>

      {showDraftBanner && (
        <DraftBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      )}

      {/* Summary pills */}
      {localRecords.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-success-light text-success">
            ✓ Present: {present}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-danger-light text-danger">
            ✗ Absent: {absent}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-warning-light text-warning">
            ◷ Leave: {leave}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            Total: {localRecords.length}
          </span>
        </div>
      )}

      {/* Mark all buttons */}
      <div className="flex gap-2">
        <button className="btn-secondary text-sm" onClick={() => markAll('present')}>
          <CheckSquare size={16} className="text-success" /> Mark All Present
        </button>
        <button className="btn-secondary text-sm" onClick={() => markAll('absent')}>
          <XSquare size={16} className="text-danger" /> Mark All Absent
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <tr>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">#</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Roll No</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {localRecords.map((record, idx) => (
              <tr key={record.student_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-3 text-neutral-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3 font-mono text-neutral-500 dark:text-neutral-400">{record.roll_no}</td>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">{record.student_name}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(record.student_id, status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                          ${record.status === status
                            ? status === 'present' ? 'bg-success text-white border-success'
                            : status === 'absent'  ? 'bg-danger text-white border-danger'
                            : 'bg-warning text-white border-warning'
                            : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-600 hover:border-neutral-400'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConflictResolver
        conflict={conflict}
        showCompare={showCompare}
        onReload={() => { setShowCompare(false); reloadLatest(sessionId); setDirty(false); }}
        onRetry={() => { setShowCompare(false); retryUpdate(conflict?.recordId, conflict?.attempted?.status); }}
        onCompare={() => setShowCompare((v) => !v)}
        onDismiss={() => { setShowCompare(false); clearConflict(); }}
      />
    </div>
  );
}

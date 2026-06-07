import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAttendanceStore } from '@/store/attendanceStore';
import { useDraft } from '@/hooks/useDraft';
import { ConflictResolver } from '@/components/shared/ConflictResolver';
import { Spinner, DraftBanner } from '@/components/shared';
import { Save, CheckSquare, XSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['present', 'absent', 'leave'];

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

  useEffect(() => {
    loadSession(sessionId);
  }, [loadSession, sessionId]);

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
    const serverByStudent = new Map(records.map((record) => [record.student_id, record]));
    return localRecords.filter((record) => {
      const serverRecord = serverByStudent.get(record.student_id);
      return !serverRecord || serverRecord.status !== record.status;
    });
  }, [localRecords, records]);

  const handleStatusChange = (studentId, newStatus) => {
    setLocalRecords((prev) =>
      prev.map((record) =>
        record.student_id === studentId ? { ...record, status: newStatus } : record
      )
    );
    setDirty(true);
  };

  const markAll = (status) => {
    setLocalRecords((prev) => prev.map((record) => ({ ...record, status })));
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
    const result = await bulkMark(sessionId, changedRecords.map((record) => ({
      student_id: record.student_id,
      status: record.status,
      version: record.version,
    })));
    setSaving(false);

    if (result.success) {
      await discardDraft();
      setDirty(false);
    }
  };

  const handleRestoreDraft = async () => {
    const draft = await restoreDraft();
    if (draft) {
      setLocalRecords(draft);
      setDirty(true);
    }
    setShowDraftBanner(false);
    toast.success('Draft restored');
  };

  const handleDiscardDraft = async () => {
    await discardDraft();
    setShowDraftBanner(false);
    setLocalRecords(records);
    setDirty(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Attendance Sheet</h1>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Save size={16} />
              Save All{changedRecords.length > 0 ? ` (${changedRecords.length})` : ''}
            </>
          )}
        </button>
      </div>

      {showDraftBanner && (
        <DraftBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
      )}

      <div className="flex gap-2">
        <button className="btn-secondary text-sm" onClick={() => markAll('present')}>
          <CheckSquare size={16} className="text-success" /> Mark All Present
        </button>
        <button className="btn-secondary text-sm" onClick={() => markAll('absent')}>
          <XSquare size={16} className="text-danger" /> Mark All Absent
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Roll No</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-neutral-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {localRecords.map((record) => (
              <tr key={record.student_id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-mono text-neutral-500">{record.roll_no}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{record.student_name}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(record.student_id, status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                          ${record.status === status
                            ? status === 'present' ? 'bg-success text-white border-success'
                            : status === 'absent' ? 'bg-danger text-white border-danger'
                            : 'bg-warning text-white border-warning'
                            : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
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
        onReload={() => {
          setShowCompare(false);
          reloadLatest(sessionId);
          setDirty(false);
        }}
        onRetry={() => {
          setShowCompare(false);
          retryUpdate(conflict?.recordId, conflict?.attempted?.status);
        }}
        onCompare={() => setShowCompare((value) => !value)}
        onDismiss={() => {
          setShowCompare(false);
          clearConflict();
        }}
      />
    </div>
  );
}

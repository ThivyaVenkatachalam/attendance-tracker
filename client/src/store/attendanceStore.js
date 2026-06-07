import { create } from 'zustand';
import { attendanceApi } from '@/api/attendanceApi';
import toast from 'react-hot-toast';

export const useAttendanceStore = create((set, get) => ({
  records:       [],    // current session's records
  loading:       false,
  conflict:      null,  // { recordId, latest } when 409 occurs
  importResult:  null,  // CSV import summary

  // ── Load session records ───────────────────────────────────
  loadSession: async (sessionId) => {
    set({ loading: true });
    try {
      const { data } = await attendanceApi.getBySession(sessionId);
      set({ records: data.data.records ?? [], loading: false });
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to load attendance records');
      set({ records: [], loading: false });
    }
  },

  // ── Update single record (OCC) ─────────────────────────────
  updateRecord: async (id, status, version) => {
    try {
      const { data } = await attendanceApi.update(id, { status, version });
      // Update local record with new version
      set((state) => ({
        records: state.records.map((r) =>
          r.id === id ? { ...r, ...data.data } : r
        ),
      }));
      toast.success('Attendance updated');
      return { success: true };
    } catch (err) {
      if (err.response?.status === 409) {
        const latest = err.response.data.error.latest;
        const attempted = err.response.data.error.attempted ?? { status, version };
        set({ conflict: { recordId: id, latest, attempted } });
        return { success: false, conflict: true };
      }
      toast.error(err.response?.data?.error?.message ?? 'Update failed');
      return { success: false };
    }
  },

  // ── Bulk mark ─────────────────────────────────────────────
  bulkMark: async (sessionId, records) => {
    set({ loading: true });
    try {
      await attendanceApi.bulkMark(sessionId, records);
      await get().loadSession(sessionId);
      set({ loading: false });
      toast.success('Attendance saved for all students');
      return { success: true };
    } catch (err) {
      set({ loading: false });
      if (err.response?.status === 409) {
        const latest = err.response.data.error.latest;
        const attempted = err.response.data.error.attempted;
        set({
          conflict: {
            recordId: latest?.id,
            latest,
            attempted,
            sessionId,
          },
        });
        toast.error('Attendance conflict detected. Choose how to resolve it.');
        return { success: false, conflict: true };
      }
      toast.error(err.response?.data?.error?.message ?? 'Bulk save failed');
      return { success: false };
    }
  },

  // ── Resolve conflict ───────────────────────────────────────
  reloadLatest: async (sessionId) => {
    await get().loadSession(sessionId);
    set({ conflict: null });
  },

  retryUpdate: async (id, status) => {
    const latest = get().conflict?.latest;
    const attempted = get().conflict?.attempted;
    if (!latest) return;
    set({ conflict: null });
    await get().updateRecord(id ?? latest.id, status ?? attempted?.status, latest.version);
  },

  clearConflict: () => set({ conflict: null }),

  // ── CSV import ────────────────────────────────────────────
  importCSV: async (file) => {
    set({ loading: true, importResult: null });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await attendanceApi.importCSV(formData);
      set({ importResult: data.data, loading: false });
      toast.success(`Imported ${data.data.imported} records`);
    } catch (err) {
      set({ loading: false });
      toast.error(err.response?.data?.error?.message ?? 'Import failed');
    }
  },
}));

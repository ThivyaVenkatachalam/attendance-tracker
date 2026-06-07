import { create } from 'zustand';
import toast from 'react-hot-toast';
import { leaveApi } from '@/api/leaveApi';

const getApiErrorMessage = (err, fallback) => {
  const error = err.response?.data?.error;
  return error?.details?.[0]?.message ?? error?.message ?? fallback;
};

export const useLeaveStore = create((set) => ({
  leaves: [],
  loading: false,

  fetchMyLeaves: async () => {
    set({ loading: true });
    try {
      const { data } = await leaveApi.getMyLeaves();
      set({ leaves: data.data ?? [], loading: false });
    } catch (err) {
      set({ loading: false });
      toast.error(getApiErrorMessage(err, 'Failed to load leave requests'));
    }
  },

  fetchAll: async (params) => {
    set({ loading: true });
    try {
      const { data } = await leaveApi.getAll(params);
      set({ leaves: data.data ?? [], loading: false });
    } catch (err) {
      set({ loading: false });
      toast.error(getApiErrorMessage(err, 'Failed to load leave requests'));
    }
  },

  applyLeave: async (payload) => {
    try {
      const { data } = await leaveApi.apply(payload);
      const leave = data.data;
      if (leave) {
        set((state) => ({ leaves: [leave, ...state.leaves] }));
      }
      toast.success('Leave request submitted');
      return { success: true };
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to submit leave request'));
      return { success: false };
    }
  },

  reviewLeave: async (id, status, admin_note = '') => {
    try {
      const { data } = await leaveApi.review(id, { status, admin_note });
      const updatedLeave = data.data?.leave ?? data.data;
      if (updatedLeave) {
        set((state) => ({
          leaves: state.leaves.map((leave) => (leave.id === id ? updatedLeave : leave)),
        }));
      }
      toast.success(`Leave ${status}`);
      return { success: true };
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update leave request'));
      return { success: false };
    }
  },
}));

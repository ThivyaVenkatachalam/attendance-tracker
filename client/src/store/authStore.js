import { create } from 'zustand';
import { authApi } from '@/api/authApi';
import toast from 'react-hot-toast';

export const useAuthStore = create((set, get) => ({
  user:        null,
  accessToken: sessionStorage.getItem('accessToken') ?? null,
  loading:     false,
  initialized: false,

  // ── Actions ────────────────────────────────────────────────

  login: async (credentials) => {
    set({ loading: true });
    try {
      const { data } = await authApi.login(credentials);
      const { user, accessToken } = data.data;
      sessionStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, loading: false });
      toast.success(`Welcome back, ${user.name}!`);
      return { success: true, role: user.role };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.error?.message ?? 'Login failed';
      toast.error(msg);
      return { success: false };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed regardless
    } finally {
      sessionStorage.removeItem('accessToken');
      set({ user: null, accessToken: null });
    }
  },

  // Called on app mount to restore session
  initAuth: async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return set({ initialized: true });

    try {
      const { data } = await authApi.me();
      set({ user: data.data.user, accessToken: token, initialized: true });
    } catch {
      // Token invalid — try refresh
      try {
        const { data } = await authApi.refresh();
        sessionStorage.setItem('accessToken', data.data.accessToken);
        const me = await authApi.me();
        set({ user: me.data.data.user, accessToken: data.data.accessToken, initialized: true });
      } catch {
        sessionStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, initialized: true });
      }
    }
  },

  setUser: (user) => set({ user }),
}));

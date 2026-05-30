import { defineStore } from 'pinia';
import { authApi } from '@/services/api';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/services/http';
import type { AuthUser } from '@/shared/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.user,
    can: (s) => (permission: string) => s.user?.permissions.includes(permission) ?? false,
    hasRole:
      (s) =>
      (...roles: string[]) =>
        s.user ? roles.includes(s.user.role) : false,
  },
  actions: {
    persistTokens(accessToken: string, refreshToken: string) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

    async login(email: string, password: string) {
      this.loading = true;
      try {
        const res = await authApi.login({ email, password });
        this.persistTokens(res.accessToken, res.refreshToken);
        this.user = res.user;
        return res.user;
      } finally {
        this.loading = false;
      }
    },

    async register(name: string, email: string, password: string) {
      this.loading = true;
      try {
        const res = await authApi.register({ name, email, password });
        this.persistTokens(res.accessToken, res.refreshToken);
        this.user = res.user;
        return res.user;
      } finally {
        this.loading = false;
      }
    },

    async restoreSession() {
      if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
      try {
        const me = (await authApi.me()) as unknown as {
          userId: string;
          email: string;
          role: AuthUser['role'];
          businessId: string | null;
          permissions: string[];
        };
        this.user = {
          id: me.userId,
          name: me.email,
          email: me.email,
          role: me.role,
          businessId: me.businessId,
          permissions: me.permissions,
        };
      } catch {
        this.logout();
      }
    },

    logout() {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      this.user = null;
    },
  },
});

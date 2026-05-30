import { defineStore } from 'pinia';
import { menuApi } from '@/services/api';
import type { MenuCategory, MenuItem } from '@/shared/types';

export const useMenuStore = defineStore('menu', {
  state: () => ({
    categories: [] as MenuCategory[],
    items: [] as MenuItem[],
    loading: false,
  }),
  getters: {
    itemsByCategory: (s) => (categoryId: string) =>
      s.items.filter((i) => i.categoryId === categoryId),
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        [this.categories, this.items] = await Promise.all([menuApi.categories(), menuApi.items()]);
      } finally {
        this.loading = false;
      }
    },
    async createCategory(body: Record<string, unknown>) {
      this.categories.push(await menuApi.createCategory(body));
    },
    async updateCategory(id: string, body: Record<string, unknown>) {
      const updated = await menuApi.updateCategory(id, body);
      const idx = this.categories.findIndex((c) => c.id === id);
      if (idx >= 0) this.categories[idx] = updated;
    },
    async removeCategory(id: string) {
      await menuApi.removeCategory(id);
      this.categories = this.categories.filter((c) => c.id !== id);
    },
    async createItem(body: Record<string, unknown>) {
      this.items.push(await menuApi.createItem(body));
    },
    async updateItem(id: string, body: Record<string, unknown>) {
      const updated = await menuApi.updateItem(id, body);
      const idx = this.items.findIndex((i) => i.id === id);
      if (idx >= 0) this.items[idx] = updated;
    },
    async removeItem(id: string) {
      await menuApi.removeItem(id);
      this.items = this.items.filter((i) => i.id !== id);
    },
  },
});

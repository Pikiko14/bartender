import { defineStore } from 'pinia';
import { tablesApi } from '@/services/api';
import type { TableEntity } from '@/shared/types';

export const useTablesStore = defineStore('tables', {
  state: () => ({
    tables: [] as TableEntity[],
  }),
  actions: {
    async fetchAll() {
      this.tables = await tablesApi.list();
    },
    async create(number: number, name?: string) {
      this.tables.push(await tablesApi.create({ number, name }));
    },
    async remove(id: string) {
      await tablesApi.remove(id);
      this.tables = this.tables.filter((t) => t.id !== id);
    },
    qrObjectUrl(id: string) {
      return tablesApi.qrObjectUrl(id);
    },
  },
});

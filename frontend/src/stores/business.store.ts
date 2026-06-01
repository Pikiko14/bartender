import { defineStore } from 'pinia';
import { businessApi } from '@/services/api';
import type { Business } from '@/shared/types';

export const useBusinessStore = defineStore('business', {
  state: () => ({
    businesses: [] as Business[],
    current: null as Business | null,
  }),
  actions: {
    async fetchMine() {
      this.businesses = await businessApi.mine();
      if (!this.current && this.businesses.length) {
        this.current = this.businesses[0];
      }
      return this.businesses;
    },
    async create(name: string, description?: string) {
      const business = await businessApi.create({ name, description });
      this.businesses.unshift(business);
      this.current = business;
      return business;
    },
    setCurrent(business: Business) {
      this.current = business;
    },
    async update(id: string, body: Partial<Pick<Business, 'name' | 'description' | 'active' | 'logo' | 'cover'>>) {
      const business = await businessApi.update(id, body);
      const index = this.businesses.findIndex((b) => b.id === id);
      if (index >= 0) this.businesses[index] = business;
      if (this.current?.id === id) this.current = business;
      return business;
    },
  },
});

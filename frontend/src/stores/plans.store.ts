import { defineStore } from 'pinia';
import { plansApi } from '@/services/api';
import type { BusinessSubscription, Plan } from '@/shared/types';

export const usePlansStore = defineStore('plans', {
  state: () => ({
    plans: [] as Plan[],
    subscription: null as BusinessSubscription | null,
    currentPlan: null as Plan | null,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    loading: false,
  }),
  getters: {
    hasFeature:
      (s) =>
      (key: string): boolean =>
        s.currentPlan?.features.includes(key) ?? false,
  },
  actions: {
    async fetchPublicPlans() {
      this.plans = await plansApi.publicList();
    },
    async fetchCurrent() {
      this.loading = true;
      try {
        const data = await plansApi.current();
        this.subscription = data.subscription;
        this.currentPlan = data.plan;
      } finally {
        this.loading = false;
      }
    },
    async changePlan(planSlug: string) {
      const data = await plansApi.changePlan(planSlug, this.billingCycle);
      this.subscription = data.subscription;
      this.currentPlan = data.plan;
      return data;
    },
    async startCheckout(planSlug: string) {
      return plansApi.checkout(planSlug, this.billingCycle);
    },
    setBillingCycle(cycle: 'monthly' | 'yearly') {
      this.billingCycle = cycle;
    },
  },
});

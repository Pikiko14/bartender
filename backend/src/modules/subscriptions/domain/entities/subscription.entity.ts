export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionRecordStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export interface SubscriptionProps {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionRecordStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  createdAt?: Date;
}

export class Subscription {
  constructor(private props: SubscriptionProps) {}

  get id(): string {
    return this.props.id;
  }
  get businessId(): string {
    return this.props.businessId;
  }
  get planId(): string {
    return this.props.planId;
  }
  get status(): SubscriptionRecordStatus {
    return this.props.status;
  }
  get billingCycle(): BillingCycle {
    return this.props.billingCycle;
  }
  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }

  isActive(): boolean {
    return [SubscriptionRecordStatus.TRIALING, SubscriptionRecordStatus.ACTIVE].includes(
      this.props.status,
    );
  }

  changePlan(planId: string, periodEnd: Date): void {
    this.props.planId = planId;
    this.props.status = SubscriptionRecordStatus.ACTIVE;
    this.props.currentPeriodStart = new Date();
    this.props.currentPeriodEnd = periodEnd;
    this.props.canceledAt = null;
  }

  cancel(): void {
    this.props.status = SubscriptionRecordStatus.CANCELED;
    this.props.canceledAt = new Date();
  }

  toPrimitives(): SubscriptionProps {
    return { ...this.props };
  }
}

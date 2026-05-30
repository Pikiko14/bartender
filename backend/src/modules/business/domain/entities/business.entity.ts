export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export interface BusinessProps {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  description: string | null;
  ownerId: string;
  active: boolean;
  subscriptionStatus: SubscriptionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Business {
  constructor(private props: BusinessProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get active(): boolean {
    return this.props.active;
  }
  get subscriptionStatus(): SubscriptionStatus {
    return this.props.subscriptionStatus;
  }

  update(
    partial: Partial<Pick<BusinessProps, 'name' | 'logo' | 'cover' | 'description' | 'active'>>,
  ): void {
    Object.assign(this.props, partial);
  }

  setSubscription(status: SubscriptionStatus): void {
    this.props.subscriptionStatus = status;
  }

  isOperational(): boolean {
    return (
      this.props.active &&
      [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE].includes(this.props.subscriptionStatus)
    );
  }

  toPrimitives(): BusinessProps {
    return { ...this.props };
  }
}

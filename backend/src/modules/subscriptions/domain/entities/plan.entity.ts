import { PlanFeature } from '@shared/enums/plan-feature.enum';

export interface PlanLimits {
  maxTables: number | null;
  maxUsers: number | null;
  maxMenuItems: number | null;
}

export interface PlanProps {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  limits: PlanLimits;
  trialDays: number;
  active: boolean;
  order: number;
  highlighted: boolean;
}

export class Plan {
  constructor(private props: PlanProps) {}

  get id(): string {
    return this.props.id;
  }
  get slug(): string {
    return this.props.slug;
  }
  get name(): string {
    return this.props.name;
  }
  get features(): PlanFeature[] {
    return this.props.features;
  }
  get limits(): PlanLimits {
    return this.props.limits;
  }
  get trialDays(): number {
    return this.props.trialDays;
  }
  get active(): boolean {
    return this.props.active;
  }

  hasFeature(feature: PlanFeature): boolean {
    return this.props.features.includes(feature);
  }

  toPrimitives(): PlanProps {
    return { ...this.props };
  }
}

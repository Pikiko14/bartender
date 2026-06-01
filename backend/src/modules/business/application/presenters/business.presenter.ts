import { MusicProvider } from '@shared/enums/music-provider.enum';
import { Business, SubscriptionStatus } from '../../domain/entities/business.entity';

export interface BusinessView {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  description: string | null;
  ownerId: string;
  active: boolean;
  subscriptionStatus: SubscriptionStatus;
  musicProvider: MusicProvider;
}

export function presentBusiness(business: Business): BusinessView {
  const p = business.toPrimitives();
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    logo: p.logo,
    cover: p.cover,
    description: p.description,
    ownerId: p.ownerId,
    active: p.active,
    subscriptionStatus: p.subscriptionStatus,
    musicProvider: p.musicProvider,
  };
}

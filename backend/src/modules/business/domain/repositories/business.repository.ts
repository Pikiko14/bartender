import { Business } from '../entities/business.entity';

export abstract class BusinessRepository {
  abstract create(business: Business): Promise<Business>;
  abstract findById(id: string): Promise<Business | null>;
  abstract findBySlug(slug: string): Promise<Business | null>;
  abstract findByOwner(ownerId: string): Promise<Business[]>;
  abstract update(business: Business): Promise<Business>;
  abstract existsBySlug(slug: string): Promise<boolean>;
}

export const BUSINESS_REPOSITORY = Symbol('BUSINESS_REPOSITORY');

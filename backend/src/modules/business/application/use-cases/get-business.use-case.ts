import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '@core/domain/exceptions';
import { Business } from '../../domain/entities/business.entity';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '../../domain/repositories/business.repository';

@Injectable()
export class GetBusinessUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async byId(id: string): Promise<Business> {
    const business = await this.businesses.findById(id);
    if (!business) throw new EntityNotFoundException('Negocio', id);
    return business;
  }

  async bySlug(slug: string): Promise<Business> {
    const business = await this.businesses.findBySlug(slug);
    if (!business) throw new EntityNotFoundException('Negocio', slug);
    return business;
  }

  listByOwner(ownerId: string): Promise<Business[]> {
    return this.businesses.findByOwner(ownerId);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { slugify } from '@shared/utils/slug.util';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { Business, SubscriptionStatus } from '../../domain/entities/business.entity';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '../../domain/repositories/business.repository';
import { CreateBusinessDto } from '../dto/create-business.dto';

@Injectable()
export class CreateBusinessUseCase {
  constructor(
    @Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(ownerId: string, dto: CreateBusinessDto): Promise<Business> {
    const slug = await this.generateUniqueSlug(dto.name);

    const business = new Business({
      id: uuid(),
      name: dto.name,
      slug,
      logo: dto.logo ?? null,
      cover: dto.cover ?? null,
      description: dto.description ?? null,
      ownerId,
      active: true,
      subscriptionStatus: SubscriptionStatus.TRIAL,
    });

    const created = await this.businesses.create(business);

    // El OWNER se asocia a su primer negocio si aún no tiene uno.
    const owner = await this.users.findById(ownerId);
    if (owner && !owner.businessId) {
      owner.assignBusiness(created.id);
      await this.users.update(owner);
    }

    return created;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'negocio';
    let candidate = base;
    let suffix = 1;
    while (await this.businesses.existsBySlug(candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }
}

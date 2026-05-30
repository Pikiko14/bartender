import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { Business } from '../../domain/entities/business.entity';
import {
  BUSINESS_REPOSITORY,
  BusinessRepository,
} from '../../domain/repositories/business.repository';
import { UpdateBusinessDto } from '../dto/update-business.dto';

@Injectable()
export class UpdateBusinessUseCase {
  constructor(@Inject(BUSINESS_REPOSITORY) private readonly businesses: BusinessRepository) {}

  async execute(businessId: string, ownerId: string, dto: UpdateBusinessDto): Promise<Business> {
    const business = await this.businesses.findById(businessId);
    if (!business) throw new EntityNotFoundException('Negocio', businessId);
    if (business.ownerId !== ownerId) {
      throw new ForbiddenDomainException('Solo el OWNER puede modificar el negocio.');
    }
    business.update(dto);
    return this.businesses.update(business);
  }
}

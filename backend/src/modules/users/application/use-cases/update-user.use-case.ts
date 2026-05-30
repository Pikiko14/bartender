import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(businessId: string, userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('Usuario', userId);
    }
    if (user.businessId !== businessId) {
      throw new ForbiddenDomainException('El usuario no pertenece a tu negocio.');
    }

    const props = user.toPrimitives();
    const updated = new User({
      ...props,
      name: dto.name ?? props.name,
      role: dto.role ?? props.role,
      active: dto.active ?? props.active,
      extraPermissions: dto.extraPermissions ?? props.extraPermissions,
      revokedPermissions: dto.revokedPermissions ?? props.revokedPermissions,
    });

    return this.users.update(updated);
  }
}

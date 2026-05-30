import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  ForbiddenDomainException,
} from '@core/domain/exceptions';
import { Role } from '@shared/enums';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(businessId: string, userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('Usuario', userId);
    }
    if (user.businessId !== businessId) {
      throw new ForbiddenDomainException('El usuario no pertenece a tu negocio.');
    }
    if (user.role === Role.OWNER) {
      throw new BusinessRuleViolationException('No se puede eliminar al OWNER del negocio.');
    }
    await this.users.delete(userId);
  }
}

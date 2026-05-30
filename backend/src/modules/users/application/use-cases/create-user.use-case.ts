import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ConflictException } from '@core/domain/exceptions';
import { PasswordService } from '@infrastructure/security/password.service';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * Crea un usuario hijo dentro de un negocio (invitación del OWNER/ADMIN).
   */
  async execute(businessId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    const passwordHash = await this.passwords.hash(dto.password);

    const user = new User({
      id: uuid(),
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      businessId,
      active: true,
      extraPermissions: dto.extraPermissions ?? [],
      revokedPermissions: [],
    });

    return this.users.create(user);
  }
}

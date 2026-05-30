import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ConflictException } from '@core/domain/exceptions';
import { Role } from '@shared/enums';
import { PasswordService } from '@infrastructure/security/password.service';
import { User } from '@modules/users/domain/entities/user.entity';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { presentUser, UserView } from '@modules/users/application/presenters/user.presenter';
import { RegisterDto } from '../dto/register.dto';
import { TokenPair, TokenService } from '../services/token.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /** Registra un nuevo OWNER (dueño de negocio). */
  async execute(dto: RegisterDto): Promise<{ user: UserView } & TokenPair> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email.');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const user = new User({
      id: uuid(),
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: Role.OWNER,
      businessId: null,
      active: true,
      extraPermissions: [],
      revokedPermissions: [],
    });

    const created = await this.users.create(user);
    const tokens = await this.tokens.issueTokens(created);
    return { user: presentUser(created), ...tokens };
  }
}

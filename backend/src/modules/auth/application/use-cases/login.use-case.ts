import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenDomainException, UnauthorizedDomainException } from '@core/domain/exceptions';
import { PasswordService } from '@infrastructure/security/password.service';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { presentUser, UserView } from '@modules/users/application/presenters/user.presenter';
import { LoginDto } from '../dto/login.dto';
import { TokenPair, TokenService } from '../services/token.service';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async execute(dto: LoginDto): Promise<{ user: UserView } & TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedDomainException('Credenciales inválidas.');
    }
    const valid = await this.passwords.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedDomainException('Credenciales inválidas.');
    }
    if (!user.active) {
      throw new ForbiddenDomainException('La cuenta está desactivada.');
    }

    const tokens = await this.tokens.issueTokens(user);
    return { user: presentUser(user), ...tokens };
  }
}

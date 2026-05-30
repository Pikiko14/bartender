import { Inject, Injectable } from '@nestjs/common';
import { UnauthorizedDomainException } from '@core/domain/exceptions';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@modules/users/domain/repositories/user.repository';
import { TokenPair, TokenService } from '../services/token.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new UnauthorizedDomainException('Refresh token inválido o expirado.');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedDomainException('Tipo de token inválido.');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedDomainException('Usuario no válido.');
    }

    return this.tokens.issueTokens(user);
  }
}

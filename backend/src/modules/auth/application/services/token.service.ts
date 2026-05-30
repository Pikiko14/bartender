import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@shared/interfaces/authenticated-user.interface';
import { User } from '@modules/users/domain/entities/user.entity';
import { UserPermissionsService } from '@modules/users/domain/services/user-permissions.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissions: UserPermissionsService,
  ) {}

  async issueTokens(user: User): Promise<TokenPair> {
    const base: Omit<JwtPayload, 'type'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      permissions: this.permissions.resolve(user),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: 'access' },
        {
          secret: this.config.get<string>('jwt.accessSecret'),
          expiresIn: this.config.get<string>('jwt.accessTtl'),
        },
      ),
      this.jwt.signAsync(
        { ...base, type: 'refresh' },
        {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: this.config.get<string>('jwt.refreshTtl'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.get<string>('jwt.refreshSecret'),
    });
  }
}

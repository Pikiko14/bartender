import { PaginatedResult, PaginationParams } from '@core/domain/pagination';
import { User } from '../entities/user.entity';

/** Puerto del repositorio de usuarios (driven port). */
export abstract class UserRepository {
  abstract create(user: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByBusiness(
    businessId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<User>>;
  abstract update(user: User): Promise<User>;
  abstract delete(id: string): Promise<void>;
  abstract countByBusiness(businessId: string): Promise<number>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

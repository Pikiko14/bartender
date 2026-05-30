import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, PaginationParams } from '@core/domain/pagination';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(businessId: string, pagination: PaginationParams): Promise<PaginatedResult<User>> {
    return this.users.findByBusiness(businessId, pagination);
  }
}

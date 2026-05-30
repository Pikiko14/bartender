import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';
import { presentUser } from '../../application/presenters/user.presenter';
import { CreateUserDto } from '../../application/dto/create-user.dto';
import { UpdateUserDto } from '../../application/dto/update-user.dto';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  async create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateUserDto) {
    const user = await this.createUser.execute(businessId, dto);
    return presentUser(user);
  }

  @Get()
  @RequirePermissions(Permission.USER_VIEW)
  async list(
    @CurrentUser('businessId') businessId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.listUsers.execute(businessId, pagination);
    return { ...result, items: result.items.map(presentUser) };
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.updateUser.execute(businessId, id, dto);
    return presentUser(user);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  async remove(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    await this.deleteUser.execute(businessId, id);
    return { deleted: true };
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, Public, RequirePermissions, Roles } from '@shared/decorators';
import { Permission, Role } from '@shared/enums';
import { CreateBusinessDto } from '../../application/dto/create-business.dto';
import { UpdateBusinessDto } from '../../application/dto/update-business.dto';
import { presentBusiness } from '../../application/presenters/business.presenter';
import { CreateBusinessUseCase } from '../../application/use-cases/create-business.use-case';
import { GetBusinessUseCase } from '../../application/use-cases/get-business.use-case';
import { UpdateBusinessUseCase } from '../../application/use-cases/update-business.use-case';

@Controller('businesses')
export class BusinessController {
  constructor(
    private readonly createBusiness: CreateBusinessUseCase,
    private readonly getBusiness: GetBusinessUseCase,
    private readonly updateBusiness: UpdateBusinessUseCase,
  ) {}

  @Post()
  @Roles(Role.OWNER)
  @RequirePermissions(Permission.BUSINESS_MANAGE)
  async create(@CurrentUser('userId') ownerId: string, @Body() dto: CreateBusinessDto) {
    return presentBusiness(await this.createBusiness.execute(ownerId, dto));
  }

  @Get('mine')
  @Roles(Role.OWNER)
  async mine(@CurrentUser('userId') ownerId: string) {
    const list = await this.getBusiness.listByOwner(ownerId);
    return list.map(presentBusiness);
  }

  /** Endpoint público usado al escanear el QR (landing del negocio). */
  @Public()
  @Get('public/:slug')
  async publicBySlug(@Param('slug') slug: string) {
    return presentBusiness(await this.getBusiness.bySlug(slug));
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @RequirePermissions(Permission.BUSINESS_MANAGE)
  async update(
    @CurrentUser('userId') ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return presentBusiness(await this.updateBusiness.execute(id, ownerId, dto));
  }
}

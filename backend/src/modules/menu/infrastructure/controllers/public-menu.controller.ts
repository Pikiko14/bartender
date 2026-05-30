import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '@shared/decorators';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import { GetMenuUseCase } from '../../application/use-cases/get-menu.use-case';

@Public()
@Controller('public/menu')
export class PublicMenuController {
  constructor(
    private readonly getMenu: GetMenuUseCase,
    private readonly getBusiness: GetBusinessUseCase,
  ) {}

  /** Menú público por slug de negocio (lo consume el cliente tras escanear QR). */
  @Get(':businessSlug')
  async menuBySlug(@Param('businessSlug') businessSlug: string) {
    const business = await this.getBusiness.bySlug(businessSlug);
    return this.getMenu.publicMenu(business.id);
  }
}

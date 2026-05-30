import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { CreateTableDto } from '../../application/dto/create-table.dto';
import { UpdateTableDto } from '../../application/dto/update-table.dto';
import { presentTable } from '../../application/presenters/table.presenter';
import { CreateTableUseCase } from '../../application/use-cases/create-table.use-case';
import { ManageTablesUseCase } from '../../application/use-cases/manage-tables.use-case';
import { QrService } from '../services/qr.service';

@Controller('tables')
export class TablesController {
  constructor(
    private readonly createTable: CreateTableUseCase,
    private readonly manageTables: ManageTablesUseCase,
    private readonly qr: QrService,
  ) {}

  @Post()
  @RequirePermissions(Permission.TABLE_MANAGE)
  async create(@CurrentUser('businessId') businessId: string, @Body() dto: CreateTableDto) {
    return presentTable(await this.createTable.execute(businessId, dto));
  }

  @Get()
  @RequirePermissions(Permission.TABLE_VIEW)
  async list(@CurrentUser('businessId') businessId: string) {
    const tables = await this.manageTables.listByBusiness(businessId);
    return tables.map(presentTable);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TABLE_MANAGE)
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return presentTable(await this.manageTables.update(businessId, id, dto));
  }

  @Delete(':id')
  @RequirePermissions(Permission.TABLE_MANAGE)
  async remove(@CurrentUser('businessId') businessId: string, @Param('id') id: string) {
    await this.manageTables.remove(businessId, id);
    return { deleted: true };
  }

  @Get(':id/qr.png')
  @RequirePermissions(Permission.TABLE_VIEW)
  @Header('Content-Type', 'image/png')
  async qrPng(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const table = await this.manageTables.getOwned(businessId, id);
    const buffer = await this.qr.toPngBuffer(table.qrUrl);
    res.send(buffer);
  }

  @Get(':id/qr.svg')
  @RequirePermissions(Permission.TABLE_VIEW)
  @Header('Content-Type', 'image/svg+xml')
  async qrSvg(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const table = await this.manageTables.getOwned(businessId, id);
    const svg = await this.qr.toSvgString(table.qrUrl);
    res.send(svg);
  }
}

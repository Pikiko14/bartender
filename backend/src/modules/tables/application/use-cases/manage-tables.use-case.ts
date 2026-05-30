import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException, ForbiddenDomainException } from '@core/domain/exceptions';
import { Table } from '../../domain/entities/table.entity';
import { TABLE_REPOSITORY, TableRepository } from '../../domain/repositories/table.repository';
import { UpdateTableDto } from '../dto/update-table.dto';

@Injectable()
export class ManageTablesUseCase {
  constructor(@Inject(TABLE_REPOSITORY) private readonly tables: TableRepository) {}

  listByBusiness(businessId: string): Promise<Table[]> {
    return this.tables.findByBusiness(businessId);
  }

  async getOwned(businessId: string, id: string): Promise<Table> {
    const table = await this.tables.findById(id);
    if (!table) throw new EntityNotFoundException('Mesa', id);
    if (table.businessId !== businessId) {
      throw new ForbiddenDomainException('La mesa no pertenece a tu negocio.');
    }
    return table;
  }

  async update(businessId: string, id: string, dto: UpdateTableDto): Promise<Table> {
    const table = await this.getOwned(businessId, id);
    table.update(dto);
    return this.tables.update(table);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.getOwned(businessId, id);
    await this.tables.delete(id);
  }

  async findPublic(businessId: string, slug: string): Promise<Table> {
    const table = await this.tables.findByBusinessAndSlug(businessId, slug);
    if (!table || !table.active) throw new EntityNotFoundException('Mesa', slug);
    return table;
  }
}

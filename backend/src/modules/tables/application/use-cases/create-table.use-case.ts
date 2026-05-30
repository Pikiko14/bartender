import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { slugify } from '@shared/utils/slug.util';
import { GetBusinessUseCase } from '@modules/business/application/use-cases/get-business.use-case';
import { Table } from '../../domain/entities/table.entity';
import { TABLE_REPOSITORY, TableRepository } from '../../domain/repositories/table.repository';
import { CreateTableDto } from '../dto/create-table.dto';

@Injectable()
export class CreateTableUseCase {
  constructor(
    @Inject(TABLE_REPOSITORY) private readonly tables: TableRepository,
    private readonly getBusiness: GetBusinessUseCase,
    private readonly config: ConfigService,
  ) {}

  async execute(businessId: string, dto: CreateTableDto): Promise<Table> {
    const business = await this.getBusiness.byId(businessId);
    const name = dto.name?.trim() || `Mesa ${dto.number}`;
    const slug = await this.uniqueSlug(businessId, slugify(name) || `mesa-${dto.number}`);

    const baseUrl = this.config.get<string>('qr.baseUrl');
    const qrUrl = `${baseUrl}/b/${business.slug}/table/${slug}`;

    const table = new Table({
      id: uuid(),
      businessId,
      number: dto.number,
      name,
      slug,
      qrUrl,
      active: true,
    });

    return this.tables.create(table);
  }

  private async uniqueSlug(businessId: string, base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await this.tables.existsByBusinessAndSlug(businessId, candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }
}

import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateCustomerDto } from '@modules/customers/application/dto/create-customer.dto';

export class AssignTableBillCustomerDto {
  @IsString()
  tableId!: string;

  @IsOptional()
  @IsString()
  tableSessionId?: string | null;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  create?: CreateCustomerDto;
}

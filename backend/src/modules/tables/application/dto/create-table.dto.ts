import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTableDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number!: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;
}

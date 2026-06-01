import { IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterGuestCustomerDto {
  @IsString()
  sessionId!: string;

  @IsString()
  @MinLength(5)
  document!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

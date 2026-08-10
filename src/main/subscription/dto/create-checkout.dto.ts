import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CreateCustomerPortalDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

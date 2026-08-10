import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubscriptionPlatform } from '@prisma';

export class VerifyInAppPurchaseDto {
  @IsNotEmpty()
  @IsEnum(SubscriptionPlatform)
  platform: SubscriptionPlatform; // IOS or ANDROID

  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsString()
  receiptDataOrPurchaseToken: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  originalTransactionId?: string;
}

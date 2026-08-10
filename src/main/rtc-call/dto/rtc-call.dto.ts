import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { CallType } from '@prisma';

export { CreateRtcCallDto } from './create-rtc-call.dto';

export class AcceptRtcCallDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class DeclineRtcCallDto {
  @IsString()
  @IsNotEmpty()
  callId: string;
}

export class EndRtcCallDto {
  @IsString()
  @IsNotEmpty()
  callId: string;
}

export class WebRtcOfferDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsString()
  @IsNotEmpty()
  offer: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class WebRtcAnswerDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class WebRtcIceCandidateDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsString()
  @IsNotEmpty()
  candidate: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class ToggleControlDto {
  @IsString()
  @IsNotEmpty()
  callId: string;

  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}

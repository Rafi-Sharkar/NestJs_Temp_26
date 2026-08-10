import { UserRole, UserStatus } from '@prisma';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateRoleUserDto {
  @ApiPropertyOptional({
    enum: [UserRole.ADMIN, UserRole.ANALYST, UserRole.EDITOR],
    description: 'New role to assign (ADMIN, ANALYST, or EDITOR)',
  })
  @IsOptional()
  @IsEnum([UserRole.ADMIN, UserRole.ANALYST, UserRole.EDITOR], {
    message: 'Role must be ADMIN, ANALYST, or EDITOR.',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'New status for the user',
  })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'Status must be a valid UserStatus value.',
  })
  status?: UserStatus;

}

import { UserRole } from '@prisma';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class CreateRoleUserDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address for the new role user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the role user',
  })
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    enum: [UserRole.ADMIN, UserRole.ANALYST, UserRole.EDITOR],
    description: 'Role to assign (only ADMIN, ANALYST, or EDITOR, not USER)',
  })
  @IsEnum([UserRole.ADMIN, UserRole.ANALYST, UserRole.EDITOR], {
    message: 'Role must be ADMIN, ANALYST, or EDITOR. USER role is not allowed.',
  })
  role: UserRole;

  @ApiProperty({
    example: '12345678',
    description: 'Password for the new role user',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

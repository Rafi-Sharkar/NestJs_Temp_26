import { Injectable } from '@nestjs/common';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { CreateRoleUserDto } from '../dto/create-role-user.dto';
import { UserRole, UserStatus } from '@prisma';

@Injectable()
export class AdminAuthCreateUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailService: AuthMailService,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Failed to create role user', 'Admin Auth')
  async createRoleUser(
    dto: CreateRoleUserDto,
    superAdminId: string,
  ): Promise<TResponse<any>> {
    // Validate SuperAdmin
    const superAdmin = await this.prisma.client.user.findUnique({
      where: { id: superAdminId },
    });

    if (!superAdmin || superAdmin.role !== UserRole.SUPER_ADMIN) {
      throw new AppError(403, 'Only SuperAdmin can create role users');
    }

    // Check if role is valid (not USER)
    if (dto.role === UserRole.USER) {
      throw new AppError(
        400,
        'Cannot create USER role users. Only ADMIN, ANALYST, or EDITOR roles allowed.',
      );
    } else if (dto.role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        400,
        'Cannot create SUPER_ADMIN role users. This role is created by default when system boots up.',
      );
    }

    let uniqueName = await this.generateUniqueName(dto.fullName);

    // Check if email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // // Generate temporary password
    // const tempPassword = this.generateTemporaryPassword();
    // const hashedPassword = await this.utils.hash(tempPassword);

    // Hash password from client input
    const hashedPassword = await this.utils.hash(dto.password);

    // Create the role user
    const newUser = await this.prisma.client.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        name: uniqueName,
        password: hashedPassword,
        role: dto.role,
        status: UserStatus.ACTIVE,
        isVerified: false,
      },
    });

    try {
      await this.authMailService.sendLoginCredentials(dto.email, {
        subject: `Raiz App's ${superAdmin.role} created a account for you`,
        message: `Welcome! Your ${dto.role} account has been created successfully. Please use the credentials below to login and verify your email.`,
        loginEmail: dto.email,
        loginPassword: dto.password,
      });
    } catch (error) {
      // Log error but don't fail the user creation
      console.error('Failed to send credentials email:', error);
    }

    return successResponse(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        fullName: newUser.fullName,
        role: newUser.role,
        status: newUser.status,
        isVerified: newUser.isVerified,
      },
      `${dto.role} user created successfully. Credentials sent to ${dto.email}`,
    );
  }

  /**
   * Generate unique name from full name
   */
  private async generateUniqueName(fullName: string): Promise<string> {
    // Create base name from fullName (remove spaces, convert to lowercase)
    const baseName = fullName
      .toLowerCase()
      .replace(/\s+/g, '')
      .substring(0, 20);

    // Check if the base name exists
    let uniqueName = baseName;
    let counter = 1;

    while (true) {
      const existingUser = await this.prisma.client.user.findUnique({
        where: { name: uniqueName },
      });

      if (!existingUser) {
        return uniqueName;
      }

      // If exists, append counter
      uniqueName = `${baseName}${counter}`;
      counter++;
    }
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

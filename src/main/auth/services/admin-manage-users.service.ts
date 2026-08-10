import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { UserRole } from '@prisma';
import { UpdateRoleUserDto } from '../dto/update-role-user.dto';

/**
 * Handles admin-panel user management for SUPER_ADMIN:
 *  - List all non-USER role accounts
 *  - Edit role / status of an existing admin
 *  - Remove (soft-delete) an admin account
 */
@Injectable()
export class AdminManageUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /admin/auth/admins
   * Returns all accounts with role != USER, ordered by createdAt desc.
   */
  @HandleError('Failed to fetch admin users', 'Admin Manage')
  async listAdminUsers(): Promise<TResponse<any>> {
    const admins = await this.prisma.client.user.findMany({
      where: {
        role: {
          in: [
            UserRole.SUPER_ADMIN,
            UserRole.ADMIN,
            UserRole.ANALYST,
            UserRole.EDITOR,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
        lastActiveAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return successResponse(admins, 'Admin users fetched successfully');
  }

  /** PATCH /admin/auth/admins/:id
   * Update role and/or status of an admin user.
   * Cannot demote / edit another SUPER_ADMIN.
   */
  @HandleError('Failed to update admin user', 'Admin Manage')
  async updateAdminUser(
    targetId: string,
    dto: UpdateRoleUserDto,
    requesterId: string,
  ): Promise<TResponse<any>> {
    const target = await this.prisma.client.user.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new AppError(404, 'User not found');
    }

    // Prevent editing another SUPER_ADMIN (protecting the top-level account)
    if (target.role === UserRole.SUPER_ADMIN && target.id !== requesterId) {
      throw new AppError(403, 'Cannot edit another Super Admin account');
    }

    // Prevent changing a user's role to SUPER_ADMIN
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        400,
        'Cannot assign the SUPER_ADMIN role. This role is reserved.',
      );
    }

    const updated = await this.prisma.client.user.update({
      where: { id: targetId },
      data: {
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        lastActiveAt: true,
        updatedAt: true,
        profilePhoto: true,
      },
    });

    return successResponse(updated, 'Admin user updated successfully');
  }

  /** DELETE /admin/auth/admins/:id
   * Remove an admin account. Cannot delete a SUPER_ADMIN account.
   */
  @HandleError('Failed to remove admin user', 'Admin Manage')
  async removeAdminUser(
    targetId: string,
    requesterId: string,
  ): Promise<TResponse<any>> {
    const target = await this.prisma.client.user.findUnique({
      where: { id: targetId },
    });

    if (!target) {
      throw new AppError(404, 'User not found');
    }

    // Cannot remove yourself
    if (target.id === requesterId) {
      throw new AppError(400, 'You cannot remove your own account');
    }

    // Cannot remove a SUPER_ADMIN
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new AppError(403, 'Cannot remove a Super Admin account');
    }

    await this.prisma.client.user.delete({
      where: { id: targetId },
    });

    return successResponse(
      { id: targetId, email: target.email },
      'Admin user removed successfully',
    );
  }
}

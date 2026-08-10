import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { SuperAdminGuard } from '@/core/jwt/admin.guard';
import { AdminAuthCreateUserService } from '../services/admin-auth-create-user.service';
import { AdminManageUsersService } from '../services/admin-manage-users.service';
import { UploadService } from '../../upload-s3/service/upload.service';
import { CreateRoleUserDto } from '../dto/create-role-user.dto';
import { UpdateRoleUserDto } from '../dto/update-role-user.dto';

/**
 * Admin Auth Controller — SUPER_ADMIN only.
 *
 * POST   /admin/auth/admins           → create a new ADMIN / ANALYST / EDITOR
 * GET    /admin/auth/admins           → list all non-USER role accounts
 * PATCH  /admin/auth/admins/:id       → update role / status / profile photo
 * DELETE /admin/auth/admins/:id       → remove an admin account
 */
@ApiTags('Admin Auth')
@Controller('admin/auth')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth()
export class AdminAuthController {
  constructor(
    private readonly createUserService: AdminAuthCreateUserService,
    private readonly manageUsersService: AdminManageUsersService,
    private readonly uploadService: UploadService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /admin/auth/admins — Create new admin-panel user
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('admins')
  @ApiOperation({
    summary: 'Create Admin / Analyst / Editor user [SUPER_ADMIN only]',
    description:
      'Creates a new admin-panel user with role ADMIN, ANALYST, or EDITOR. Sends login credentials via email.',
  })
  async createRoleUser(@Body() dto: CreateRoleUserDto, @Request() req: any) {
    return this.createUserService.createRoleUser(dto, req.user.sub);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /admin/auth/admins — List all admin-panel users
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('admins')
  @ApiOperation({
    summary: 'List all admin-panel users [SUPER_ADMIN only]',
    description:
      'Returns all accounts with role SUPER_ADMIN, ADMIN, ANALYST, or EDITOR, ordered by creation date.',
  })
  async listAdminUsers() {
    return this.manageUsersService.listAdminUsers();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /admin/auth/admins/:id — Edit role / status
  // ─────────────────────────────────────────────────────────────────────────────
  @Patch('admins/:id')
  @ApiConsumes('application/json')
  @ApiOperation({
    summary:
      'Edit admin user role or status [SUPER_ADMIN only]',
    description:
      'Updates the role and/or status of an admin-panel user. ' +
      'All fields are optional. ' +
      'Cannot edit or demote another SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Target user ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'string',
          enum: ['ADMIN', 'ANALYST', 'EDITOR'],
          description: 'New role to assign (optional)',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
          description: 'New account status (optional)',
        }
      },
    },
  })
  async updateAdminUser(
    @Param('id') id: string,
    @Body() dto: UpdateRoleUserDto,
    @Request() req: any,
  ) {
    return this.manageUsersService.updateAdminUser(id, dto, req.user.sub);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE /admin/auth/admins/:id — Remove admin account
  // ─────────────────────────────────────────────────────────────────────────────
  @Delete('admins/:id')
  @ApiOperation({
    summary: 'Remove an admin user [SUPER_ADMIN only]',
    description:
      'Permanently deletes an admin-panel account. Cannot delete SUPER_ADMIN accounts or your own account.',
  })
  @ApiParam({ name: 'id', description: 'Target user ID to remove' })
  async removeAdminUser(@Param('id') id: string, @Request() req: any) {
    return this.manageUsersService.removeAdminUser(id, req.user.sub);
  }
}

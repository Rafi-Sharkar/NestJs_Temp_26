import { Controller, Delete, Get, Param } from '@nestjs/common';
import { DevToolService } from './dev-tool.service';

@Controller('dev-tool')
export class DevToolController {
  constructor(private readonly devToolService: DevToolService) {}

  @Get('users')
  async getAllUsers() {
    return this.devToolService.getAllUsers();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.devToolService.deleteUserById(userId);
  }
}

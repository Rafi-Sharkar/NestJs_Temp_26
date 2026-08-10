import { SetMetadata } from '@nestjs/common';

export const MODULE_KEY = 'module';

/**
 * Attach a module name to a controller class or individual route handler.
 * PermissionsGuard reads this key and checks the permissions table.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequireModule('analytics')
 * export class AnalyticsController { ... }
 */
export const RequireModule = (module: string) =>
  SetMetadata(MODULE_KEY, module);

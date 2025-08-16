import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from './permissions.decorator';
import { User } from '../entities';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user }: { user: User } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('用户角色信息不完整');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      this.checkPermission(user, permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }

  private checkPermission(user: User, permission: Permission): boolean {
    const { resource, action } = permission;
    const userPermissions = user.role?.permissions || {};
    const resourcePermissions = userPermissions[resource] || [];

    return resourcePermissions.includes(action) || resourcePermissions.includes('*');
  }
}
import { apiClient } from '../lib/api';
import type { Role } from '../types';

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions?: Record<string, string[]>;
  isActive?: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Record<string, string[]>;
  isActive?: boolean;
}

export class RoleService {
  // 获取角色列表
  static async getRoles(): Promise<Role[]> {
    return apiClient.get('/roles');
  }

  // 获取活跃角色列表
  static async getActiveRoles(): Promise<Role[]> {
    return apiClient.get('/roles/active');
  }

  // 获取角色详情
  static async getRole(id: string): Promise<Role> {
    return apiClient.get(`/roles/${id}`);
  }

  // 创建角色
  static async createRole(data: CreateRoleRequest): Promise<Role> {
    return apiClient.post('/roles', data);
  }

  // 更新角色
  static async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    return apiClient.patch(`/roles/${id}`, data);
  }

  // 更新角色权限
  static async updateRolePermissions(
    id: string,
    permissions: Record<string, string[]>
  ): Promise<Role> {
    return apiClient.patch(`/roles/${id}/permissions`, { permissions });
  }

  // 切换角色状态
  static async toggleRoleStatus(id: string): Promise<Role> {
    return apiClient.patch(`/roles/${id}/toggle-status`);
  }

  // 删除角色
  static async deleteRole(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/roles/${id}`);
  }

  // 获取可用权限列表
  static async getAvailablePermissions(): Promise<Record<string, string[]>> {
    return apiClient.get('/roles/permissions');
  }
}
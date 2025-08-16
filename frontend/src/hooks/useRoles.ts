import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RoleService } from '../services';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
} from '../types';

export const useRoles = () => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, string[]>>({});

  // 获取角色列表
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RoleService.getRoles();
      setRoles(result);
      return result;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取角色列表失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取活跃角色列表
  const fetchActiveRoles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await RoleService.getActiveRoles();
      return result;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取活跃角色列表失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取角色详情
  const fetchRole = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const role = await RoleService.getRole(id);
      return role;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取角色详情失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建角色
  const createRole = useCallback(async (data: CreateRoleRequest) => {
    try {
      setLoading(true);
      const role = await RoleService.createRole(data);
      setRoles(prev => [role, ...prev]);
      toast.success('角色创建成功');
      return role;
    } catch (error: any) {
      const message = error.response?.data?.message || '创建角色失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新角色
  const updateRole = useCallback(async (id: string, data: UpdateRoleRequest) => {
    try {
      setLoading(true);
      const updatedRole = await RoleService.updateRole(id, data);
      setRoles(prev => prev.map(role => role.id === id ? updatedRole : role));
      toast.success('角色更新成功');
      return updatedRole;
    } catch (error: any) {
      const message = error.response?.data?.message || '更新角色失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新角色权限
  const updateRolePermissions = useCallback(async (
    id: string,
    permissions: Record<string, string[]>
  ) => {
    try {
      setLoading(true);
      const updatedRole = await RoleService.updateRolePermissions(id, permissions);
      setRoles(prev => prev.map(role => role.id === id ? updatedRole : role));
      toast.success('角色权限更新成功');
      return updatedRole;
    } catch (error: any) {
      const message = error.response?.data?.message || '更新角色权限失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换角色状态
  const toggleRoleStatus = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const updatedRole = await RoleService.toggleRoleStatus(id);
      setRoles(prev => prev.map(role => role.id === id ? updatedRole : role));
      toast.success('角色状态更新成功');
      return updatedRole;
    } catch (error: any) {
      const message = error.response?.data?.message || '更新角色状态失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除角色
  const deleteRole = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await RoleService.deleteRole(id);
      setRoles(prev => prev.filter(role => role.id !== id));
      toast.success('角色删除成功');
    } catch (error: any) {
      const message = error.response?.data?.message || '删除角色失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取可用权限列表
  const fetchAvailablePermissions = useCallback(async () => {
    try {
      setLoading(true);
      const permissions = await RoleService.getAvailablePermissions();
      setAvailablePermissions(permissions);
      return permissions;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取权限列表失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    roles,
    availablePermissions,
    fetchRoles,
    fetchActiveRoles,
    fetchRole,
    createRole,
    updateRole,
    updateRolePermissions,
    toggleRoleStatus,
    deleteRole,
    fetchAvailablePermissions,
  };
};
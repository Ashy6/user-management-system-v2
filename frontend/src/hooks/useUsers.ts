import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UserService } from '../services';
import type {
  User,
  UserListResponse,
  UserQuery,
  UserStatistics,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types';

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);

  // 获取用户列表
  const fetchUsers = useCallback(async (query?: UserQuery) => {
    try {
      setLoading(true);
      const result: UserListResponse = await UserService.getUsers(query);
      setUsers(result.users);
      setTotal(result.total);
      return result;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取用户列表失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取用户详情
  const fetchUser = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const user = await UserService.getUser(id);
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取用户详情失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 创建用户
  const createUser = useCallback(async (data: CreateUserRequest) => {
    try {
      setLoading(true);
      const user = await UserService.createUser(data);
      setUsers(prev => [user, ...prev]);
      setTotal(prev => prev + 1);
      toast.success('用户创建成功');
      return user;
    } catch (error: any) {
      const message = error.response?.data?.message || '创建用户失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新用户
  const updateUser = useCallback(async (id: string, data: UpdateUserRequest) => {
    try {
      setLoading(true);
      const updatedUser = await UserService.updateUser(id, data);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      toast.success('用户更新成功');
      return updatedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || '更新用户失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新用户状态
  const updateUserStatus = useCallback(async (
    id: string,
    status: 'active' | 'inactive' | 'suspended'
  ) => {
    try {
      setLoading(true);
      const updatedUser = await UserService.updateUserStatus(id, status);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      toast.success('用户状态更新成功');
      return updatedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || '更新用户状态失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除用户
  const deleteUser = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await UserService.deleteUser(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      setTotal(prev => prev - 1);
      toast.success('用户删除成功');
    } catch (error: any) {
      const message = error.response?.data?.message || '删除用户失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取用户统计信息
  const fetchUserStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await UserService.getUserStatistics();
      setStatistics(stats);
      return stats;
    } catch (error: any) {
      const message = error.response?.data?.message || '获取用户统计失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    users,
    total,
    statistics,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    updateUserStatus,
    deleteUser,
    fetchUserStatistics,
  };
};
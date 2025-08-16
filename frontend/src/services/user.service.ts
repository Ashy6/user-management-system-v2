import { apiClient } from '../lib/api';
import type {
  User,
  UserListResponse,
  UserQuery,
  UserStatistics,
} from '../types';

export interface CreateUserRequest {
  email: string;
  name: string;
  phone?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export class UserService {
  // 获取用户列表
  static async getUsers(query?: UserQuery): Promise<UserListResponse> {
    return apiClient.get('/users', query);
  }

  // 获取用户详情
  static async getUser(id: string): Promise<User> {
    return apiClient.get(`/users/${id}`);
  }

  // 创建用户
  static async createUser(data: CreateUserRequest): Promise<User> {
    return apiClient.post('/users', data);
  }

  // 更新用户
  static async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return apiClient.patch(`/users/${id}`, data);
  }

  // 更新用户状态
  static async updateUserStatus(
    id: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<User> {
    return apiClient.patch(`/users/${id}/status`, { status });
  }

  // 删除用户
  static async deleteUser(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/users/${id}`);
  }

  // 获取用户统计信息
  static async getUserStatistics(): Promise<UserStatistics> {
    return apiClient.get('/users/statistics');
  }
}
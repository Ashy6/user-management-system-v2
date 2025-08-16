import { apiClient } from '../lib/api';
import type {
  AuthResult,
  LoginRequest,
  RegisterRequest,
  SendCodeRequest,
  User,
} from '../types';

export class AuthService {
  // 发送验证码
  static async sendVerificationCode(data: SendCodeRequest): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/auth/send-code', data);
  }

  // 登录
  static async login(data: LoginRequest): Promise<AuthResult> {
    const result = await apiClient.post<AuthResult>('/auth/login', data);
    
    // 保存认证信息到本地存储
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  }

  // 注册
  static async register(data: RegisterRequest): Promise<AuthResult> {
    const result = await apiClient.post<AuthResult>('/auth/register', data);
    
    // 保存认证信息到本地存储
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    
    return result;
  }

  // 刷新token
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return apiClient.post('/auth/refresh', { refreshToken });
  }

  // 退出登录
  static async logout(): Promise<{ success: boolean }> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    
    return { success: true };
  }

  // 获取当前用户信息
  static async getProfile(): Promise<User> {
    return apiClient.get('/auth/profile');
  }

  // 检查是否已登录
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // 获取当前用户
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Parse user error:', error);
        return null;
      }
    }
    return null;
  }

  // 获取访问令牌
  static getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // 获取刷新令牌
  static getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
}
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services';
import type { User, LoginRequest, RegisterRequest, SendCodeRequest } from '../types';
import { toast } from 'sonner';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 初始化认证状态
  useEffect(() => {
    const initAuth = () => {
      const isAuthenticated = AuthService.isAuthenticated();
      const user = AuthService.getCurrentUser();
      
      setAuthState({
        user,
        isAuthenticated,
        isLoading: false,
      });
    };

    initAuth();
  }, []);

  // 发送验证码
  const sendCode = useCallback(async (data: SendCodeRequest) => {
    console.log('sendCode', data);
    try {
      const result = await AuthService.sendVerificationCode(data);
      toast.success(result.message || '验证码发送成功');
      return result;
    } catch (error: any) {
      const message = error.response?.data?.message || '发送验证码失败';
      toast.error(message);
      throw error;
    }
  }, []);

  // 登录
  const login = useCallback(async (data: LoginRequest) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const result = await AuthService.login(data);
      
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      toast.success('登录成功');
      return result;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const message = error.response?.data?.message || '登录失败';
      toast.error(message);
      throw error;
    }
  }, []);

  // 注册
  const register = useCallback(async (data: RegisterRequest) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const result = await AuthService.register(data);
      
      setAuthState({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
      });
      
      toast.success('注册成功');
      return result;
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const message = error.response?.data?.message || '注册失败';
      toast.error(message);
      throw error;
    }
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      toast.success('已退出登录');
    } catch (error: any) {
      console.error('Logout error:', error);
      // 即使退出失败，也要清除本地状态
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const user = await AuthService.getProfile();
      setAuthState(prev => ({ ...prev, user }));
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      console.error('Refresh user error:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    sendCode,
    login,
    register,
    logout,
    refreshUser,
  };
};
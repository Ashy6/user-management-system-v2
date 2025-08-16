// 用户相关类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

// 角色相关类型
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 认证结果类型
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// 登录请求类型
export interface LoginRequest {
  email: string;
  code: string;
}

// 注册请求类型
export interface RegisterRequest {
  email: string;
  code: string;
  name: string;
  phone?: string;
}

// 发送验证码请求类型
export interface SendCodeRequest {
  email: string;
  type: 'login' | 'register' | 'reset';
}

// 用户列表响应类型
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 用户查询参数类型
export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 用户统计类型
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  recentRegistrations: number;
}

// 创建用户请求类型
export interface CreateUserRequest {
  email: string;
  name: string;
  phone?: string;
  roleId?: string;
}

// 更新用户请求类型
export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  roleId?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// 创建角色请求类型
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
}

// 更新角色请求类型
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Record<string, string[]>;
  isActive?: boolean;
}

// 认证状态类型
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 系统设置相关类型
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface SecurityConfig {
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

export interface SystemConfig {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface SystemSettings {
  emailConfig: EmailConfig;
  securityConfig: SecurityConfig;
  systemConfig: SystemConfig;
}

export interface UpdateSettingsRequest {
  emailConfig?: Partial<EmailConfig>;
  securityConfig?: Partial<SecurityConfig>;
  systemConfig?: Partial<SystemConfig>;
}
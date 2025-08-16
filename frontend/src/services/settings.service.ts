import { apiClient } from '../lib/api';
import type {
  SystemSettings,
  UpdateSettingsRequest,
} from '../types';

export class SettingsService {
  // 获取系统设置
  static async getSettings(): Promise<SystemSettings> {
    return apiClient.get('/settings');
  }

  // 更新系统设置
  static async updateSettings(data: UpdateSettingsRequest): Promise<SystemSettings> {
    return apiClient.put('/settings', data);
  }

  // 测试邮件配置
  static async testEmailConfig(emailConfig: any): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/settings/test-email', { emailConfig });
  }
}
import { useState, useCallback } from 'react';
import { SettingsService } from '../services';
import type { SystemSettings, UpdateSettingsRequest } from '../types';
import { toast } from 'sonner';

export interface UseSettingsReturn {
  settings: SystemSettings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: UpdateSettingsRequest) => Promise<void>;
  testEmailConfig: (emailConfig: any) => Promise<boolean>;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('获取系统设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (data: UpdateSettingsRequest) => {
    try {
      setLoading(true);
      const updatedSettings = await SettingsService.updateSettings(data);
      setSettings(updatedSettings);
      toast.success('系统设置更新成功');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('更新系统设置失败');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const testEmailConfig = useCallback(async (emailConfig: any): Promise<boolean> => {
    try {
      const result = await SettingsService.testEmailConfig(emailConfig);
      if (result.success) {
        toast.success('邮件配置测试成功');
        return true;
      } else {
        toast.error(`邮件配置测试失败: ${result.message}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to test email config:', error);
      toast.error('邮件配置测试失败');
      return false;
    }
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    testEmailConfig,
  };
};
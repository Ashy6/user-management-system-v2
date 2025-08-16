import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Loading } from '../components/ui';
import { Save, TestTube, Mail, Shield, Settings as SettingsIcon } from 'lucide-react';
import type { SystemSettings, UpdateSettingsRequest } from '../types';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { settings, loading, fetchSettings, updateSettings, testEmailConfig } = useSettings();
  const [formData, setFormData] = useState<SystemSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'security' | 'system'>('email');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (section: keyof SystemSettings, field: string, value: any) => {
    if (!formData) return;
    
    setFormData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!formData || !settings) return;

    try {
      setSaving(true);
      const updateData: UpdateSettingsRequest = {};

      // 检查哪些配置发生了变化
      if (JSON.stringify(formData.emailConfig) !== JSON.stringify(settings.emailConfig)) {
        updateData.emailConfig = formData.emailConfig;
      }
      if (JSON.stringify(formData.securityConfig) !== JSON.stringify(settings.securityConfig)) {
        updateData.securityConfig = formData.securityConfig;
      }
      if (JSON.stringify(formData.systemConfig) !== JSON.stringify(settings.systemConfig)) {
        updateData.systemConfig = formData.systemConfig;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('没有检测到配置变更');
        return;
      }

      await updateSettings(updateData);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData?.emailConfig) return;

    try {
      setTesting(true);
      await testEmailConfig(formData.emailConfig);
    } catch (error) {
      console.error('Failed to test email:', error);
    } finally {
      setTesting(false);
    }
  };

  const tabs = [
    { id: 'email' as const, label: '邮件配置', icon: Mail },
    { id: 'security' as const, label: '安全配置', icon: Shield },
    { id: 'system' as const, label: '系统配置', icon: SettingsIcon },
  ];

  if (loading || !formData) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <Loading size="lg" text="加载系统设置..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="text-gray-600">管理系统的各项配置参数</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 邮件配置 */}
      {activeTab === 'email' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>邮件服务配置</CardTitle>
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testing}
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testing ? '测试中...' : '测试连接'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP服务器
                </label>
                <Input
                  value={formData.emailConfig.host}
                  onChange={(e) => handleInputChange('emailConfig', 'host', e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  端口
                </label>
                <Input
                  type="number"
                  value={formData.emailConfig.port}
                  onChange={(e) => handleInputChange('emailConfig', 'port', parseInt(e.target.value))}
                  placeholder="587"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <Input
                  value={formData.emailConfig.user}
                  onChange={(e) => handleInputChange('emailConfig', 'user', e.target.value)}
                  placeholder="your-email@yourdomain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <Input
                  type="password"
                  value={formData.emailConfig.pass}
                  onChange={(e) => handleInputChange('emailConfig', 'pass', e.target.value)}
                  placeholder="your-password"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发件人地址
                </label>
                <Input
                  value={formData.emailConfig.from}
                  onChange={(e) => handleInputChange('emailConfig', 'from', e.target.value)}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="secure"
                  checked={formData.emailConfig.secure}
                  onChange={(e) => handleInputChange('emailConfig', 'secure', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="secure" className="text-sm font-medium text-gray-700">
                  使用SSL/TLS加密
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 安全配置 */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>安全策略配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会话超时时间（分钟）
                </label>
                <Input
                  type="number"
                  value={formData.securityConfig.sessionTimeout}
                  onChange={(e) => handleInputChange('securityConfig', 'sessionTimeout', parseInt(e.target.value))}
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最大登录尝试次数
                </label>
                <Input
                  type="number"
                  value={formData.securityConfig.maxLoginAttempts}
                  onChange={(e) => handleInputChange('securityConfig', 'maxLoginAttempts', parseInt(e.target.value))}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  账户锁定时长（分钟）
                </label>
                <Input
                  type="number"
                  value={formData.securityConfig.lockoutDuration}
                  onChange={(e) => handleInputChange('securityConfig', 'lockoutDuration', parseInt(e.target.value))}
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码最小长度
                </label>
                <Input
                  type="number"
                  value={formData.securityConfig.passwordMinLength}
                  onChange={(e) => handleInputChange('securityConfig', 'passwordMinLength', parseInt(e.target.value))}
                  placeholder="8"
                />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">密码复杂度要求</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireUppercase"
                    checked={formData.securityConfig.passwordRequireUppercase}
                    onChange={(e) => handleInputChange('securityConfig', 'passwordRequireUppercase', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="requireUppercase" className="text-sm text-gray-700">
                    包含大写字母
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireLowercase"
                    checked={formData.securityConfig.passwordRequireLowercase}
                    onChange={(e) => handleInputChange('securityConfig', 'passwordRequireLowercase', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="requireLowercase" className="text-sm text-gray-700">
                    包含小写字母
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireNumbers"
                    checked={formData.securityConfig.passwordRequireNumbers}
                    onChange={(e) => handleInputChange('securityConfig', 'passwordRequireNumbers', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="requireNumbers" className="text-sm text-gray-700">
                    包含数字
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireSymbols"
                    checked={formData.securityConfig.passwordRequireSymbols}
                    onChange={(e) => handleInputChange('securityConfig', 'passwordRequireSymbols', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="requireSymbols" className="text-sm text-gray-700">
                    包含特殊字符
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 系统配置 */}
      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <CardTitle>系统基础配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网站名称
                </label>
                <Input
                  value={formData.systemConfig.siteName}
                  onChange={(e) => handleInputChange('systemConfig', 'siteName', e.target.value)}
                  placeholder="用户管理系统"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网站描述
                </label>
                <Input
                  value={formData.systemConfig.siteDescription}
                  onChange={(e) => handleInputChange('systemConfig', 'siteDescription', e.target.value)}
                  placeholder="一个现代化的用户管理系统"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <Input
                  value={formData.systemConfig.logoUrl}
                  onChange={(e) => handleInputChange('systemConfig', 'logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  时区
                </label>
                <select
                  value={formData.systemConfig.timezone}
                  onChange={(e) => handleInputChange('systemConfig', 'timezone', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                  <option value="UTC">UTC (UTC+0)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系统语言
                </label>
                <select
                  value={formData.systemConfig.language}
                  onChange={(e) => handleInputChange('systemConfig', 'language', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={formData.systemConfig.maintenanceMode}
                  onChange={(e) => handleInputChange('systemConfig', 'maintenanceMode', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
                  维护模式
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
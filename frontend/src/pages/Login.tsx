import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components';
import { Mail, Lock } from 'lucide-react';
import { isValidEmail } from '../lib/utils';
import type { LoginRequest } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, sendCode, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    code: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = '请输入邮箱地址';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!formData.code) {
      newErrors.code = '请输入验证码';
    } else if (formData.code.length !== 6) {
      newErrors.code = '验证码应为6位数字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!formData.email) {
      setErrors({ email: '请输入邮箱地址' });
      return;
    }

    if (!isValidEmail(formData.email)) {
      setErrors({ email: '请输入有效的邮箱地址' });
      return;
    }

    try {
      setSendingCode(true);
      await sendCode({
        email: formData.email,
        type: 'login',
      });
      
      setCodeSent(true);
      setCountdown(60);
      
      // 开始倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Send code error:', error);
    } finally {
      setSendingCode(false);
    }
  };

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">用户管理系统</h1>
          <p className="mt-2 text-sm text-gray-600">使用邮箱验证码登录您的账户</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">登录</CardTitle>
            <CardDescription className="text-center">
              输入您的邮箱地址，我们将发送验证码到您的邮箱
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Input
                  label="邮箱地址"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="请输入邮箱地址"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      label="验证码"
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      error={errors.code}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0 || !formData.email}
                      loading={sendingCode}
                      className="h-10"
                    >
                      {countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={!formData.email || !formData.code}
              >
                <Mail className="mr-2 h-4 w-4" />
                登录
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                还没有账户？{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  立即注册
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
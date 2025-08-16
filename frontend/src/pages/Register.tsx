import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../hooks';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components';
import { isValidEmail, isValidPhone } from '../lib/utils';
import type { RegisterRequest } from '../types';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, sendCode, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    name: '',
    phone: '',
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

    if (!formData.name) {
      newErrors.name = '请输入姓名';
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少需要2个字符';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = '请输入有效的手机号码';
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
        type: 'register',
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

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const registerData = {
        email: formData.email,
        code: formData.code,
        name: formData.name,
        ...(formData.phone && { phone: formData.phone }),
      };
      
      await register(registerData);
      toast.success('注册成功');
      navigate('/dashboard');
    } catch (error) {
      console.error('Register error:', error);
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
          <p className="mt-2 text-sm text-gray-600">创建您的新账户</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">注册</CardTitle>
            <CardDescription className="text-center">
              填写以下信息创建您的账户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
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

              <div>
                <Input
                  label="姓名"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="请输入您的姓名"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  label="手机号码（可选）"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={errors.phone}
                  placeholder="请输入手机号码"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={!formData.email || !formData.code || !formData.name}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                注册
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                已有账户？{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  立即登录
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
import React, { useEffect, useState } from 'react';
import { useAuth, useUsers } from '../hooks';
import { Card, CardHeader, CardTitle, CardContent, Loading } from '../components/ui';
import { Users, UserCheck, UserX, UserMinus, TrendingUp } from 'lucide-react';
import { formatDate } from '../lib/utils';
import type { UserStatistics } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { fetchUserStatistics, loading } = useUsers();
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const stats = await fetchUserStatistics();
        setStatistics(stats);
      } catch (error) {
        console.error('Failed to load statistics:', error);
      }
    };

    loadStatistics();
  }, [fetchUserStatistics]);

  const statsCards = [
    {
      title: '总用户数',
      value: statistics?.total || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '活跃用户',
      value: statistics?.active || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '非活跃用户',
      value: statistics?.inactive || 0,
      icon: UserMinus,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '已暂停用户',
      value: statistics?.suspended || 0,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" text="加载中..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          欢迎回来，{user?.name || '用户'}！
        </h1>
        <p className="text-blue-100">
          今天是 {formatDate(new Date(), 'long')}，祝您工作愉快！
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 最近注册用户 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              最近注册统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">本周新增用户</span>
                <span className="text-lg font-semibold text-green-600">
                  +{statistics?.recentRegistrations || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      ((statistics?.recentRegistrations || 0) / (statistics?.total || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                占总用户数的{' '}
                {statistics?.total
                  ? (
                      ((statistics.recentRegistrations || 0) / statistics.total) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: '活跃', value: statistics?.active || 0, color: 'bg-green-500' },
                { label: '非活跃', value: statistics?.inactive || 0, color: 'bg-yellow-500' },
                { label: '已暂停', value: statistics?.suspended || 0, color: 'bg-red-500' },
              ].map((item, index) => {
                const percentage = statistics?.total
                  ? (item.value / statistics.total) * 100
                  : 0;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.value}</span>
                      <span className="text-xs text-muted-foreground">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium">用户管理</h3>
              <p className="text-sm text-muted-foreground">查看和管理所有用户</p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
              <UserCheck className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium">角色权限</h3>
              <p className="text-sm text-muted-foreground">管理用户角色和权限</p>
            </button>
            <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium">系统设置</h3>
              <p className="text-sm text-muted-foreground">配置系统参数</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
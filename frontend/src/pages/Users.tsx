import React, { useEffect, useState } from 'react';
import { useUsers, useRoles } from '../hooks';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Loading } from '../components/ui';
import { Search, Plus, Edit, Trash2, Eye, UserCheck, UserX, UserMinus } from 'lucide-react';
import type { User, UserQuery, Role } from '../types';
import { formatDate, debounce } from '../lib/utils';
import { toast } from 'sonner';

const Users: React.FC = () => {
  const {
    users,
    total,
    loading,
    fetchUsers,
    updateUserStatus,
    deleteUser,
  } = useUsers();
  const { fetchActiveRoles } = useRoles();
  
  const [query, setQuery] = useState<UserQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    roleId: '',
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // 加载数据
  useEffect(() => {
    fetchUsers(query);
  }, [query, fetchUsers]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const activeRoles = await fetchActiveRoles();
        setRoles(activeRoles);
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };
    loadRoles();
  }, [fetchActiveRoles]);

  // 防抖搜索
  const debouncedSearch = debounce((searchTerm: string) => {
    setQuery(prev => ({ ...prev, search: searchTerm, page: 1 }));
  }, 300);

  const handleSearchChange = (value: string) => {
    debouncedSearch(value);
  };

  const handleStatusFilter = (status: string) => {
    setQuery(prev => ({ ...prev, status, page: 1 }));
  };

  const handleRoleFilter = (roleId: string) => {
    setQuery(prev => ({ ...prev, roleId, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  const handleStatusChange = async (userId: string, status: 'active' | 'inactive' | 'suspended') => {
    try {
      await updateUserStatus(userId, status);
      toast.success('用户状态更新成功');
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      await deleteUser(userId);
      toast.success('用户删除成功');
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: '活跃', className: 'bg-green-100 text-green-800', icon: UserCheck },
      inactive: { label: '非活跃', className: 'bg-yellow-100 text-yellow-800', icon: UserMinus },
      suspended: { label: '已暂停', className: 'bg-red-100 text-red-800', icon: UserX },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / (query.limit || 10));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600">管理系统中的所有用户</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="搜索用户..."
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                value={query.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="suspended">已暂停</option>
              </select>
            </div>
            <div>
              <select
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                value={query.roleId || ''}
                onChange={(e) => handleRoleFilter(e.target.value)}
              >
                <option value="">所有角色</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setQuery({ page: 1, limit: 10, search: '', status: '', roleId: '' })}
              >
                重置筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({total} 个用户)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" text="加载中..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">用户</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">邮箱</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">角色</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">状态</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">注册时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              {user.phone && (
                                <div className="text-sm text-gray-500">{user.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {user.role?.name || '无角色'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                        <td className="py-3 px-4 text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowUserModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <div className="relative">
                              <select
                                className="appearance-none bg-transparent border-0 text-sm cursor-pointer"
                                value={user.status}
                                onChange={(e) => handleStatusChange(user.id, e.target.value as any)}
                              >
                                <option value="active">活跃</option>
                                <option value="inactive">非活跃</option>
                                <option value="suspended">已暂停</option>
                              </select>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    显示 {((query.page || 1) - 1) * (query.limit || 10) + 1} 到{' '}
                    {Math.min((query.page || 1) * (query.limit || 10), total)} 条，共 {total} 条
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(query.page || 1) <= 1}
                      onClick={() => handlePageChange((query.page || 1) - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm">
                      第 {query.page || 1} 页，共 {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(query.page || 1) >= totalPages}
                      onClick={() => handlePageChange((query.page || 1) + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
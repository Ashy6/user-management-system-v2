# API 使用示例文档

本文档提供了用户管理系统所有主要API端点的详细使用示例，包括请求参数、响应格式和错误处理。

## 📋 目录

- [基础信息](#基础信息)
- [认证相关API](#认证相关api)
- [用户管理API](#用户管理api)
- [角色管理API](#角色管理api)
- [系统设置API](#系统设置api)
- [错误处理](#错误处理)
- [认证说明](#认证说明)

## 基础信息

### API 基础地址

```
开发环境: http://localhost:3000/api
生产环境: https://your-domain.com/api
```

### 通用请求头

```http
Content-Type: application/json
Authorization: Bearer <access_token>  # 需要认证的接口
```

### 通用响应格式

成功响应：
```json
{
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

错误响应：
```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 认证相关API

### 1. 发送验证码

发送邮箱验证码用于登录或注册。

**请求**
```http
POST /api/auth/send-code
Content-Type: application/json

{
  "email": "user@yourdomain.com",
  "type": "login"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| type | string | 是 | 验证码类型：`login`(登录) 或 `register`(注册) |

**响应示例**
```json
{
  "message": "验证码已发送到您的邮箱",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**cURL 示例**
```bash
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "type": "login"
  }'
```

### 2. 用户登录

使用邮箱和验证码进行登录。

**请求**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| code | string | 是 | 6位验证码 |

**响应示例**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "张三",
    "avatarUrl": null,
    "phone": "13800138000",
    "status": "active",
    "role": {
      "id": "role-id-123",
      "name": "普通用户",
      "description": "系统普通用户"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL 示例**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

### 3. 用户注册

使用邮箱验证码注册新用户。

**请求**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@yourdomain.com",
  "code": "123456",
  "name": "新用户",
  "phone": "13900139000"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| code | string | 是 | 6位验证码 |
| name | string | 是 | 用户姓名（1-50字符） |
| phone | string | 否 | 手机号码 |

**响应示例**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "name": "新用户",
    "avatarUrl": null,
    "phone": "13900139000",
    "status": "active",
    "role": {
      "id": "default-role-id",
      "name": "普通用户",
      "description": "系统默认用户角色"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 4. 刷新访问令牌

使用刷新令牌获取新的访问令牌。

**请求**
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. 获取当前用户信息

获取当前登录用户的详细信息。

**请求**
```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

**响应示例**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "张三",
  "avatarUrl": "https://example.com/avatar.jpg",
  "phone": "13800138000",
  "status": "active",
  "role": {
    "id": "role-id-123",
    "name": "管理员",
    "description": "系统管理员",
    "permissions": {
      "users": ["read", "create", "update", "delete"],
      "roles": ["read", "create", "update", "delete"]
    }
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 6. 退出登录

退出登录并使刷新令牌失效。

**请求**
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**
```json
{
  "message": "退出登录成功"
}
```

## 用户管理API

### 1. 获取用户列表

获取系统中的用户列表，支持分页和筛选。

**请求**
```http
GET /api/users?page=1&limit=10&search=张&status=active&roleId=role-id-123
Authorization: Bearer <access_token>
```

**查询参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认10 |
| search | string | 否 | 搜索关键词（姓名、邮箱） |
| status | string | 否 | 用户状态：`active`、`inactive`、`suspended` |
| roleId | string | 否 | 角色ID |

**响应示例**
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user1@example.com",
      "name": "张三",
      "avatarUrl": null,
      "phone": "13800138000",
      "status": "active",
      "role": {
        "id": "role-id-123",
        "name": "普通用户",
        "description": "系统普通用户"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### 2. 获取用户详情

根据用户ID获取用户详细信息。

**请求**
```http
GET /api/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
```

**响应示例**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "张三",
  "avatarUrl": "https://example.com/avatar.jpg",
  "phone": "13800138000",
  "status": "active",
  "roleId": "role-id-123",
  "role": {
    "id": "role-id-123",
    "name": "普通用户",
    "description": "系统普通用户",
    "permissions": {
      "users": ["read"]
    }
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. 创建用户

创建新用户（管理员功能）。

**请求**
```http
POST /api/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "新用户",
  "phone": "13900139000",
  "roleId": "role-id-123",
  "status": "active"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| email | string | 是 | 邮箱地址 |
| name | string | 是 | 用户姓名 |
| phone | string | 否 | 手机号码 |
| roleId | string | 否 | 角色ID |
| status | string | 否 | 用户状态，默认`active` |

**响应示例**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "email": "newuser@example.com",
  "name": "新用户",
  "avatarUrl": null,
  "phone": "13900139000",
  "status": "active",
  "roleId": "role-id-123",
  "role": {
    "id": "role-id-123",
    "name": "普通用户",
    "description": "系统普通用户"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. 更新用户信息

更新用户的基本信息。

**请求**
```http
PATCH /api/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "张三丰",
  "phone": "13800138001",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "roleId": "new-role-id"
}
```

**请求参数**
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| name | string | 否 | 用户姓名 |
| phone | string | 否 | 手机号码 |
| avatarUrl | string | 否 | 头像URL |
| roleId | string | 否 | 角色ID |
| status | string | 否 | 用户状态 |

### 5. 更新用户状态

单独更新用户的状态。

**请求**
```http
PATCH /api/users/550e8400-e29b-41d4-a716-446655440000/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "suspended"
}
```

### 6. 获取用户统计信息

获取用户相关的统计数据。

**请求**
```http
GET /api/users/statistics
Authorization: Bearer <access_token>
```

**响应示例**
```json
{
  "totalUsers": 150,
  "activeUsers": 120,
  "inactiveUsers": 20,
  "suspendedUsers": 10,
  "newUsersThisMonth": 25,
  "usersByRole": {
    "管理员": 5,
    "普通用户": 145
  }
}
```

## 角色管理API

### 1. 获取角色列表

获取系统中的所有角色。

**请求**
```http
GET /api/roles
Authorization: Bearer <access_token>
```

**响应示例**
```json
[
  {
    "id": "role-id-123",
    "name": "管理员",
    "description": "系统管理员，拥有所有权限",
    "permissions": {
      "users": ["read", "create", "update", "delete"],
      "roles": ["read", "create", "update", "delete"],
      "settings": ["read", "update"]
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "role-id-456",
    "name": "普通用户",
    "description": "系统普通用户",
    "permissions": {
      "users": ["read"]
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. 获取活跃角色列表

获取状态为活跃的角色列表。

**请求**
```http
GET /api/roles/active
Authorization: Bearer <access_token>
```

### 3. 获取可用权限列表

获取系统中所有可用的权限。

**请求**
```http
GET /api/roles/permissions
Authorization: Bearer <access_token>
```

**响应示例**
```json
{
  "users": ["read", "create", "update", "delete"],
  "roles": ["read", "create", "update", "delete"],
  "settings": ["read", "update"]
}
```

### 4. 创建角色

创建新的角色。

**请求**
```http
POST /api/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "编辑者",
  "description": "内容编辑者，可以管理用户信息",
  "permissions": {
    "users": ["read", "update"]
  }
}
```

### 5. 更新角色权限

更新角色的权限配置。

**请求**
```http
PATCH /api/roles/role-id-123/permissions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "permissions": {
    "users": ["read", "create", "update"],
    "roles": ["read"]
  }
}
```

## 系统设置API

### 1. 获取系统设置

获取当前的系统配置。

**请求**
```http
GET /api/settings
Authorization: Bearer <access_token>
```

**响应示例**
```json
{
  "emailConfig": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "username": "system@yourdomain.com",
    "from": "system@yourdomain.com"
  },
  "securityConfig": {
    "jwtAccessExpiration": 3600,
    "jwtRefreshExpiration": 604800,
    "verificationCodeExpiration": 300,
    "maxLoginAttempts": 5,
    "accountLockoutDuration": 900
  },
  "systemConfig": {
    "systemName": "用户管理系统",
    "systemDescription": "基于邮箱验证码的用户管理系统",
    "systemVersion": "1.0.0",
    "allowUserRegistration": true,
    "defaultUserRoleId": "default-role-id",
    "maintenanceMode": false,
    "maintenanceMessage": null
  }
}
```

### 2. 更新系统设置

更新系统配置（部分更新）。

**请求**
```http
PUT /api/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "systemConfig": {
    "systemName": "新的系统名称",
    "allowUserRegistration": false,
    "maintenanceMode": true,
    "maintenanceMessage": "系统维护中，请稍后访问"
  },
  "securityConfig": {
    "maxLoginAttempts": 3,
    "accountLockoutDuration": 1800
  }
}
```

## 错误处理

### 常见错误码

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权访问 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如邮箱已存在） |
| 422 | Unprocessable Entity | 数据验证失败 |
| 429 | Too Many Requests | 请求频率限制 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误响应示例

**验证错误**
```json
{
  "statusCode": 400,
  "message": [
    "邮箱格式不正确",
    "验证码不能为空"
  ],
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**权限不足**
```json
{
  "statusCode": 403,
  "message": "权限不足，无法访问此资源",
  "error": "Forbidden",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**资源不存在**
```json
{
  "statusCode": 404,
  "message": "用户不存在",
  "error": "Not Found",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**频率限制**
```json
{
  "statusCode": 429,
  "message": "请求过于频繁，请稍后再试",
  "error": "Too Many Requests",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 认证说明

### JWT 令牌

系统使用JWT（JSON Web Token）进行身份认证：

- **访问令牌（Access Token）**：用于API请求认证，有效期较短（默认1小时）
- **刷新令牌（Refresh Token）**：用于获取新的访问令牌，有效期较长（默认7天）

### 令牌使用流程

1. 用户登录成功后获得访问令牌和刷新令牌
2. 在请求头中携带访问令牌：`Authorization: Bearer <access_token>`
3. 访问令牌过期时，使用刷新令牌获取新的访问令牌
4. 刷新令牌过期时，需要重新登录

### 权限控制

系统采用基于角色的访问控制（RBAC）：

- 每个用户分配一个角色
- 每个角色拥有特定的权限集合
- API端点根据所需权限进行访问控制

权限格式：`{resource}:{action}`
- resource：资源类型（如 users、roles、settings）
- action：操作类型（如 read、create、update、delete）

### 安全建议

1. **HTTPS**：生产环境必须使用HTTPS
2. **令牌存储**：访问令牌存储在内存中，刷新令牌安全存储
3. **令牌刷新**：定期刷新访问令牌
4. **退出登录**：退出时清除所有令牌
5. **密钥管理**：定期更换JWT密钥

---

## 📞 技术支持

如有问题，请联系：
- 技术文档：查看项目README.md
- 问题反馈：GitHub Issues
- API文档：http://localhost:3000/api（Swagger UI）

---

*最后更新：2024年1月*
# 用户管理系统

基于邮箱验证码登录的用户管理系统，采用现代化的全栈技术架构。支持用户注册、登录、角色管理等完整的用户管理功能。

## 🚀 在线演示

- 前端应用：[待部署]
- API文档：[待部署]
- 管理后台：[待部署]

## 技术栈

### 前端

- React 19 + TypeScript
- TailwindCSS + Heroicons
- ahooks + axios
- Vite

### 后端

- NestJS + TypeScript
- TypeORM + PostgreSQL
- Swagger API文档
- JWT认证 + 邮箱验证码

## 项目结构

```
user-management-system/
├── frontend/          # React前端应用
├── backend/           # NestJS后端API
├── .trae/            # 项目文档
│   └── documents/    # 产品需求和技术架构文档
└── package.json      # 项目根配置
```

## 📋 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 12.0
- Redis >= 6.0 (可选，用于缓存)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd user-management-system
```

### 2. 安装依赖

```bash
# 安装所有依赖（前端 + 后端）
npm run install:all

# 或者分别安装
npm install              # 根目录依赖
cd frontend && npm install  # 前端依赖
cd ../backend && npm install # 后端依赖
```

### 3. 数据库配置

#### PostgreSQL 设置

```bash
# 创建数据库
createdb user_management

# 或使用 psql
psql -U postgres
CREATE DATABASE user_management;
```

#### Redis 设置（可选）

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 4. 环境变量配置

#### 后端环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_secure_password
DB_DATABASE=your_database_name

# JWT配置
JWT_SECRET=your-jwt-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-key-at-least-32-characters-long
JWT_REFRESH_EXPIRES_IN=7d

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 应用配置
PORT=3000
NODE_ENV=development
```

#### 前端环境变量

创建 `frontend/.env` 文件：

```env
# API配置
VITE_API_BASE_URL=http://localhost:3000/api

# 应用配置
VITE_APP_NAME=用户管理系统
VITE_APP_VERSION=1.0.0
```

### 5. 启动开发服务器

```bash
# 同时启动前后端开发服务器
npm run dev

# 或者分别启动
npm run dev:backend  # 后端服务 (http://localhost:3000)
npm run dev:frontend # 前端服务 (http://localhost:5173)
```

### 6. 访问应用

- 前端应用：<http://localhost:5173>
- API文档：<http://localhost:3000/api>
- 后端API：<http://localhost:3000/api/>*

## 📖 使用指南

### 用户注册和登录

1. **注册新用户**
   - 访问前端应用
   - 点击"注册"按钮
   - 输入邮箱地址
   - 查收邮箱验证码
   - 完成注册流程

2. **用户登录**
   - 输入已注册的邮箱
   - 获取并输入验证码
   - 系统自动登录并跳转到主页

3. **角色管理**
   - 管理员可以分配用户角色
   - 支持多种权限级别
   - 实时权限验证

### API 使用示例

#### 发送验证码

```bash
curl -X POST http://localhost:3000/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### 用户登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

#### 获取用户信息

```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏗️ 构建和部署

### 开发环境构建

```bash
# 构建所有项目
npm run build

# 分别构建
npm run build:frontend  # 构建前端
npm run build:backend   # 构建后端
```

### 生产环境部署

#### 方式一：传统部署

1. **准备生产环境**

```bash
# 安装 PM2（进程管理器）
npm install -g pm2

# 构建项目
npm run build
```

2. **启动后端服务**

```bash
cd backend
# 使用 PM2 启动
pm2 start dist/main.js --name "user-management-api"

# 或直接启动
npm run start:prod
```

3. **部署前端**

```bash
# 将 frontend/dist 目录部署到 Web 服务器
# 例如：nginx, apache 等
cp -r frontend/dist/* /var/www/html/
```

#### 方式二：Docker 部署

```bash
# 构建 Docker 镜像
docker build -t user-management-system .

# 运行容器
docker run -d -p 3000:3000 -p 5173:5173 user-management-system
```

### 环境变量（生产环境）

生产环境需要修改以下关键配置：

```env
# 安全配置
NODE_ENV=production
JWT_SECRET=production-jwt-secret-key-minimum-32-characters
JWT_REFRESH_SECRET=production-refresh-secret-key-minimum-32-characters

# 数据库配置
DB_HOST=your-production-db-host
DB_PASSWORD=your-production-db-password

# 邮箱配置
SMTP_USER=生产邮箱账号
SMTP_PASS=生产邮箱密码
```

## ✨ 功能特性

- ✅ **邮箱验证码登录/注册** - 无需密码，安全便捷
- ✅ **JWT令牌认证** - 支持访问令牌和刷新令牌
- ✅ **用户角色权限管理** - 灵活的权限控制系统
- ✅ **用户列表管理** - 完整的用户CRUD操作
- ✅ **系统设置配置** - 可配置的系统参数
- ✅ **响应式UI设计** - 适配各种设备屏幕
- ✅ **API文档自动生成** - Swagger/OpenAPI 3.0
- ✅ **数据验证** - 完整的输入验证和错误处理
- ✅ **缓存支持** - Redis缓存提升性能
- ✅ **日志记录** - 完整的操作日志

## 🧪 测试

### 运行测试

```bash
# 后端单元测试
cd backend
npm run test

# 后端测试覆盖率
npm run test:cov

# 后端端到端测试
npm run test:e2e

# 前端测试
cd frontend
npm run test
```

### 测试数据

系统提供测试用户数据：

- 管理员邮箱：`admin@example.com`
- 普通用户邮箱：`user@example.com`
- 测试验证码：`123456`（开发环境）

## 🔧 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
psql -U postgres -c "SELECT version();"

# 检查数据库是否存在
psql -U postgres -l | grep user_management
```

#### 2. 邮件发送失败

- 确认 SMTP 配置正确
- Gmail 需要使用应用专用密码
- 检查防火墙设置

#### 3. Redis 连接问题

```bash
# 检查 Redis 状态
redis-cli ping

# 查看 Redis 日志
tail -f /var/log/redis/redis-server.log
```

#### 4. 端口占用

```bash
# 检查端口占用
lsof -i :3000  # 后端端口
lsof -i :5173  # 前端端口

# 杀死占用进程
kill -9 <PID>
```

### 调试模式

```bash
# 后端调试模式
cd backend
npm run start:debug

# 查看详细日志
DEBUG=* npm run start:dev
```

## 📚 开发指南

### 项目文档

详细的开发文档请查看：

- [产品需求文档](.trae/documents/用户管理系统产品需求文档.md)
- [技术架构文档](.trae/documents/用户管理系统技术架构文档.md)
- [后台管理系统需求](.trae/documents/后台管理系统产品需求文档.md)
- [后台管理系统架构](.trae/documents/后台管理系统技术架构文档.md)

### 代码规范

```bash
# 代码格式化
cd backend
npm run format

# 代码检查
npm run lint
```

### Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具的变动
```

## 📖 API文档

启动后端服务后，访问以下地址查看API文档：

- **Swagger UI**: <http://localhost:3000/api>
- **JSON格式**: <http://localhost:3000/api-json>
- **YAML格式**: <http://localhost:3000/api-yaml>

### 主要API端点

| 功能 | 方法 | 端点 | 描述 |
|------|------|------|------|
| 发送验证码 | POST | `/api/auth/send-code` | 发送邮箱验证码 |
| 用户登录 | POST | `/api/auth/login` | 验证码登录 |
| 刷新令牌 | POST | `/api/auth/refresh` | 刷新访问令牌 |
| 用户信息 | GET | `/api/users/profile` | 获取当前用户信息 |
| 用户列表 | GET | `/api/users` | 获取用户列表 |
| 系统设置 | GET | `/api/settings` | 获取系统设置 |

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发环境设置

1. 确保满足系统要求
2. 按照快速开始指南设置项目
3. 运行测试确保环境正常
4. 开始开发！

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目：

- [NestJS](https://nestjs.com/) - 后端框架
- [React](https://reactjs.org/) - 前端框架
- [TypeORM](https://typeorm.io/) - ORM框架
- [TailwindCSS](https://tailwindcss.com/) - CSS框架

## 📞 联系我们

- 项目主页：[GitHub Repository]
- 问题反馈：[GitHub Issues]
- 邮箱：[z1801273437@163.com]

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！

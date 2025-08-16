# 部署指南 (Deployment Guide)

本文档提供了用户管理系统的多种部署方式，包括本地开发部署、Docker部署和生产环境部署。

## 目录

- [快速开始](#快速开始)
- [本地开发部署](#本地开发部署)
- [Docker部署](#docker部署)
- [Cloudflare部署](#cloudflare部署)
- [生产环境部署](#生产环境部署)
- [环境变量配置](#环境变量配置)
- [数据库配置](#数据库配置)
- [故障排除](#故障排除)

## 快速开始

### 使用部署脚本（推荐）

```bash
# 克隆项目
git clone <your-repo-url>
cd user-management-system

# 运行部署脚本
./deploy.sh
```

部署脚本会自动：
- 检查Node.js和npm环境
- 安装前后端依赖
- 配置环境变量
- 构建前端项目
- 启动服务

## 本地开发部署

### 前置要求

- Node.js 16+ 
- npm 8+
- PostgreSQL 13+ (可选，可使用SQLite)
- Redis 6+ (可选)

### 步骤

1. **安装依赖**
   ```bash
   # 后端依赖
   cd backend
   npm install
   
   # 前端依赖
   cd ../frontend
   npm install
   ```

2. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp backend/.env.example backend/.env
   
   # 编辑配置文件
   nano backend/.env
   ```

3. **启动服务**
   ```bash
   # 启动后端（开发模式）
   cd backend
   npm run start:dev
   
   # 启动前端（新终端）
   cd frontend
   npm run dev
   ```

4. **访问应用**
   - 前端: http://localhost:5173
   - 后端API: http://localhost:3000/api
   - API文档: http://localhost:3000/api/docs

## Docker部署

### 使用Docker Compose（推荐）

```bash
# 启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 单独构建镜像

```bash
# 构建后端镜像
docker build -t user-management-backend ./backend

# 构建前端镜像
docker build -t user-management-frontend ./frontend

# 运行容器
docker run -d -p 3000:3000 --name backend user-management-backend
docker run -d -p 80:80 --name frontend user-management-frontend
```

## Cloudflare部署

本项目支持部署到Cloudflare平台，前端使用Cloudflare Pages，后端使用Cloudflare Workers。

### 前置要求

- Cloudflare账户
- Wrangler CLI工具
- GitHub仓库（用于自动部署）

### 安装Wrangler CLI

```bash
npm install -g wrangler

# 登录Cloudflare
wrangler login
```

### 前端部署（Cloudflare Pages）

1. **自动部署（推荐）**
   - 在Cloudflare Dashboard中创建新的Pages项目
   - 连接GitHub仓库
   - 设置构建配置：
     - 构建命令: `cd frontend && npm install && npm run build`
     - 构建输出目录: `frontend/dist`
     - Root目录: `/`

2. **手动部署**
   ```bash
   # 构建前端
   cd frontend
   npm install
   npm run build
   
   # 部署到Cloudflare Pages
   wrangler pages deploy dist --project-name=your-frontend-project
   ```

3. **环境变量配置**
   在Cloudflare Pages设置中添加环境变量：
   ```
   VITE_API_URL=https://your-backend-worker.your-subdomain.workers.dev
   ```

### 后端部署（Cloudflare Workers）

1. **部署Workers**
   ```bash
   cd backend
   npm install
   npm run build
   
   # 部署到Cloudflare Workers
   wrangler deploy
   ```

2. **配置环境变量**
   ```bash
   # 设置环境变量
   wrangler secret put JWT_SECRET
   wrangler secret put EMAIL_PASS
   wrangler secret put DB_PASSWORD
   
   # 设置普通变量
   wrangler env put NODE_ENV production
   wrangler env put PORT 8787
   ```

3. **数据库配置**
   - 使用Cloudflare D1数据库或外部数据库服务
   - 配置数据库连接字符串
   - 运行数据库迁移

### 使用部署脚本

项目提供了自动化部署脚本：

```bash
# 运行Cloudflare部署脚本
./deploy-cloudflare.sh
```

脚本会自动：
- 检查Wrangler CLI安装
- 验证Cloudflare登录状态
- 构建前后端项目
- 部署到Cloudflare平台
- 提供部署后配置指南

### 域名配置

1. **前端域名**
   - 在Cloudflare Pages中配置自定义域名
   - 设置DNS记录
   - 启用HTTPS

2. **后端域名**
   - Workers默认提供 `*.workers.dev` 域名
   - 可配置自定义域名和路由

### Cloudflare特性配置

1. **缓存策略**
   ```javascript
   // 在Workers中配置缓存
   const cache = caches.default;
   const cacheKey = new Request(url, request);
   const response = await cache.match(cacheKey);
   ```

2. **安全设置**
   - 启用Web Application Firewall (WAF)
   - 配置DDoS防护
   - 设置访问规则

3. **性能优化**
   - 启用Cloudflare CDN
   - 配置图片优化
   - 使用Workers KV存储

### 监控和日志

1. **Workers日志**
   ```bash
   # 查看实时日志
   wrangler tail
   
   # 查看特定Worker日志
   wrangler tail --name your-worker-name
   ```

2. **Pages部署日志**
   - 在Cloudflare Dashboard中查看构建日志
   - 监控部署状态和错误

3. **Analytics**
   - 使用Cloudflare Analytics查看流量统计
   - 监控性能指标
   - 设置告警规则

### 故障排除

1. **部署失败**
   - 检查wrangler.toml配置
   - 验证环境变量设置
   - 查看构建日志

2. **CORS问题**
   - 确认Workers中CORS配置正确
   - 检查域名白名单设置

3. **数据库连接**
   - 验证数据库连接字符串
   - 检查网络访问权限
   - 确认SSL证书配置

### 成本优化

- Cloudflare Pages: 免费层支持无限静态网站
- Cloudflare Workers: 免费层每天100,000次请求
- 根据使用量选择合适的付费计划

## 生产环境部署

### 使用PM2（推荐）

1. **安装PM2**
   ```bash
   npm install -g pm2
   ```

2. **创建PM2配置文件**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [
       {
         name: 'user-management-backend',
         script: './backend/dist/main.js',
         cwd: './backend',
         instances: 'max',
         exec_mode: 'cluster',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         }
       }
     ]
   };
   ```

3. **部署应用**
   ```bash
   # 构建后端
   cd backend
   npm run build
   
   # 构建前端
   cd ../frontend
   npm run build
   
   # 启动PM2
   pm2 start ecosystem.config.js
   
   # 保存PM2配置
   pm2 save
   pm2 startup
   ```

### 使用Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 环境变量配置

### 后端环境变量 (backend/.env)

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=user_management

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 邮件配置
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 应用配置
PORT=3000
NODE_ENV=production
API_PREFIX=api

# 安全配置
BCRYPT_ROUNDS=12
EMAIL_CODE_EXPIRES_IN=300
RATE_LIMIT_MAX=100

# CORS配置
CORS_ORIGIN=http://localhost:5173,https://your-domain.com
```

### 前端环境变量 (frontend/.env)

```bash
# API配置
VITE_API_URL=http://localhost:3000/api

# 应用配置
VITE_APP_NAME=User Management System
VITE_APP_VERSION=1.0.0
```

## 数据库配置

### PostgreSQL设置

1. **创建数据库**
   ```sql
   CREATE DATABASE user_management;
   CREATE USER your_username WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE user_management TO your_username;
   ```

2. **运行迁移**
   ```bash
   cd backend
   npm run migration:run
   ```

### 使用Docker PostgreSQL

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_DB=user_management \
  -e POSTGRES_USER=your_username \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  postgres:15
```

## 健康检查

应用提供了健康检查端点：

- 后端健康检查: `GET /api/health`
- 前端健康检查: `GET /health`

## 监控和日志

### PM2监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 监控面板
pm2 monit
```

### Docker日志

```bash
# 查看容器日志
docker compose logs -f backend
docker compose logs -f frontend

# 查看所有服务日志
docker compose logs -f
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -ti:3000
   
   # 杀死进程
   kill -9 <PID>
   ```

2. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接参数
   - 检查防火墙设置

3. **邮件发送失败**
   - 验证SMTP配置
   - 检查邮箱应用密码
   - 确认邮箱服务商设置

4. **前端无法连接后端**
   - 检查CORS配置
   - 验证API URL配置
   - 确认后端服务运行状态

### 性能优化

1. **数据库优化**
   - 添加适当的索引
   - 使用连接池
   - 定期清理日志表

2. **缓存配置**
   - 启用Redis缓存
   - 配置静态资源缓存
   - 使用CDN加速

3. **负载均衡**
   - 使用PM2集群模式
   - 配置Nginx负载均衡
   - 使用容器编排

## 安全建议

1. **环境变量安全**
   - 使用强密码
   - 定期轮换密钥
   - 不要提交敏感信息到版本控制

2. **网络安全**
   - 使用HTTPS
   - 配置防火墙
   - 启用速率限制

3. **数据库安全**
   - 使用最小权限原则
   - 启用SSL连接
   - 定期备份数据

## 更新和维护

### 应用更新

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
npm install

# 重新构建
npm run build

# 重启服务
pm2 restart all
```

### 数据库迁移

```bash
# 运行新的迁移
npm run migration:run

# 回滚迁移（如需要）
npm run migration:revert
```

## 支持

如果遇到问题，请：

1. 查看应用日志
2. 检查环境配置
3. 参考故障排除部分
4. 提交Issue到项目仓库

---

**注意**: 在生产环境中，请确保所有敏感信息都已正确配置，并遵循安全最佳实践。
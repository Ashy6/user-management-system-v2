#!/bin/bash

# Cloudflare部署脚本
# 用于自动化部署前端和后端到Cloudflare

set -e

echo "🚀 开始Cloudflare部署流程..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
check_requirements() {
    echo -e "${BLUE}📋 检查部署要求...${NC}"
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ wrangler CLI未安装${NC}"
        echo "请运行: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 所有要求已满足${NC}"
}

# 检查登录状态
check_auth() {
    echo -e "${BLUE}🔐 检查Cloudflare登录状态...${NC}"
    
    if ! wrangler whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️  未登录Cloudflare，正在启动登录流程...${NC}"
        wrangler login
    else
        echo -e "${GREEN}✅ 已登录Cloudflare${NC}"
        wrangler whoami
    fi
}

# 构建后端
build_backend() {
    echo -e "${BLUE}🏗️  构建后端...${NC}"
    cd ../backend
    
    if [ ! -d "node_modules" ]; then
        echo "安装后端依赖..."
        npm install
    fi
    
    echo "构建后端代码..."
    npm run build
    
    cd ../cloudflare
    echo -e "${GREEN}✅ 后端构建完成${NC}"
}

# 部署后端到Workers
deploy_backend() {
    echo -e "${BLUE}🚀 部署后端到Cloudflare Workers...${NC}"
    
    # 部署Workers
    wrangler deploy --config wrangler.toml
    
    echo -e "${GREEN}✅ 后端部署完成${NC}"
    echo -e "${YELLOW}📝 请记住设置以下敏感环境变量:${NC}"
    echo "wrangler secret put JWT_SECRET"
    echo "wrangler secret put JWT_REFRESH_SECRET"
    echo "wrangler secret put DB_HOST"
    echo "wrangler secret put DB_USERNAME"
    echo "wrangler secret put DB_PASSWORD"
    echo "wrangler secret put SMTP_USER"
    echo "wrangler secret put SMTP_PASS"
}

# 构建前端
build_frontend() {
    echo -e "${BLUE}🏗️  构建前端...${NC}"
    cd ../frontend
    
    if [ ! -d "node_modules" ]; then
        echo "安装前端依赖..."
        npm install
    fi
    
    # 设置环境变量
    export VITE_API_URL="https://email-backend-worker.your-subdomain.workers.dev"
    export VITE_APP_NAME="User Management System"
    export VITE_APP_VERSION="1.0.0"
    
    echo "构建前端代码..."
    npm run build
    
    cd ../cloudflare
    echo -e "${GREEN}✅ 前端构建完成${NC}"
}

# 部署前端到Pages
deploy_frontend() {
    echo -e "${BLUE}🚀 部署前端到Cloudflare Pages...${NC}"
    
    # 创建Pages项目 (如果不存在)
    if ! wrangler pages project list | grep -q "email-frontend"; then
        echo "创建Pages项目..."
        wrangler pages project create email-frontend --production-branch main
    fi
    
    # 部署到Pages
    wrangler pages deploy ../frontend/dist --project-name email-frontend
    
    echo -e "${GREEN}✅ 前端部署完成${NC}"
}

# 显示部署信息
show_deployment_info() {
    echo -e "${GREEN}🎉 部署完成!${NC}"
    echo -e "${BLUE}📋 部署信息:${NC}"
    echo "前端URL: https://email-frontend.pages.dev"
    echo "后端URL: https://email-backend-worker.your-subdomain.workers.dev"
    echo ""
    echo -e "${YELLOW}📝 后续步骤:${NC}"
    echo "1. 设置后端敏感环境变量"
    echo "2. 配置自定义域名 (可选)"
    echo "3. 设置数据库连接"
    echo "4. 测试应用功能"
}

# 主函数
main() {
    case "$1" in
        "backend")
            check_requirements
            check_auth
            build_backend
            deploy_backend
            ;;
        "frontend")
            check_requirements
            check_auth
            build_frontend
            deploy_frontend
            ;;
        "all"|"")
            check_requirements
            check_auth
            build_backend
            deploy_backend
            build_frontend
            deploy_frontend
            show_deployment_info
            ;;
        "help")
            echo "用法: $0 [backend|frontend|all|help]"
            echo "  backend  - 仅部署后端"
            echo "  frontend - 仅部署前端"
            echo "  all      - 部署前端和后端 (默认)"
            echo "  help     - 显示帮助信息"
            ;;
        *)
            echo -e "${RED}❌ 未知参数: $1${NC}"
            echo "使用 '$0 help' 查看帮助"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
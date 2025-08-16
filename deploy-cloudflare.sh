#!/bin/bash

# Cloudflare 部署脚本
# Deploy script for Cloudflare Pages and Workers

set -e

echo "🚀 开始部署到 Cloudflare..."

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装，正在安装..."
    npm install -g wrangler
fi

# 检查是否已登录 Cloudflare
echo "📋 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请先登录 Cloudflare:"
    wrangler login
fi

# 构建前端
echo "🏗️  构建前端项目..."
cd frontend
npm install
npm run build

# 部署前端到 Cloudflare Pages
echo "📤 部署前端到 Cloudflare Pages..."
wrangler pages deploy dist --project-name=user-management-frontend

cd ..

# 构建后端
echo "🏗️  构建后端项目..."
cd backend
npm install
npm run build

# 部署后端到 Cloudflare Workers
echo "📤 部署后端到 Cloudflare Workers..."
wrangler deploy

cd ..

echo "✅ 部署完成！"
echo ""
echo "📋 部署信息:"
echo "前端: https://user-management-frontend.pages.dev"
echo "后端: https://user-management-backend.your-subdomain.workers.dev"
echo ""
echo "⚠️  请确保在 Cloudflare 控制台中配置以下内容:"
echo "1. 设置环境变量和密钥"
echo "2. 配置 D1 数据库"
echo "3. 配置 KV 存储"
echo "4. 更新 CORS 域名设置"
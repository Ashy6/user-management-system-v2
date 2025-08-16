#!/bin/bash

# Cloudflare环境变量设置脚本
# 用于配置Cloudflare Workers的环境变量和密钥

set -e

echo "🚀 Cloudflare环境变量设置脚本"
echo "================================="

# 检查wrangler是否已安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ 错误: wrangler CLI未安装"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查是否已登录Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ 错误: 未登录Cloudflare"
    echo "请运行: wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI已安装并已登录"
echo ""

# 进入后端目录
cd backend

echo "📝 设置Cloudflare Workers环境变量..."
echo ""

# 设置敏感环境变量 (使用secrets)
echo "🔐 设置敏感环境变量 (secrets):"
echo "请按提示输入以下敏感信息:"
echo ""

echo "1. JWT密钥 (建议使用强随机字符串):"
wrangler secret put JWT_SECRET

echo "2. 数据库密码:"
wrangler secret put DB_PASSWORD

echo "3. 邮件服务密码/应用密码:"
wrangler secret put EMAIL_PASS

echo "4. Redis密码 (如果使用Redis):"
read -p "是否使用Redis? (y/n): " use_redis
if [[ $use_redis == "y" || $use_redis == "Y" ]]; then
    wrangler secret put REDIS_PASSWORD
fi

echo ""
echo "🔧 设置普通环境变量:"

# 设置普通环境变量
echo "设置应用配置..."
wrangler env put NODE_ENV production
wrangler env put PORT 8787
wrangler env put API_PREFIX api
wrangler env put JWT_EXPIRES_IN 7d
wrangler env put BCRYPT_ROUNDS 12
wrangler env put EMAIL_CODE_EXPIRES_IN 300
wrangler env put RATE_LIMIT_MAX 100

# 数据库配置
echo ""
echo "📊 数据库配置:"
read -p "数据库主机地址: " db_host
read -p "数据库端口 (默认5432): " db_port
db_port=${db_port:-5432}
read -p "数据库用户名: " db_username
read -p "数据库名称: " db_database

wrangler env put DB_HOST "$db_host"
wrangler env put DB_PORT "$db_port"
wrangler env put DB_USERNAME "$db_username"
wrangler env put DB_DATABASE "$db_database"
wrangler env put DB_SSL true

# 邮件配置
echo ""
echo "📧 邮件配置:"
read -p "SMTP主机 (默认smtp.gmail.com): " email_host
email_host=${email_host:-smtp.gmail.com}
read -p "SMTP端口 (默认587): " email_port
email_port=${email_port:-587}
read -p "发件邮箱地址: " email_user
read -p "发件人显示名称 (默认使用邮箱地址): " email_from
email_from=${email_from:-$email_user}

wrangler env put EMAIL_HOST "$email_host"
wrangler env put EMAIL_PORT "$email_port"
wrangler env put EMAIL_USER "$email_user"
wrangler env put EMAIL_FROM "$email_from"

# Redis配置 (可选)
if [[ $use_redis == "y" || $use_redis == "Y" ]]; then
    echo ""
    echo "🔴 Redis配置:"
    read -p "Redis主机地址: " redis_host
    read -p "Redis端口 (默认6379): " redis_port
    redis_port=${redis_port:-6379}
    
    wrangler env put REDIS_HOST "$redis_host"
    wrangler env put REDIS_PORT "$redis_port"
fi

# CORS配置
echo ""
echo "🌐 CORS配置:"
read -p "前端域名 (例: https://your-app.pages.dev): " frontend_domain
read -p "自定义域名 (可选，多个域名用逗号分隔): " custom_domains

if [[ -n $custom_domains ]]; then
    cors_origin="$frontend_domain,$custom_domains"
else
    cors_origin="$frontend_domain"
fi

wrangler env put CORS_ORIGIN "$cors_origin"

echo ""
echo "✅ 环境变量设置完成!"
echo ""
echo "📋 设置摘要:"
echo "- 数据库: $db_host:$db_port/$db_database"
echo "- 邮件服务: $email_host:$email_port"
echo "- CORS域名: $cors_origin"
if [[ $use_redis == "y" || $use_redis == "Y" ]]; then
    echo "- Redis: $redis_host:$redis_port"
fi
echo ""
echo "🚀 现在可以运行部署命令:"
echo "   wrangler deploy"
echo ""
echo "📖 更多配置选项请参考 DEPLOYMENT.md 文档"

# 返回项目根目录
cd ..

echo ""
echo "🎉 Cloudflare Workers环境变量配置完成!"
echo "请确保前端也已正确配置 VITE_API_URL 环境变量"
echo "前端环境变量应设置为: https://your-worker-name.your-subdomain.workers.dev"
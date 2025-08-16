#!/bin/bash

# User Management System Deployment Script
# This script helps deploy the application locally without Docker

set -e

echo "🚀 Starting User Management System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16 or higher."
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_success "npm $(npm --version) is installed"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
}

# Check environment files
check_env_files() {
    print_status "Checking environment files..."
    
    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env file not found. Copying from .env.example..."
        cp backend/.env.example backend/.env
        print_warning "Please update backend/.env with your actual configuration"
    else
        print_success "Backend .env file exists"
    fi
    
    if [ ! -f "frontend/.env" ]; then
        print_status "Creating frontend .env file..."
        echo "VITE_API_URL=http://localhost:3000/api" > frontend/.env
        print_success "Frontend .env file created"
    else
        print_success "Frontend .env file exists"
    fi
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend
    npm run build
    cd ..
    print_success "Frontend built successfully"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Kill existing processes on ports 3000 and 5173/5174
    print_status "Stopping existing services..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    lsof -ti:5174 | xargs kill -9 2>/dev/null || true
    
    # Start backend in background
    print_status "Starting backend service..."
    cd backend
    npm run start:dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend in background
    print_status "Starting frontend service..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Wait a bit for services to start
    sleep 5
    
    print_success "Services started!"
    print_status "Backend running on: http://localhost:3000"
    print_status "Frontend running on: http://localhost:5173 or http://localhost:5174"
    print_status "API Documentation: http://localhost:3000/api/docs"
    
    echo ""
    print_status "To stop the services, run: kill $BACKEND_PID $FRONTEND_PID"
    echo ""
    print_success "Deployment completed! 🎉"
}

# Main deployment process
main() {
    echo "=========================================="
    echo "   User Management System Deployment"
    echo "=========================================="
    echo ""
    
    check_nodejs
    check_npm
    check_env_files
    install_backend_deps
    install_frontend_deps
    build_frontend
    start_services
    
    echo ""
    echo "=========================================="
    echo "         Deployment Summary"
    echo "=========================================="
    echo "✅ Backend: http://localhost:3000"
    echo "✅ Frontend: http://localhost:5173 or http://localhost:5174"
    echo "✅ API Docs: http://localhost:3000/api/docs"
    echo "✅ Health Check: http://localhost:3000/api/health"
    echo ""
    echo "📝 Note: Make sure to configure your database and email settings in backend/.env"
    echo "🔧 For production deployment, consider using PM2 or Docker"
    echo ""
}

# Run main function
main
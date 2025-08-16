-- PostgreSQL Database Initialization Script
-- This script will be executed when the PostgreSQL container starts for the first time

-- Create database if not exists (handled by POSTGRES_DB environment variable)
-- CREATE DATABASE IF NOT EXISTS user_management;

-- Use the database
\c user_management;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES profiles(id),
    UNIQUE(user_id, role_id)
);

-- Create login_logs table
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email',
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_email ON login_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_permissions JSONB := '[]'::jsonb;
    role_perms JSONB;
BEGIN
    -- Get all permissions from user's roles
    FOR role_perms IN
        SELECT r.permissions
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = user_uuid AND r.is_active = true
    LOOP
        -- Merge permissions
        user_permissions := user_permissions || role_perms;
    END LOOP;
    
    -- Remove duplicates and return
    SELECT jsonb_agg(DISTINCT elem)
    INTO user_permissions
    FROM jsonb_array_elements_text(user_permissions) elem;
    
    RETURN COALESCE(user_permissions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Super Administrator with full system access', '["*"]'::jsonb),
('admin', 'Administrator with management access', '["users:read", "users:write", "roles:read", "roles:write", "settings:read", "settings:write"]'::jsonb),
('user', 'Regular user with basic access', '["profile:read", "profile:write"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO settings (key, value, description, is_public) VALUES
('app_name', '"User Management System"', 'Application name', true),
('app_version', '"1.0.0"', 'Application version', true),
('maintenance_mode', 'false', 'Enable maintenance mode', false),
('registration_enabled', 'true', 'Allow new user registration', false),
('email_verification_required', 'true', 'Require email verification for new users', false),
('max_login_attempts', '5', 'Maximum login attempts before lockout', false),
('session_timeout', '3600', 'Session timeout in seconds', false)
ON CONFLICT (key) DO NOTHING;

-- Create views for statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
    COUNT(*) FILTER (WHERE last_login_at >= CURRENT_DATE - INTERVAL '30 days') as active_users_30d
FROM profiles;

CREATE OR REPLACE VIEW login_stats AS
SELECT 
    COUNT(*) as total_logins,
    COUNT(*) FILTER (WHERE success = true) as successful_logins,
    COUNT(*) FILTER (WHERE success = false) as failed_logins,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as logins_24h,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours') as unique_users_24h
FROM login_logs;

-- Grant permissions (adjust as needed for your application user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

COMMIT;
-- 创建系统设置表
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_editable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_type ON settings(type);
CREATE INDEX idx_settings_is_public ON settings(is_public);

-- 插入默认系统设置
INSERT INTO settings (key, value, type, description, is_public, is_editable) VALUES
-- 邮件配置
('email.host', 'localhost', 'string', 'SMTP服务器地址', FALSE, TRUE),
('email.port', '587', 'number', 'SMTP端口号', FALSE, TRUE),
('email.secure', 'false', 'boolean', '是否使用SSL', FALSE, TRUE),
('email.username', '', 'string', 'SMTP用户名', FALSE, TRUE),
('email.password', '', 'string', 'SMTP密码', FALSE, TRUE),
('email.from', 'noreply@yourdomain.com', 'string', '发件人邮箱', FALSE, TRUE),

-- 安全配置
('security.jwt_access_expiration', '3600', 'number', 'JWT访问令牌过期时间（秒）', FALSE, TRUE),
('security.jwt_refresh_expiration', '86400', 'number', 'JWT刷新令牌过期时间（秒）', FALSE, TRUE),
('security.verification_code_expiration', '300', 'number', '验证码过期时间（秒）', FALSE, TRUE),
('security.max_login_attempts', '5', 'number', '最大登录尝试次数', FALSE, TRUE),
('security.account_lockout_duration', '900', 'number', '账户锁定时间（秒）', FALSE, TRUE),

-- 系统配置
('system.name', '用户管理系统', 'string', '系统名称', TRUE, TRUE),
('system.description', '基于NestJS和React的用户管理系统', 'string', '系统描述', TRUE, TRUE),
('system.version', '1.0.0', 'string', '系统版本', TRUE, FALSE),
('system.allow_user_registration', 'true', 'boolean', '是否允许用户注册', TRUE, TRUE),
('system.default_user_role_id', '', 'string', '默认用户角色ID', FALSE, TRUE),
('system.maintenance_mode', 'false', 'boolean', '系统维护模式', TRUE, TRUE),
('system.maintenance_message', '', 'string', '维护模式消息', TRUE, TRUE);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
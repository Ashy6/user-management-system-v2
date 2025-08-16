-- 创建默认角色
INSERT INTO roles
  (id, name, description, permissions, is_active, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '超级管理员', '系统超级管理员，拥有所有权限',
    '{
   "users": ["read", "create", "update", "delete"],
   "roles": ["read", "create", "update", "delete"],
   "dashboard": ["read"],
   "settings": ["read", "update"],
   "logs": ["read"]
 }', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', '管理员', '系统管理员，拥有大部分管理权限',
    '{
   "users": ["read", "create", "update"],
   "roles": ["read"],
   "dashboard": ["read"],
   "settings": ["read"],
   "logs": ["read"]
 }', true, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', '普通用户', '普通用户，只能查看基础信息',
    '{
   "dashboard": ["read"]
 }', true, NOW(), NOW())
ON CONFLICT
(id) DO NOTHING;

-- 创建默认超级管理员用户
INSERT INTO users
  (id, email, name, role_id, status, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@yourdomain.com', '系统管理员', '550e8400-e29b-41d4-a716-446655440001', 'active', NOW(), NOW())
ON CONFLICT
(email) DO NOTHING;
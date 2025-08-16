import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { EmailCodeType, EmailCode } from '../src/entities/email-code.entity';
// import { RedisService } from '../src/services/redis.service'; // Redis service not implemented yet
import { EmailService } from '../src/services/email.service';
import { TestUtils } from './test-utils';

describe('Integration E2E Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let emailCodeRepository: Repository<EmailCode>;
  // let redisService: RedisService; // Redis service not implemented yet
  let emailService: EmailService;
  
  let adminUser: User;
  let normalUser: User;
  let adminToken: string;
  let normalToken: string;
  let adminRole: Role;
  let userRole: Role;
  
  const testCode = '123456';
  const CACHE_TTL = 300;
  const PERFORMANCE_THRESHOLD = 2000;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    emailCodeRepository = moduleFixture.get<Repository<EmailCode>>(getRepositoryToken(EmailCode));
    // redisService = moduleFixture.get<RedisService>(RedisService); // Redis service not implemented yet
    emailService = moduleFixture.get<EmailService>(EmailService);

    // 使用TestUtils创建管理员token
    const adminRoleName = `IntegrationAdmin${Date.now().toString().slice(-6)}`;
    const adminResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      'integration-admin@example.com',
      'Integration Admin',
      '13800138001',
      adminRoleName,
      [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'users', action: 'delete' },
        { resource: 'roles', action: 'create' },
        { resource: 'roles', action: 'read' },
        { resource: 'roles', action: 'update' },
        { resource: 'roles', action: 'delete' },
        { resource: 'settings', action: 'read' },
        { resource: 'settings', action: 'update' },
      ]
    );
    adminToken = adminResult.token;
    adminUser = adminResult.user;
    adminRole = adminResult.role;

    // 使用TestUtils创建普通用户token
    const userRoleName = `IntegrationUser${Date.now().toString().slice(-6)}`;
    const userResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      'integration-user@example.com',
      'Integration User',
      '13800138002',
      userRoleName,
      [
        { resource: 'users', action: 'read' },
      ]
    );
    normalToken = userResult.token;
    normalUser = userResult.user;
    userRole = userResult.role;
  });

  afterAll(async () => {
    // 使用TestUtils清理测试数据
    const testEmails = ['integration-admin@example.com', 'integration-user@example.com'];
    const testRoleNames = [adminRole?.name, userRole?.name].filter(Boolean);
    
    await TestUtils.cleanupTestData(
      userRepository,
      emailCodeRepository,
      roleRepository,
      testEmails,
      testRoleNames
    );
    
    // Redis服务未实现，跳过缓存清理
    await app.close();
  });

  beforeEach(async () => {
    // 测试前准备
    // Redis服务未实现，跳过缓存操作
  });

  describe('用户-角色集成测试', () => {
    it('应该能够创建用户并正确分配角色权限', async () => {
      // 创建新角色
      const testRole = roleRepository.create({
        name: 'Integration Test Role',
        description: 'Role for integration testing',
        permissions: [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'create' },
        ],
        isActive: true,
      });
      await roleRepository.save(testRole);

      // 创建用户并分配角色
      const createUserResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'integration-test@example.com',
          name: 'Integration Test User',
          phone: '13800138100',
          roleId: testRole.id,
        })
        .expect(201);

      const createdUser = createUserResponse.body;
      expect(createdUser.role.id).toBe(testRole.id);
      expect(createdUser.role.name).toBe('Integration Test Role');

      // 验证用户权限
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({
          email: createdUser.email,
          type: 'login',
        })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: createdUser.email,
          code: testCode,
        })
        .expect(200);
      const userToken = loginRes.body.accessToken;

      // 用户应该能够读取用户列表
      const readResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(readResponse.body.data).toBeDefined();

      // 清理测试数据
      await userRepository.delete({ id: createdUser.id });
      await roleRepository.delete({ id: testRole.id });
    });

    it('应该能够更新用户角色并正确应用权限', async () => {
      // 创建两个不同权限的角色
      const limitedRole = roleRepository.create({
        name: 'Limited Role',
        description: 'Role with limited permissions',
        permissions: [{ resource: 'users', action: 'read' }],
        isActive: true,
      });
      await roleRepository.save(limitedRole);

      const extendedRole = roleRepository.create({
        name: 'Extended Role',
        description: 'Role with extended permissions',
        permissions: [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'update' },
        ],
        isActive: true,
      });
      await roleRepository.save(extendedRole);

      // 创建用户并分配限制角色
      const testUser = userRepository.create({
        email: 'role-update-test@example.com',
        name: 'Role Update Test User',
        phone: '13800138998',
        status: UserStatus.ACTIVE,
        role: limitedRole,
      });
      await userRepository.save(testUser);

      // 用户登录获取token
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({
          email: testUser.email,
          type: 'login',
        })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          code: testCode,
        })
        .expect(200);
      const testUserToken = loginRes.body.accessToken;

      // 验证用户只有读权限（无法创建用户）
      const createAttempt1 = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          email: 'should-fail@example.com',
          name: 'Should Fail User',
          phone: '13800138997',
          roleId: limitedRole.id,
        });
      expect(createAttempt1.status).toBe(403);

      // 管理员更新用户角色
      await request(app.getHttpServer())
        .put(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roleId: extendedRole.id,
        })
        .expect(200);

      // 用户重新登录获取新权限
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({
          email: testUser.email,
          type: 'login',
        })
        .expect(200);

      const newLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          code: testCode,
        })
        .expect(200);
      const newTestUserToken = newLoginRes.body.accessToken;

      // 验证用户现在有创建权限
      const createAttempt2 = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${newTestUserToken}`)
        .send({
          email: 'should-succeed@example.com',
          name: 'Should Succeed User',
          phone: '13800138996',
          roleId: limitedRole.id,
        })
        .expect(201);

      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
      await userRepository.delete({ id: createAttempt2.body.id });
      await roleRepository.delete({ id: limitedRole.id });
      await roleRepository.delete({ id: extendedRole.id });
    });

    it('应该正确处理角色删除时的用户关联', async () => {
      // 创建测试角色
      const testRole = roleRepository.create({
        name: 'To Be Deleted Role',
        description: 'Role that will be deleted',
        permissions: [{ resource: 'users', action: 'read' }],
        isActive: true,
      });
      await roleRepository.save(testRole);

      // 创建使用该角色的用户
      const testUser = userRepository.create({
        email: 'role-deletion-test@example.com',
        name: 'Role Deletion Test User',
        phone: '13800138995',
        status: UserStatus.ACTIVE,
        role: testRole,
      });
      await userRepository.save(testUser);

      // 尝试删除正在使用的角色
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // 应该返回错误，因为角色正在被使用
      expect(deleteResponse.status).toBe(400);
      expect(deleteResponse.body.message).toContain('role is in use');

      // 验证角色仍然存在
      const getRoleResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRoleResponse.body.id).toBe(testRole.id);

      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
      await roleRepository.delete({ id: testRole.id });
    });
  });

  describe('认证-权限集成测试', () => {
    it('应该在用户状态变更后正确更新权限', async () => {
      // 创建活跃用户
      const testUser = userRepository.create({
        email: 'status-change-test@example.com',
        name: 'Status Change Test User',
        phone: '13800138994',
        status: UserStatus.ACTIVE,
        role: userRole,
      });
      await userRepository.save(testUser);

      // 用户登录
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({
          email: testUser.email,
          type: 'login',
        })
        .expect(200);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          code: testCode,
        })
        .expect(200);
      const testUserToken = loginRes.body.accessToken;

      // 验证用户可以访问资源
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // 管理员禁用用户
      await request(app.getHttpServer())
        .put(`/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.INACTIVE })
        .expect(200);

      // 验证被禁用的用户无法访问资源
      const accessResponse2 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(accessResponse2.status).toBe(401); // 或者403，取决于实现

      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
    });

    it('应该正确处理token刷新和权限更新', async () => {
      // 用户登录获取token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: normalUser.email,
          code: testCode,
        });

      const accessToken = loginRes.body.accessToken;
      const refreshToken = loginRes.body.refreshToken;

      // 验证初始权限
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 管理员更新用户角色（增加权限）
      await request(app.getHttpServer())
        .put(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: adminRole.id })
        .expect(200);

      // 刷新token
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newAccessToken = refreshRes.body.accessToken;

      // 验证新token具有更新后的权限
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          email: 'permission-test@example.com',
          name: 'Permission Test User',
          phone: '13800138993',
          roleId: userRole.id,
        })
        .expect(201);

      // 恢复用户原始角色
      await request(app.getHttpServer())
        .put(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: userRole.id })
        .expect(200);
    });
  });

  describe('数据一致性集成测试', () => {
    it('应该在事务中正确处理用户创建和角色分配', async () => {
      const testRole = roleRepository.create({
        name: 'Transaction Test Role',
        description: 'Role for transaction testing',
        permissions: [{ resource: 'users', action: 'read' }],
        isActive: true,
      });
      await roleRepository.save(testRole);

      // 创建用户（应该在事务中完成）
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'transaction-test@example.com',
          name: 'Transaction Test User',
          phone: '13800138992',
          roleId: testRole.id,
        })
        .expect(201);

      const createdUser = createResponse.body;

      // 验证用户和角色关联正确
      const getUserResponse = await request(app.getHttpServer())
        .get(`/users/${createdUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getUserResponse.body.role.id).toBe(testRole.id);

      // 清理测试数据
      await userRepository.delete({ id: createdUser.id });
      await roleRepository.delete({ id: testRole.id });
    });

    it('应该正确处理并发用户创建', async () => {
      const testRole = roleRepository.create({
        name: 'Concurrent Test Role',
        description: 'Role for concurrent testing',
        permissions: [{ resource: 'users', action: 'read' }],
        isActive: true,
      });
      await roleRepository.save(testRole);

      // 并发创建多个用户
      const createPromises = [];
      for (let i = 0; i < 5; i++) {
        createPromises.push(
          request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              email: `concurrent-test-${i}@example.com`,
              name: `Concurrent Test User ${i}`,
              phone: `1380013899${i}`,
              roleId: testRole.id,
            })
        );
      }

      const responses = await Promise.all(createPromises);
      const createdUserIds: string[] = [];

      // 验证所有用户都创建成功
      responses.forEach((response: any) => {
        expect(response.status).toBe(201);
        createdUserIds.push(response.body.id);
      });

      expect(createdUserIds.length).toBe(5);

      // 清理测试数据
      for (const userId of createdUserIds) {
        await userRepository.delete({ id: userId });
      }
      await roleRepository.delete({ id: testRole.id });
    });
  });

  describe('缓存-数据库集成测试', () => {
    it('应该在数据更新后正确清除缓存', async () => {
      // 创建测试用户
      const testUser = userRepository.create({
        email: 'cache-db-test@example.com',
        name: 'Cache DB Test User',
        phone: '13800138991',
        status: UserStatus.ACTIVE,
        role: userRole,
      });
      await userRepository.save(testUser);

      // 第一次获取用户（建立缓存）
      const response1 = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response1.body.name).toBe('Cache DB Test User');

      // 更新用户信息
      await request(app.getHttpServer())
        .put(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Cache DB Test User',
        })
        .expect(200);

      // 再次获取用户应该返回更新后的数据
      const response2 = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response2.body.name).toBe('Updated Cache DB Test User');

      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
    });

    it('应该在缓存失效时正确回退到数据库', async () => {
      // 创建测试用户
      const testUser = userRepository.create({
        email: 'cache-fallback-test@example.com',
        name: 'Cache Fallback Test User',
        phone: '13800138990',
        status: UserStatus.ACTIVE,
        role: userRole,
      });
      await userRepository.save(testUser);

      // 清除所有缓存
      await redisService.flushall();

      // 请求用户信息应该从数据库获取
      const response = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.name).toBe('Cache Fallback Test User');

      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
    });
  });

  describe('邮件服务集成测试', () => {
    it('应该能够发送验证码邮件', async () => {
      const testEmail = 'email-integration-test@example.com';

      // 发送验证码
      const sendResponse = await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({ email: testEmail });

      expect([200, 202]).toContain(sendResponse.status);

      // 验证缓存中存在验证码
      const cachedCode = await redisService.get(`verification_code:${testEmail}`);
      expect(cachedCode).toBeDefined();
      expect(cachedCode).toMatch(/^\d{6}$/);
    });

    it('应该正确处理邮件发送失败', async () => {
      // 使用无效邮箱地址
      const invalidEmail = 'invalid-email-format';

      const sendResponse = await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({ email: invalidEmail });

      expect(sendResponse.status).toBe(400);
      expect(sendResponse.body.message).toContain('email');
    });
  });

  describe('性能集成测试', () => {
    it('应该在规定时间内完成复杂操作', async () => {
      const startTime = Date.now();

      // 创建角色
      const testRole = roleRepository.create({
        name: 'Performance Test Role',
        description: 'Role for performance testing',
        permissions: [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'create' },
        ],
        isActive: true,
      });
      await roleRepository.save(testRole);

      // 创建用户
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'performance-test@example.com',
          name: 'Performance Test User',
          phone: '13800138989',
          roleId: testRole.id,
        })
        .expect(201);

      // 用户登录
      await redisService.set(`verification_code:performance-test@example.com`, testCode, CACHE_TTL);
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'performance-test@example.com',
          code: testCode,
        })
        .expect(200);

      // 访问资源
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 整个流程应该在合理时间内完成
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD);

      // 清理测试数据
      await userRepository.delete({ id: createResponse.body.id });
      await roleRepository.delete({ id: testRole.id });
    });

    it('应该能够处理大量并发请求', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 10 })
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 所有请求都应该成功
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });

      // 并发请求应该在合理时间内完成
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('错误恢复集成测试', () => {
    it('应该正确处理数据库连接错误', async () => {
      // 这个测试在实际环境中需要模拟数据库连接失败
      // 在测试环境中，我们测试错误处理逻辑
      
      // 尝试访问不存在的用户
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('应该正确处理Redis连接错误', async () => {
      // 清除所有缓存模拟Redis不可用
      await redisService.flushall();
      
      // 系统应该能够正常工作（回退到数据库）
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('安全集成测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ search: maliciousInput })
        .set('Authorization', `Bearer ${adminToken}`);
      
      // 请求应该正常处理，不会执行恶意SQL
      expect([200, 400]).toContain(response.status);
      
      // 验证用户表仍然存在
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(usersResponse.body.data).toBeDefined();
    });

    it('应该防止权限绕过攻击', async () => {
      // 普通用户尝试访问管理员功能
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({
          email: 'unauthorized-test@example.com',
          name: 'Unauthorized Test User',
          phone: '13800138988',
          roleId: userRole.id,
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');
    });

    it('应该防止敏感数据泄露', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalToken}`);
      
      expect(response.status).toBe(200);
      
      // 响应不应该包含敏感信息
      expect(response.body.password).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
    });
  });
});
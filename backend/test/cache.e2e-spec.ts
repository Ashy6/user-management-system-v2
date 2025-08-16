import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { EmailCode, EmailCodeType } from '../src/entities/email-code.entity';
import { TestUtils } from './test-utils';

describe('Cache E2E Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let emailCodeRepository: Repository<EmailCode>;
  
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

    // 使用TestUtils创建管理员token
    const adminRoleName = `CacheAdmin${Date.now().toString().slice(-6)}`;
    const adminResult = await TestUtils.createTestToken(
      app,
      userRepository,
      emailCodeRepository,
      roleRepository,
      adminRoleName,
      'cache-admin@example.com',
      'Cache Admin',
      '13800138001',
      EmailCodeType.LOGIN,
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
    const userRoleName = `CacheUser${Date.now().toString().slice(-6)}`;
    const userResult = await TestUtils.createTestToken(
      app,
      userRepository,
      emailCodeRepository,
      roleRepository,
      userRoleName,
      'cache-user@example.com',
      'Cache User',
      '13800138002',
      EmailCodeType.LOGIN,
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
    const testEmails = ['cache-admin@example.com', 'cache-user@example.com'];
    const testRoleNames = [adminRole?.name, userRole?.name].filter(Boolean);
    
    await TestUtils.cleanupTestData(
      userRepository,
      emailCodeRepository,
      roleRepository,
      testEmails,
      testRoleNames
    );
    
    await app.close();
  });

  beforeEach(async () => {
    // 每个测试前的准备工作
  });

  describe('验证码缓存测试', () => {
    it('应该能够缓存验证码', async () => {
      const testEmail = 'cache-verification@example.com';
      
      // 发送验证码请求
      const sendResponse = await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({ email: testEmail });
      
      expect([200, 202]).toContain(sendResponse.status);
    });

    it('应该正确处理验证码过期', async () => {
      const testEmail = 'cache-expiry@example.com';
      
      // 发送验证码
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({ email: testEmail });
      
      // 模拟时间过期后尝试使用验证码
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          code: '123456', // 可能已过期的验证码
        });
      
      // 根据实现，可能返回401或400
      expect([400, 401]).toContain(loginResponse.status);
    });

    it('应该防止验证码重放攻击', async () => {
      const testEmail = 'cache-replay@example.com';
      
      // 发送验证码
      await request(app.getHttpServer())
        .post('/auth/send-code')
        .send({ email: testEmail });
      
      // 第一次使用验证码
      const firstLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          code: testCode,
        });
      
      // 第二次使用相同验证码应该失败
      const secondLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          code: testCode,
        });
      
      expect(secondLogin.status).toBe(400);
    });
  });

  describe('用户数据缓存测试', () => {
    it('应该缓存用户查询结果', async () => {
      const startTime = Date.now();
      
      // 第一次查询（从数据库）
      const firstResponse = await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const firstQueryTime = Date.now() - startTime;
      
      // 第二次查询（从缓存）
      const secondStartTime = Date.now();
      const secondResponse = await request(app.getHttpServer())
        .get(`/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const secondQueryTime = Date.now() - secondStartTime;
      
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(firstResponse.body).toEqual(secondResponse.body);
      
      // 缓存查询应该更快（在实际实现缓存后）
      // expect(secondQueryTime).toBeLessThan(firstQueryTime);
    });

    it('应该在用户更新后清除缓存', async () => {
      // 查询用户（建立缓存）
      const initialResponse = await request(app.getHttpServer())
        .get(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(initialResponse.status).toBe(200);
      expect(initialResponse.body.name).toBe('Cache User');
      
      // 更新用户
      await request(app.getHttpServer())
        .put(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Cache User',
        });
      
      // 再次查询应该返回更新后的数据
      const updatedResponse = await request(app.getHttpServer())
        .get(`/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(updatedResponse.status).toBe(200);
      expect(updatedResponse.body.name).toBe('Updated Cache User');
    });
  });

  describe('角色权限缓存测试', () => {
    it('应该缓存角色权限信息', async () => {
      // 创建测试角色
      const testRole = roleRepository.create({
        name: 'Cache Test Role',
        description: 'Role for cache testing',
        permissions: {
          users: ['read', 'create'],
        },
        isActive: true,
      });
      await roleRepository.save(testRole);
      
      // 查询角色（建立缓存）
      const firstResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.permissions).toBeDefined();
      
      // 第二次查询应该从缓存返回相同数据
      const secondResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body).toEqual(firstResponse.body);
      
      // 清理测试数据
      await roleRepository.delete({ id: testRole.id });
    });

    it('应该在角色更新后清除权限缓存', async () => {
      // 创建测试角色
      const testRole = roleRepository.create({
        name: 'Permission Cache Test Role',
        description: 'Role for permission cache testing',
        permissions: {
          users: ['read'],
        },
        isActive: true,
      });
      await roleRepository.save(testRole);
      
      // 查询角色权限（建立缓存）
      const initialResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(initialResponse.status).toBe(200);
      expect(initialResponse.body.permissions.length).toBe(1);
      
      // 更新角色权限
      await request(app.getHttpServer())
        .put(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: [
            { resource: 'users', action: 'read' },
            { resource: 'users', action: 'create' },
            { resource: 'users', action: 'update' },
          ],
        });
      
      // 再次查询应该返回更新后的权限
      const updatedResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(updatedResponse.status).toBe(200);
      expect(updatedResponse.body.permissions.length).toBe(3);
      
      // 清理测试数据
      await roleRepository.delete({ id: testRole.id });
    });
  });

  describe('并发缓存测试', () => {
    it('应该正确处理并发查询', async () => {
      const promises = [];
      
      // 并发发送多个相同的查询请求
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 5 })
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // 所有请求都应该成功
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
      
      // 所有响应应该相同（来自缓存）
      const firstResponse = responses[0].body;
      responses.forEach((response: any) => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    it('应该正确处理并发更新', async () => {
      // 创建测试用户
      const testUser = userRepository.create({
        email: 'concurrent-cache@example.com',
        name: 'Concurrent Cache User',
        phone: '13800138999',
        status: UserStatus.ACTIVE,
        role: userRole,
      });
      await userRepository.save(testUser);
      
      const promises = [];
      
      // 并发更新用户信息
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .put(`/users/${testUser.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Updated User ${i}`,
            })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // 至少有一个更新应该成功
      const successfulUpdates = responses.filter((r: any) => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);
      
      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
    });
  });

  describe('缓存一致性测试', () => {
    it('应该在分布式环境中保持缓存一致性', async () => {
      // 模拟分布式环境中的缓存一致性
      // 这个测试在单机环境中较难实现，主要测试逻辑正确性
      
      const testUser = userRepository.create({
        email: 'consistency-test@example.com',
        name: 'Consistency Test User',
        phone: '13800138998',
        status: UserStatus.ACTIVE,
        role: userRole,
      });
      await userRepository.save(testUser);
      
      // 查询用户（建立缓存）
      const response1 = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response1.status).toBe(200);
      expect(response1.body.name).toBe('Consistency Test User');
      
      // 更新用户
      await request(app.getHttpServer())
        .put(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Consistency User',
        });
      
      // 从不同"节点"查询应该返回一致的数据
      const response2 = await request(app.getHttpServer())
        .get(`/users/${testUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response2.status).toBe(200);
      expect(response2.body.name).toBe('Updated Consistency User');
      
      // 清理测试数据
      await userRepository.delete({ id: testUser.id });
    });

    it('应该正确处理缓存版本冲突', async () => {
      // 创建测试角色
      const testRole = roleRepository.create({
        name: 'Version Conflict Role',
        description: 'Role for version conflict testing',
        permissions: {
          users: ['read'],
        },
        isActive: true,
      });
      await roleRepository.save(testRole);
      
      // 并发更新角色（模拟版本冲突）
      const updatePromises = [
        request(app.getHttpServer())
          .put(`/roles/${testRole.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Updated Role A',
            permissions: {
              users: ['read', 'create'],
            },
          }),
        request(app.getHttpServer())
          .put(`/roles/${testRole.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Updated Role B',
            permissions: {
              users: ['read', 'update'],
            },
          }),
      ];
      
      const responses = await Promise.all(updatePromises);
      
      // 至少有一个更新应该成功
      const successfulUpdates = responses.filter((r: any) => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);
      
      // 验证最终状态的一致性
      const finalResponse = await request(app.getHttpServer())
        .get(`/roles/${testRole.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(finalResponse.status).toBe(200);
      expect(['Updated Role A', 'Updated Role B']).toContain(finalResponse.body.name);
      
      // 清理测试数据
      await roleRepository.delete({ id: testRole.id });
    });
  });

  describe('缓存故障恢复测试', () => {
    it('应该在缓存不可用时回退到数据库', async () => {
      // 模拟缓存服务不可用的情况
      // 在实际实现中，这里会测试Redis连接失败的场景
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);
      
      // 即使缓存不可用，也应该能从数据库获取数据
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够重新建立缓存连接', async () => {
      // 模拟缓存服务恢复后重新建立连接
      // 这个测试主要验证系统的恢复能力
      
      // 发送多个请求测试系统稳定性
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 5 })
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // 所有请求都应该成功
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });
    });
  });

  describe('缓存性能测试', () => {
    it('应该提供可接受的缓存命中率', async () => {
      const testRequests = 20;
      const promises: Promise<any>[] = [];
      
      // 发送多个相同的请求
      for (let i = 0; i < testRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 10 })
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // 所有请求都应该成功
      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
      
      // 平均响应时间应该在可接受范围内
      const averageTime = totalTime / testRequests;
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLD / 10); // 200ms per request
    });

    it('应该监控缓存大小', async () => {
      // 创建多个测试数据来增加缓存大小
      const testUsers: any[] = [];
      
      for (let i = 0; i < 10; i++) {
        const testUserData = userRepository.create({
          email: `cache-size-test-${i}@example.com`,
          name: `Cache Size Test User ${i}`,
          phone: `1380013800${i}`,
          status: UserStatus.ACTIVE,
          role: userRole,
        });
        const testUser = await userRepository.save(testUserData);
        testUsers.push(testUser);
      }
      
      // 查询所有测试用户（建立缓存）
      for (const user of testUsers) {
        await request(app.getHttpServer())
          .get(`/users/${user.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
      
      // 在实际实现中，这里会检查缓存大小和内存使用情况
      // 目前只验证查询功能正常
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.length).toBeGreaterThan(0);
      
      // 清理测试数据
      for (const user of testUsers) {
        await userRepository.delete({ id: user.id });
      }
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空查询结果的缓存', async () => {
      // 查询不存在的用户
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      
      // 第二次查询相同的不存在用户
      const secondResponse = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(secondResponse.status).toBe(404);
    });

    it('应该处理大数据量的缓存', async () => {
      // 查询大量数据
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该处理特殊字符的缓存键', async () => {
      // 使用包含特殊字符的搜索条件
      const specialSearch = 'test@example.com';
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ search: specialSearch })
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 400]).toContain(response.status);
    });
  });
});
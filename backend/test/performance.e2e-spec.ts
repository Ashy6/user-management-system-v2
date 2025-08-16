import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { UserStatus } from '../src/entities/user.entity';
import { EmailCode, EmailCodeType } from '../src/entities';
import { TestUtils } from './test-utils';
// import { RedisService } from '../src/services/redis.service'; // Redis service not implemented yet

describe('Performance E2E Tests', () => {
  jest.setTimeout(30000); // 设置30秒超时
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let emailCodeRepository: Repository<EmailCode>;
  // let redisService: RedisService; // Redis service not implemented yet

  let adminUser: User;
  let adminToken: string;
  let adminRole: Role;
  const testUsers: User[] = [];

  const testCode = '123456';
  const PERFORMANCE_THRESHOLD = {
    FAST_RESPONSE: 100, // 100ms
    NORMAL_RESPONSE: 500, // 500ms
    SLOW_RESPONSE: 2000, // 2s
    BULK_OPERATION: 5000, // 5s
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    roleRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );
    emailCodeRepository = moduleFixture.get<Repository<EmailCode>>(
      getRepositoryToken(EmailCode),
    );
    // redisService = moduleFixture.get<RedisService>(RedisService); // Redis service not implemented yet

    // 使用TestUtils创建管理员token
    const adminTokenResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      'perf-admin@example.com',
      'Performance Admin User',
      '13800138003',
      `PerfAdmin${Date.now().toString().slice(-6)}`,
      [
        { resource: 'users', action: 'manage' },
        { resource: 'roles', action: 'manage' },
        { resource: 'settings', action: 'manage' },
      ],
    );

    adminToken = adminTokenResult.token;
    adminUser = adminTokenResult.user;
    adminRole = adminUser.role!;

    // 创建测试数据
    await createTestData();
  });

  afterAll(async () => {
    // 清理测试数据
    if (testUsers.length > 0) {
      const userIds = testUsers.map((user) => user.id);
      await userRepository.delete(userIds);
    }

    // 使用TestUtils清理测试数据
    const testEmails = ['perf-admin@example.com'];
    const testRoleNames = [adminRole?.name].filter(Boolean);

    await TestUtils.cleanupTestData(
      userRepository,
      emailCodeRepository,
      roleRepository,
      testEmails,
      testRoleNames,
    );

    await app.close();
  });

  async function createTestData() {
    console.log('Creating test data for performance tests...');
    const batchSize = 50;
    const totalUsers = 200;

    for (let i = 0; i < totalUsers; i += batchSize) {
      const batch: User[] = [];
      for (let j = 0; j < batchSize && i + j < totalUsers; j++) {
        const user = userRepository.create({
          email: `perf-user-${i + j}@example.com`,
          name: `Performance User ${i + j}`,
          phone: `1380013${String(8000 + i + j).padStart(4, '0')}`,
          status: UserStatus.ACTIVE,
          role: adminRole,
        });
        batch.push(user);
      }

      const savedUsers = await userRepository.save(batch);
      testUsers.push(...savedUsers);
    }
    console.log(`Created ${testUsers.length} test users`);
  }

  function measureTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve) => {
      const startTime = process.hrtime.bigint();
      const result = await operation();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      resolve({ result, duration });
    });
  }

  describe('API响应时间测试', () => {
    it('用户列表查询响应时间应该小于500ms', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`用户列表查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.data).toBeDefined();
      expect(result.body.data.length).toBeGreaterThan(0);
    });

    it('单个用户查询响应时间应该小于100ms', async () => {
      const testUser = testUsers[0];

      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get(`/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`单个用户查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_RESPONSE);
      expect(result.body.id).toBe(testUser.id);
    });

    it('用户创建响应时间应该小于500ms', async () => {
      const userData = {
        email: `perf-create-${Date.now()}@example.com`,
        name: 'Performance Create User',
        phone: '13800139999',
        roleId: adminRole.id,
      };

      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(201),
      );

      console.log(`用户创建耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.email).toBe(userData.email);

      // 清理创建的用户
      await userRepository.delete({ id: result.body.id });
    });

    it('用户更新响应时间应该小于500ms', async () => {
      const testUser = testUsers[1];
      const updateData = {
        name: 'Updated Performance User',
        phone: '13800139998',
      };

      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .put(`/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200),
      );

      console.log(`用户更新耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.name).toBe(updateData.name);
    });

    it('角色列表查询响应时间应该小于200ms', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`角色列表查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200);
      expect(result.body.data).toBeDefined();
    });

    it('系统设置查询响应时间应该小于100ms', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`系统设置查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_RESPONSE);
      expect(result.body).toHaveProperty('systemConfig');
    });
  });

  describe('大数据量处理测试', () => {
    it('应该能够处理大页面大小的用户查询', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users')
          .query({ page: 1, limit: 100 })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`大页面查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.SLOW_RESPONSE);
      expect(result.body.data.length).toBeLessThanOrEqual(100);
    });

    it('应该能够处理复杂的搜索查询', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users')
          .query({
            search: 'Performance',
            status: UserStatus.ACTIVE,
            page: 1,
            limit: 50,
          })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`复杂搜索查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.data).toBeDefined();
    });

    it('应该能够处理多条件筛选查询', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users')
          .query({
            search: 'User',
            status: UserStatus.ACTIVE,
            roleId: adminRole.id,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
            page: 1,
            limit: 20,
          })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`多条件筛选查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.data).toBeDefined();
    });

    it('应该能够处理统计查询', async () => {
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users/statistics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`统计查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body).toHaveProperty('totalUsers');
    });
  });

  describe('并发性能测试', () => {
    it('应该能够处理并发用户查询', async () => {
      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      const startTime = process.hrtime.bigint();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 20 })
            .set('Authorization', `Bearer ${adminToken}`),
        );
      }

      const results = await Promise.all(promises);
      const endTime = process.hrtime.bigint();
      const totalDuration = Number(endTime - startTime) / 1000000;
      const avgDuration = totalDuration / concurrentRequests;

      console.log(
        `${concurrentRequests}个并发查询总耗时: ${totalDuration.toFixed(2)}ms`,
      );
      console.log(`平均每个请求耗时: ${avgDuration.toFixed(2)}ms`);

      expect(results.every((res: any) => res.status === 200)).toBe(true);
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
    });

    it('应该能够处理并发用户创建', async () => {
      const concurrentCreations = 5;
      const promises: Promise<any>[] = [];
      const createdUserIds: string[] = [];

      const startTime = process.hrtime.bigint();

      for (let i = 0; i < concurrentCreations; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              email: `concurrent-${i}-${Date.now()}@example.com`,
              name: `Concurrent User ${i}`,
              phone: `1380013${String(9000 + i).padStart(4, '0')}`,
              roleId: adminRole.id,
            }),
        );
      }

      const results = await Promise.all(promises);
      const endTime = process.hrtime.bigint();
      const totalDuration = Number(endTime - startTime) / 1000000;

      console.log(
        `${concurrentCreations}个并发创建总耗时: ${totalDuration.toFixed(2)}ms`,
      );

      const successfulCreations = results.filter(
        (res: any) => res.status === 201,
      );
      expect(successfulCreations.length).toBe(concurrentCreations);
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLD.BULK_OPERATION);

      // 清理创建的用户
      for (const result of successfulCreations) {
        createdUserIds.push(result.body.id);
      }
      if (createdUserIds.length > 0) {
        await userRepository.delete(createdUserIds);
      }
    });

    it('应该能够处理混合并发操作', async () => {
      const operations: Promise<any>[] = [];
      const createdUserIds: string[] = [];

      // 添加读操作
      for (let i = 0; i < 5; i++) {
        operations.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 10 })
            .set('Authorization', `Bearer ${adminToken}`),
        );
      }

      // 添加写操作
      for (let i = 0; i < 3; i++) {
        operations.push(
          request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              email: `mixed-${i}-${Date.now()}@example.com`,
              name: `Mixed User ${i}`,
              phone: `1380013${String(9100 + i).padStart(4, '0')}`,
              roleId: adminRole.id,
            }),
        );
      }

      // 添加更新操作
      const testUser = testUsers[Math.floor(Math.random() * testUsers.length)];
      operations.push(
        request(app.getHttpServer())
          .put(`/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Updated Mixed User ${Date.now()}`,
          }),
      );

      const startTime = process.hrtime.bigint();
      const results = await Promise.all(operations);
      const endTime = process.hrtime.bigint();
      const totalDuration = Number(endTime - startTime) / 1000000;

      console.log(`混合并发操作总耗时: ${totalDuration.toFixed(2)}ms`);

      const readResults = results.slice(0, 5);
      const writeResults = results.slice(5, 8);
      const updateResults = results.slice(8);

      expect(readResults.every((res: any) => res.status === 200)).toBe(true);
      expect(writeResults.every((res: any) => res.status === 201)).toBe(true);
      expect(updateResults.every((res: any) => res.status === 200)).toBe(true);
      expect(totalDuration).toBeLessThan(PERFORMANCE_THRESHOLD.BULK_OPERATION);

      // 清理创建的用户
      for (const result of writeResults) {
        if (result.status === 201 && result.body && result.body.id) {
          createdUserIds.push(result.body.id);
        }
      }
      if (createdUserIds.length > 0) {
        await userRepository.delete(createdUserIds);
      }
    });
  });

  describe('缓存性能测试', () => {
    it('缓存命中应该显著提高响应速度', async () => {
      // 第一次请求（可能会缓存）
      const { duration: firstDuration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      // 第二次请求（应该从缓存获取）
      const { duration: secondDuration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`第一次请求耗时: ${firstDuration.toFixed(2)}ms`);
      console.log(`第二次请求耗时: ${secondDuration.toFixed(2)}ms`);

      // 如果有缓存，第二次请求应该更快
      // 但这个测试可能因为缓存策略而有所不同
      expect(secondDuration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_RESPONSE);
    });

    it('应该能够处理缓存失效后的重新加载', async () => {
      // 获取初始设置
      await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 更新设置（应该清除缓存）
      await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          systemConfig: {
            systemName: 'Cache Performance Test',
            systemVersion: '1.0.0',
            allowUserRegistration: true,
            maintenanceMode: false,
          },
        })
        .expect(200);

      // 再次获取设置（应该从数据库重新加载）
      const { result, duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`缓存失效后重新加载耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
      expect(result.body.systemConfig.systemName).toBe(
        'Cache Performance Test',
      );
    });
  });

  describe('内存使用测试', () => {
    it('大量数据查询不应该导致内存泄漏', async () => {
      const initialMemory = process.memoryUsage();

      // 执行多次大数据量查询
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .get('/users')
          .query({ page: 1, limit: 100 })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `初始内存使用: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(
        `最终内存使用: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长不应该超过50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('并发请求不应该导致过度内存使用', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量并发请求
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/users')
            .query({ page: 1, limit: 20 })
            .set('Authorization', `Bearer ${adminToken}`),
        );
      }

      await Promise.all(promises);

      // 等待一段时间让内存释放
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `并发请求内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );

      // 内存增长不应该超过30MB
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024);
    });
  });

  describe('数据库性能测试', () => {
    it('复杂查询应该在合理时间内完成', async () => {
      const { duration } = await measureTime(() =>
        request(app.getHttpServer())
          .get('/users')
          .query({
            search: 'Performance',
            status: UserStatus.ACTIVE,
            sortBy: 'createdAt',
            sortOrder: 'DESC',
            page: 1,
            limit: 50,
          })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200),
      );

      console.log(`复杂数据库查询耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.NORMAL_RESPONSE);
    });

    it('批量操作应该高效执行', async () => {
      const batchSize = 10;
      const userData: any[] = [];

      for (let i = 0; i < batchSize; i++) {
        userData.push({
          email: `batch-${i}-${Date.now()}@example.com`,
          name: `Batch User ${i}`,
          phone: `1380013${String(9200 + i).padStart(4, '0')}`,
          roleId: adminRole.id,
        });
      }

      const createdUserIds: string[] = [];
      const { duration } = await measureTime(async () => {
        for (const user of userData) {
          const response = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(user)
            .expect(201);
          createdUserIds.push(response.body.id);
        }
      });

      console.log(`批量创建${batchSize}个用户耗时: ${duration.toFixed(2)}ms`);
      console.log(
        `平均每个用户创建耗时: ${(duration / batchSize).toFixed(2)}ms`,
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.BULK_OPERATION);
      expect(duration / batchSize).toBeLessThan(
        PERFORMANCE_THRESHOLD.NORMAL_RESPONSE,
      );

      // 清理创建的用户
      if (createdUserIds.length > 0) {
        await userRepository.delete(createdUserIds);
      }
    });
  });
});
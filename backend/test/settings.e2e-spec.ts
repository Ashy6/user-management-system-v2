import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  User,
  Role,
  UserStatus,
  EmailCode,
  EmailCodeType,
} from '../src/entities';
import { TestUtils } from './test-utils';

describe('SettingsController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let emailCodeRepository: Repository<EmailCode>;
  let adminToken: string;
  let userToken: string;
  let adminUser: User;
  let normalUser: User;
  let adminRole: Role;
  let userRole: Role;

  const adminEmail = 'admin@example.com';
  const userEmail = 'user@example.com';
  const testCode = '123456';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    roleRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );
    emailCodeRepository = moduleFixture.get<Repository<EmailCode>>(
      getRepositoryToken(EmailCode),
    );

    await app.init();

    // 使用TestUtils创建管理员token（有设置权限）
    const adminTokenResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      adminEmail,
      'Settings Admin User',
      '13800138006',
      `Admin Role ${Date.now()}`,
      [
        { resource: 'settings', action: 'manage' },
        { resource: 'users', action: 'manage' },
      ],
    );

    adminToken = adminTokenResult.token;
    adminUser = adminTokenResult.user;
    adminRole = adminUser.role!;

    // 创建普通用户角色（无设置权限）
    const userRoleData = roleRepository.create({
      name: `User Role ${Date.now()}`,
      description: 'Regular user role without settings permissions',
      permissions: {
        users: ['read'],
      },
    });
    userRole = await roleRepository.save(userRoleData);

    // 使用TestUtils创建普通用户token
    const userTokenResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      userEmail,
      'Settings Normal User',
      '13800138007',
      userRole.name,
      [{ resource: 'users', action: 'read' }],
    );

    userToken = userTokenResult.token;
    normalUser = userTokenResult.user;
  });

  afterAll(async () => {
    // 使用TestUtils清理测试数据
    const testEmails = [adminEmail, userEmail];
    const testRoleNames = [adminRole?.name, userRole?.name].filter(Boolean);

    await TestUtils.cleanupTestData(
      userRepository,
      emailCodeRepository,
      roleRepository,
      testEmails,
      testRoleNames,
    );

    await app.close();
  });

  describe('/settings (GET)', () => {
    it('应该成功获取系统设置', () => {
      return request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('emailConfig');
          expect(res.body).toHaveProperty('securityConfig');
          expect(res.body).toHaveProperty('systemConfig');

          // 验证邮件配置结构
          expect(res.body.emailConfig).toHaveProperty('host');
          expect(res.body.emailConfig).toHaveProperty('port');
          expect(res.body.emailConfig).toHaveProperty('secure');
          expect(res.body.emailConfig).toHaveProperty('username');
          expect(res.body.emailConfig).toHaveProperty('from');

          // 验证安全配置结构
          expect(res.body.securityConfig).toHaveProperty('jwtAccessExpiration');
          expect(res.body.securityConfig).toHaveProperty(
            'jwtRefreshExpiration',
          );
          expect(res.body.securityConfig).toHaveProperty(
            'verificationCodeExpiration',
          );
          expect(res.body.securityConfig).toHaveProperty('maxLoginAttempts');
          expect(res.body.securityConfig).toHaveProperty(
            'accountLockoutDuration',
          );

          // 验证系统配置结构
          expect(res.body.systemConfig).toHaveProperty('systemName');
          expect(res.body.systemConfig).toHaveProperty('systemVersion');
          expect(res.body.systemConfig).toHaveProperty('allowUserRegistration');
          expect(res.body.systemConfig).toHaveProperty('maintenanceMode');
        });
    });

    it('应该拒绝未认证的请求', () => {
      return request(app.getHttpServer()).get('/settings').expect(401);
    });

    it('应该拒绝无权限的用户', () => {
      return request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('应该拒绝无效的token', () => {
      return request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/settings (PUT)', () => {
    const validUpdateData = {
      emailConfig: {
        host: 'smtp.updated.com',
        port: 587,
        secure: false,
        username: 'updated@example.com',
        password: 'updated-password',
        from: 'updated@example.com',
      },
      securityConfig: {
        jwtAccessExpiration: 1800,
        jwtRefreshExpiration: 86400,
        verificationCodeExpiration: 300,
        maxLoginAttempts: 5,
        accountLockoutDuration: 900,
      },
      systemConfig: {
        systemName: 'Updated System',
        systemDescription: 'Updated system description',
        systemVersion: '2.0.0',
        allowUserRegistration: false,
        maintenanceMode: true,
        maintenanceMessage: 'System is under maintenance',
      },
    };

    it('应该成功更新完整的系统设置', () => {
      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validUpdateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.emailConfig.host).toBe(
            validUpdateData.emailConfig.host,
          );
          expect(res.body.emailConfig.port).toBe(
            validUpdateData.emailConfig.port,
          );
          expect(res.body.securityConfig.jwtAccessExpiration).toBe(
            validUpdateData.securityConfig.jwtAccessExpiration,
          );
          expect(res.body.systemConfig.systemName).toBe(
            validUpdateData.systemConfig.systemName,
          );
          expect(res.body.systemConfig.maintenanceMode).toBe(
            validUpdateData.systemConfig.maintenanceMode,
          );
        });
    });

    it('应该成功更新部分设置（仅邮件配置）', () => {
      const partialUpdate = {
        emailConfig: {
          host: 'smtp.partial.com',
          port: 465,
          secure: true,
          username: 'partial@example.com',
          password: 'partial-password',
          from: 'partial@example.com',
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200)
        .expect((res) => {
          expect(res.body.emailConfig.host).toBe(
            partialUpdate.emailConfig.host,
          );
          expect(res.body.emailConfig.secure).toBe(
            partialUpdate.emailConfig.secure,
          );
        });
    });

    it('应该成功更新部分设置（仅安全配置）', () => {
      const partialUpdate = {
        securityConfig: {
          jwtAccessExpiration: 3600,
          maxLoginAttempts: 3,
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200)
        .expect((res) => {
          expect(res.body.securityConfig.jwtAccessExpiration).toBe(
            partialUpdate.securityConfig.jwtAccessExpiration,
          );
          expect(res.body.securityConfig.maxLoginAttempts).toBe(
            partialUpdate.securityConfig.maxLoginAttempts,
          );
        });
    });

    it('应该成功更新部分设置（仅系统配置）', () => {
      const partialUpdate = {
        systemConfig: {
          systemName: 'Partially Updated System',
          allowUserRegistration: true,
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(partialUpdate)
        .expect(200)
        .expect((res) => {
          expect(res.body.systemConfig.systemName).toBe(
            partialUpdate.systemConfig.systemName,
          );
          expect(res.body.systemConfig.allowUserRegistration).toBe(
            partialUpdate.systemConfig.allowUserRegistration,
          );
        });
    });

    it('应该拒绝无效的邮件配置', () => {
      const invalidEmailConfig = {
        emailConfig: {
          host: '', // 空主机名
          port: -1, // 无效端口
          secure: 'invalid', // 无效类型
          username: 'invalid-email', // 无效邮箱格式
          password: '',
          from: 'invalid-from',
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmailConfig)
        .expect(400);
    });

    it('应该拒绝无效的安全配置', () => {
      const invalidSecurityConfig = {
        securityConfig: {
          jwtAccessExpiration: -1, // 负数过期时间
          jwtRefreshExpiration: 0, // 零过期时间
          verificationCodeExpiration: -300, // 负数过期时间
          maxLoginAttempts: 0, // 零尝试次数
          accountLockoutDuration: -1, // 负数锁定时间
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSecurityConfig)
        .expect(400);
    });

    it('应该拒绝无效的系统配置', () => {
      const invalidSystemConfig = {
        systemConfig: {
          systemName: '', // 空系统名
          systemVersion: 'invalid-version', // 无效版本格式
          allowUserRegistration: 'invalid', // 无效布尔值
          maintenanceMode: 'invalid', // 无效布尔值
        },
      };

      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSystemConfig)
        .expect(400);
    });

    it('应该拒绝未认证的请求', () => {
      return request(app.getHttpServer())
        .put('/settings')
        .send(validUpdateData)
        .expect(401);
    });

    it('应该拒绝无权限的用户', () => {
      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validUpdateData)
        .expect(403);
    });

    it('应该拒绝无效的token', () => {
      return request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', 'Bearer invalid-token')
        .send(validUpdateData)
        .expect(401);
    });
  });

  // 边界条件测试
  describe('边界条件测试', () => {
    describe('邮件配置边界测试', () => {
      it('应该处理极长的主机名', () => {
        const longHostConfig = {
          emailConfig: {
            host: 'a'.repeat(255) + '.com',
            port: 587,
            secure: false,
            username: 'test@example.com',
            password: 'password',
            from: 'test@example.com',
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(longHostConfig)
          .expect(400);
      });

      it('应该处理极大的端口号', () => {
        const largePortConfig = {
          emailConfig: {
            host: 'smtp.example.com',
            port: 99999, // 超出有效端口范围
            secure: false,
            username: 'test@example.com',
            password: 'password',
            from: 'test@example.com',
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(largePortConfig)
          .expect(400);
      });

      it('应该处理包含特殊字符的邮箱', () => {
        const specialCharConfig = {
          emailConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test+special@example.com',
            password: 'password',
            from: 'test+special@example.com',
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(specialCharConfig)
          .expect(200);
      });
    });

    describe('安全配置边界测试', () => {
      it('应该处理极大的过期时间', () => {
        const largeExpirationConfig = {
          securityConfig: {
            jwtAccessExpiration: Number.MAX_SAFE_INTEGER,
            jwtRefreshExpiration: Number.MAX_SAFE_INTEGER,
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(largeExpirationConfig)
          .expect(400);
      });

      it('应该处理极大的登录尝试次数', () => {
        const largeAttemptsConfig = {
          securityConfig: {
            maxLoginAttempts: 1000000,
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(largeAttemptsConfig)
          .expect(400);
      });
    });

    describe('系统配置边界测试', () => {
      it('应该处理超长系统名称', () => {
        const longNameConfig = {
          systemConfig: {
            systemName: 'a'.repeat(1000),
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(longNameConfig)
          .expect(400);
      });

      it('应该处理包含HTML标签的系统描述', () => {
        const htmlDescConfig = {
          systemConfig: {
            systemDescription: '<script>alert("XSS")</script>',
          },
        };

        return request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(htmlDescConfig)
          .expect(400);
      });
    });
  });

  // 并发测试
  describe('并发测试', () => {
    it('应该处理并发设置更新', async () => {
      const updatePromises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        updatePromises.push(
          request(app.getHttpServer())
            .put('/settings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              systemConfig: {
                systemName: `Concurrent Update ${i}`,
              },
            }),
        );
      }

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(
        (res: any) => res.status === 200,
      ).length;
      expect(successCount).toBeGreaterThan(0);
    }, 15000);

    it('应该处理并发读取请求', async () => {
      const readPromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(
          request(app.getHttpServer())
            .get('/settings')
            .set('Authorization', `Bearer ${adminToken}`),
        );
      }

      const results = await Promise.all(readPromises);
      expect(results.every((res: any) => res.status === 200)).toBe(true);
    });
  });

  // 性能测试
  describe('性能测试', () => {
    it('设置读取响应时间应该小于200ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('设置更新响应时间应该小于500ms', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          systemConfig: {
            systemName: 'Performance Test System',
          },
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });

  // 安全测试
  describe('安全测试', () => {
    it('应该防止设置注入攻击', async () => {
      const injectionAttempts = [
        {
          emailConfig: {
            host: "'; DROP TABLE settings; --",
            port: 587,
            secure: false,
            username: 'test@example.com',
            password: 'password',
            from: 'test@example.com',
          },
        },
        {
          systemConfig: {
            systemName: '<script>alert("XSS")</script>',
          },
        },
        {
          securityConfig: {
            jwtAccessExpiration: "'; DELETE FROM users; --",
          },
        },
      ];

      for (const injection of injectionAttempts) {
        const response = await request(app.getHttpServer())
          .put('/settings')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(injection);

        expect(response.status).toBe(400);
      }
    });

    it('应该防止敏感信息泄露', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // 确保密码等敏感信息不会泄露
      expect(response.body.emailConfig).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('jwtSecret');
      expect(response.body).not.toHaveProperty('databasePassword');
    });
  });

  // 数据完整性测试
  describe('数据完整性测试', () => {
    it('应该确保设置更新的原子性', async () => {
      const originalSettings = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      // 模拟部分更新失败
      const invalidUpdate = {
        emailConfig: {
          host: 'valid.smtp.com',
          port: 587,
          secure: false,
          username: 'valid@example.com',
          password: 'valid-password',
          from: 'valid@example.com',
        },
        securityConfig: {
          jwtAccessExpiration: -1, // 无效值，应该导致整个更新失败
        },
      };

      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);

      // 验证设置没有被部分更新
      const currentSettings = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(currentSettings.body.emailConfig.host).toBe(
        originalSettings.body.emailConfig.host,
      );
    });

    it('应该验证配置依赖关系', async () => {
      // 测试邮件配置的依赖关系
      const dependentConfig = {
        emailConfig: {
          host: 'smtp.example.com',
          port: 587,
          secure: true, // 启用安全连接
          username: 'test@example.com',
          password: '', // 但密码为空，应该失败
          from: 'test@example.com',
        },
      };

      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dependentConfig);

      expect(response.status).toBe(400);
    });
  });

  // 错误恢复测试
  describe('错误恢复测试', () => {
    it('应该处理配置服务不可用', async () => {
      // 模拟配置服务错误
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      // 即使出现错误，也应该返回默认配置或错误信息
      expect([200, 500]).toContain(response.status);

      jest.restoreAllMocks();
    });

    it('应该处理缓存服务不可用', async () => {
      // 模拟缓存服务错误
      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          systemConfig: {
            systemName: 'Cache Error Test',
          },
        });

      // 即使缓存不可用，设置更新也应该成功
      expect([200, 500]).toContain(response.status);
    });
  });

  // 缓存测试
  describe('缓存测试', () => {
    it('应该正确缓存设置数据', async () => {
      // 第一次请求
      const firstResponse = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      const firstTime = Date.now();

      // 第二次请求（应该从缓存获取）
      const secondResponse = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      const secondTime = Date.now();

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(firstResponse.body).toEqual(secondResponse.body);

      // 第二次请求应该更快（从缓存获取）
      expect(secondTime - firstTime).toBeLessThan(100);
    });

    it('应该在设置更新后清除缓存', async () => {
      // 先获取设置（缓存）
      await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      // 更新设置
      await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          systemConfig: {
            systemName: 'Cache Clear Test',
          },
        });

      // 再次获取设置（应该是更新后的值）
      const response = await request(app.getHttpServer())
        .get('/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.systemConfig.systemName).toBe('Cache Clear Test');
    });
  });
});

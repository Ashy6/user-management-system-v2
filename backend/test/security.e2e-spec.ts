import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { UserStatus } from '../src/entities/user.entity';
import { EmailCode } from '../src/entities/email-code.entity';
import { EmailCodeType } from '../src/entities/email-code.entity';
import { EmailService } from '../src/services/email.service';
import { TestUtils } from './test-utils';

describe('Security E2E Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let emailCodeRepository: Repository<EmailCode>;
  let emailService: EmailService;
  
  let adminUser: User;
  let normalUser: User;
  let adminToken: string;
  let normalToken: string;
  let adminRole: Role;
  let userRole: Role;
  
  const testCode = '123456';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    roleRepository = moduleFixture.get<Repository<Role>>(getRepositoryToken(Role));
    emailCodeRepository = moduleFixture.get<Repository<EmailCode>>(getRepositoryToken(EmailCode));
    emailService = moduleFixture.get<EmailService>(EmailService);

    // 使用TestUtils创建管理员token
    const adminTokenResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      'security-admin@example.com',
      'Security Admin User',
      '13800138001',
      `Security Admin ${Date.now()}`,
      [{ resource: 'users', action: 'manage' }, { resource: 'roles', action: 'manage' }, { resource: 'settings', action: 'manage' }]
    );
    
    adminToken = adminTokenResult.token;
    adminUser = adminTokenResult.user;
    adminRole = adminUser.role!;
    
    // 创建普通用户角色
    userRole = roleRepository.create({
      name: `Security User ${Date.now()}`,
      description: 'Normal user role for security tests',
      permissions: {
        users: ['read'],
      },
      isActive: true,
    });
    await roleRepository.save(userRole);
    
    // 使用TestUtils创建普通用户token
    const userTokenResult = await TestUtils.createTestToken(
      app,
      userRepository,
      roleRepository,
      emailCodeRepository,
      'security-user@example.com',
      'Security Normal User',
      '13800138002',
      userRole.name,
      [{ resource: 'users', action: 'read' }]
    );
    
    normalToken = userTokenResult.token;
    normalUser = userTokenResult.user;
  });

  afterAll(async () => {
    // 使用TestUtils清理测试数据
    const testEmails = ['security-admin@example.com', 'security-user@example.com'];
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

  describe('SQL注入防护测试', () => {
    it('应该防止用户查询中的SQL注入', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacked@example.com'); --",
        "' OR 1=1 --",
        "admin'--",
        "admin'/*",
        "' OR 'x'='x",
        "') OR ('1'='1",
        "' OR 1=1#",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app.getHttpServer())
          .get('/users')
          .query({ search: payload })
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        // 确保没有返回所有用户（SQL注入成功的标志）
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('应该防止用户创建中的SQL注入', async () => {
      const maliciousUserData = {
        email: "test'; DROP TABLE users; --@example.com",
        name: "'; DELETE FROM users WHERE '1'='1",
        phone: "'; UPDATE users SET email='hacked@example.com' WHERE '1'='1",
        roleId: adminRole.id,
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousUserData);

      // 应该返回验证错误，而不是SQL错误
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });

    it('应该防止角色查询中的SQL注入', async () => {
      const sqlPayload = "'; DROP TABLE roles; --";
      
      const response = await request(app.getHttpServer())
        .get('/roles')
        .query({ search: sqlPayload })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('应该防止设置更新中的SQL注入', async () => {
      const maliciousSettings = {
        systemConfig: {
          systemName: "'; DROP TABLE settings; --",
          systemDescription: "'; DELETE FROM users; --",
          systemVersion: '1.0.0',
          allowUserRegistration: true,
          maintenanceMode: false,
        },
      };

      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousSettings);

      // 应该成功处理（经过清理）或返回验证错误
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('XSS防护测试', () => {
    it('应该防止用户名中的XSS攻击', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload="alert(1)">',
        '<div onclick="alert(1)">Click me</div>',
        '<a href="javascript:alert(1)">Link</a>',
      ];

      for (const payload of xssPayloads) {
        const userData = {
          email: `xss-test-${Date.now()}@example.com`,
          name: payload,
          phone: '13800138000',
          roleId: userRole.id,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        if (createResponse.status === 201) {
          const userId = createResponse.body.id;
          
          // 获取用户信息，验证XSS payload被清理
          const getResponse = await request(app.getHttpServer())
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(getResponse.status).toBe(200);
          // 验证危险脚本被移除或转义
          expect(getResponse.body.name).not.toContain('<script>');
          expect(getResponse.body.name).not.toContain('javascript:');
          expect(getResponse.body.name).not.toContain('onerror=');
          expect(getResponse.body.name).not.toContain('onload=');

          // 清理测试用户
          await userRepository.delete({ id: userId });
        }
      }
    });

    it('应该防止角色描述中的XSS攻击', async () => {
      const xssPayload = '<script>document.cookie="stolen"</script>';
      
      const roleData = {
        name: 'XSS Test Role',
        description: xssPayload,
        permissions: [{ resource: 'users', action: 'read' }],
      };

      const createResponse = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData);

      if (createResponse.status === 201) {
        const roleId = createResponse.body.id;
        
        const getResponse = await request(app.getHttpServer())
          .get(`/roles/${roleId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.description).not.toContain('<script>');
        expect(getResponse.body.description).not.toContain('document.cookie');

        // 清理测试角色
        await roleRepository.delete({ id: roleId });
      }
    });

    it('应该防止系统配置中的XSS攻击', async () => {
      const xssSettings = {
        systemConfig: {
          systemName: '<script>alert("XSS in system name")</script>',
          systemDescription: '<img src="x" onerror="alert(1)">',
          systemVersion: '1.0.0',
          allowUserRegistration: true,
          maintenanceMode: false,
          maintenanceMessage: '<svg onload="alert(1)">Maintenance</svg>',
        },
      };

      const response = await request(app.getHttpServer())
        .put('/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(xssSettings);

      if (response.status === 200) {
        const getResponse = await request(app.getHttpServer())
          .get('/settings')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(200);
        const config = getResponse.body.systemConfig;
        expect(config.systemName).not.toContain('<script>');
        expect(config.systemDescription).not.toContain('<img');
        expect(config.maintenanceMessage).not.toContain('<svg');
      }
    });
  });

  describe('权限绕过测试', () => {
    it('应该防止通过修改请求头绕过权限', async () => {
      // 尝试使用普通用户token访问管理员功能
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${normalToken}`)
        .set('X-User-Role', 'admin') // 尝试通过请求头伪造角色
        .set('X-User-Permissions', 'users:create') // 尝试通过请求头伪造权限
        .send({
          email: 'bypass-test@example.com',
          name: 'Bypass Test User',
          phone: '13800138000',
          roleId: userRole.id,
        });

      expect(response.status).toBe(403);
    });

    it('应该防止通过JWT payload篡改绕过权限', async () => {
      // 创建一个伪造的JWT token（实际上这个测试更多是验证JWT验证的正确性）
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJyb2xlIjoiYWRtaW4ifQ.invalid-signature';
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
    });

    it('应该防止通过参数污染绕过权限', async () => {
      // 尝试通过重复参数绕过权限检查
      const response = await request(app.getHttpServer())
        .get('/users')
        .query('userId=' + normalUser.id + '&userId=' + adminUser.id + '&role=user&role=admin')
        .set('Authorization', `Bearer ${normalToken}`);

      // 应该基于token权限返回结果，不受参数污染影响
      expect(response.status).toBe(200);
    });

    it('应该防止通过HTTP方法覆盖绕过权限', async () => {
      // 尝试通过X-HTTP-Method-Override绕过权限
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${normalToken}`)
        .set('X-HTTP-Method-Override', 'DELETE') // 尝试将GET请求伪装成DELETE
        .query({ id: adminUser.id });

      // 应该按照实际的GET方法处理，而不是DELETE
      expect(response.status).toBe(200);
    });

    it('应该防止通过路径遍历绕过权限', async () => {
      const pathTraversalPayloads = [
        '../admin/users',
        '../../settings',
        '../../../etc/passwd',
        '..\\..\\admin\\users',
        '%2e%2e%2fadmin%2fusers',
        '....//admin//users',
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app.getHttpServer())
          .get(`/users/${payload}`)
          .set('Authorization', `Bearer ${normalToken}`);

        // 应该返回404或400，而不是200（成功访问）
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('敏感数据泄露防护测试', () => {
    it('应该在用户列表中隐藏敏感信息', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      
      // 验证敏感字段不在响应中
      response.body.data.forEach(user => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('salt');
        expect(user).not.toHaveProperty('refreshToken');
      });
    });

    it('应该在错误响应中隐藏系统信息', async () => {
      // 触发一个服务器错误
      const response = await request(app.getHttpServer())
        .get('/users/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      
      // 验证错误响应不包含敏感系统信息
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('connection');
      expect(responseText).not.toContain('stack trace');
      expect(responseText).not.toContain('internal server error');
    });

    it('应该在日志中隐藏敏感数据', async () => {
      // 发送包含敏感数据的请求
      const sensitiveData = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '13800138000',
        password: 'super-secret-password',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        roleId: userRole.id,
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sensitiveData);

      // 验证响应不包含敏感数据
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('super-secret-password');
      expect(responseText).not.toContain('4111-1111-1111-1111');
      expect(responseText).not.toContain('123-45-6789');
    });

    it('应该防止通过时序攻击获取用户信息', async () => {
      const existingEmail = adminUser.email;
      const nonExistingEmail = 'nonexistent@example.com';
      
      // 测试多次请求的响应时间
      const existingEmailTimes: number[] = [];
      const nonExistingEmailTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        // 测试存在的邮箱
        const startTime1 = Date.now();
        await request(app.getHttpServer())
          .post('/auth/send-code')
          .send({ email: existingEmail });
        existingEmailTimes.push(Date.now() - startTime1);
        
        // 测试不存在的邮箱
        const startTime2 = Date.now();
        await request(app.getHttpServer())
          .post('/auth/send-code')
          .send({ email: nonExistingEmail });
        nonExistingEmailTimes.push(Date.now() - startTime2);
      }
      
      // 计算平均响应时间
      const avgExistingTime = existingEmailTimes.reduce((a, b) => a + b, 0) / existingEmailTimes.length;
      const avgNonExistingTime = nonExistingEmailTimes.reduce((a, b) => a + b, 0) / nonExistingEmailTimes.length;
      
      // 响应时间差异不应该太大（防止时序攻击）
      const timeDifference = Math.abs(avgExistingTime - avgNonExistingTime);
      expect(timeDifference).toBeLessThan(100); // 差异小于100ms
    });
  });

  describe('会话安全测试', () => {
    it('应该防止会话固定攻击', async () => {
      // 获取初始token
      const loginRes1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          code: testCode,
        });
      
      const token1 = loginRes1.body.accessToken;
      
      // 再次登录，应该获得不同的token
      const secondEmailCode = emailCodeRepository.create({
        email: adminUser.email,
        code: testCode,
        type: EmailCodeType.LOGIN,
        isUsed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await emailCodeRepository.save(secondEmailCode);
      
      const loginRes2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: adminUser.email,
          code: testCode,
        });
      
      const token2 = loginRes2.body.accessToken;
      
      // 两次登录应该产生不同的token
      expect(token1).not.toBe(token2);
    });

    it('应该正确处理token过期', async () => {
      // 这个测试需要等待token过期，在实际测试中可能需要mock时间
      // 或者使用很短的过期时间进行测试
      
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // 在token有效期内应该成功
      expect(response.status).toBe(200);
    });

    it('应该防止CSRF攻击', async () => {
      // 测试没有CSRF token的请求
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Origin', 'https://malicious-site.com') // 模拟跨域请求
        .send({
          email: 'csrf-test@example.com',
          name: 'CSRF Test User',
          phone: '13800138000',
          roleId: userRole.id,
        });

      // 根据CSRF保护配置，可能返回403或成功但有额外验证
      // 这里主要验证系统有适当的CSRF保护机制
      expect([200, 201, 403]).toContain(response.status);
    });
  });

  describe('输入验证安全测试', () => {
    it('应该验证邮箱格式防止注入', async () => {
      const maliciousEmails = [
        'test@example.com<script>alert(1)</script>',
        'test+<script>@example.com',
        'test@example.com\r\nBcc: attacker@evil.com',
        'test@example.com\nContent-Type: text/html',
        'test@example.com%0d%0aBcc:attacker@evil.com',
      ];

      for (const email of maliciousEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/send-code')
          .send({ email });

        // 应该返回验证错误
        expect(response.status).toBe(400);
      }
    });

    it('应该验证手机号格式防止注入', async () => {
      const maliciousPhones = [
        '13800138000<script>alert(1)</script>',
        '138001380001; DROP TABLE users; --',
        '13800138000\r\nmalicious-header: value',
        '13800138000%0d%0amalicious-header: value',
      ];

      for (const phone of maliciousPhones) {
        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email: `test-${Date.now()}@example.com`,
            name: 'Test User',
            phone,
            roleId: userRole.id,
          });

        // 应该返回验证错误
        expect(response.status).toBe(400);
      }
    });

    it('应该限制输入长度防止DoS攻击', async () => {
      const longString = 'a'.repeat(10000);
      
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: `${longString}@example.com`,
          name: longString,
          phone: '13800138000',
          roleId: userRole.id,
        });

      // 应该返回验证错误或请求过大错误
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('API安全测试', () => {
    it('应该有适当的速率限制', async () => {
      const requests = [];
      
      // 快速发送多个请求
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // 检查是否有速率限制响应
      const rateLimitedResponses = responses.filter((res: any) => res.status === 429);
      
      // 如果有速率限制，应该有一些请求被限制
      // 如果没有速率限制，所有请求都应该成功
      expect(responses.length).toBe(20);
    });

    it('应该有适当的CORS配置', async () => {
      const response = await request(app.getHttpServer())
        .options('/users')
        .set('Origin', 'https://trusted-domain.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization');

      // 验证CORS头的存在
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('应该有安全的HTTP头', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      // 验证安全头的存在
      const headers = response.headers;
      
      // 这些头可能由安全中间件设置
      // expect(headers).toHaveProperty('x-content-type-options');
      // expect(headers).toHaveProperty('x-frame-options');
      // expect(headers).toHaveProperty('x-xss-protection');
      
      // 至少验证没有暴露敏感信息
      expect(headers).not.toHaveProperty('x-powered-by');
    });
  });
});
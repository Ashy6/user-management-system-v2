import { Repository, In } from 'typeorm';
import { User, Role, EmailCode, EmailCodeType, UserStatus } from '../src/entities';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface TestTokenResult {
  token: string;
  user: User;
  role: Role;
  emailCode: EmailCode;
}

export class TestUtils {
  static async createTestToken(
    app: INestApplication,
    userRepository: Repository<User>,
    roleRepository: Repository<Role>,
    emailCodeRepository: Repository<EmailCode>,
    email: string,
    name: string,
    phone: string,
    roleName: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<TestTokenResult> {
    const testCode = Math.random().toString().substring(2, 8); // 生成6位随机数字
    
    // 查找或创建角色
    let role = await roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      const roleData = roleRepository.create({
        name: roleName,
        description: 'Test role for e2e testing',
        permissions,
        isActive: true,
      });
      role = await roleRepository.save(roleData);
    }

    // 清理可能存在的旧验证码
    await emailCodeRepository.delete({ email });
    
    // 生成唯一但较短的验证码
    const timestamp = Date.now().toString().slice(-6); // 只取最后6位
    const uniqueCode = `${testCode}${timestamp}`;
    
    // 创建验证码
    const emailCode = emailCodeRepository.create({
      email,
      code: uniqueCode,
      type: EmailCodeType.LOGIN,
      isUsed: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后过期
    });
    await emailCodeRepository.save(emailCode);

    // 查找或创建用户
    let user = await userRepository.findOne({ where: { email }, relations: ['role'] });
    if (!user) {
      const userData = userRepository.create({
        email,
        name,
        phone,
        status: UserStatus.ACTIVE,
        roleId: role.id,
      });
      user = await userRepository.save(userData);
      
      // 重新查询以获取完整的关联数据
      user = await userRepository.findOne({ 
        where: { id: user.id }, 
        relations: ['role'] 
      })!;
    } else {
      // 如果用户已存在，更新其角色
      if (user.roleId !== role.id) {
        user.roleId = role.id;
        user = await userRepository.save(user);
        
        // 重新查询以获取完整的关联数据
        user = await userRepository.findOne({ 
          where: { id: user.id }, 
          relations: ['role'] 
        })!;
      }
    }

    // 登录获取token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        code: uniqueCode,
      })
      .expect(200);

    const token = loginRes.body.accessToken;
    if (!token) {
      throw new Error(`Failed to get token for ${email}`);
    }

    return { token, user: user!, role, emailCode };
  }

  static async cleanupTestData(
    userRepository: Repository<User>,
    emailCodeRepository: Repository<EmailCode>,
    roleRepository: Repository<Role>,
    emails: string[],
    roleNames: string[] = []
  ): Promise<void> {
    try {
      // 清理验证码
      if (emails.length > 0) {
        await emailCodeRepository.delete({ email: In(emails) });
      }
      
      // 清理用户
      if (emails.length > 0) {
        await userRepository.delete({ email: In(emails) });
      }
      
      // 清理角色
      if (roleNames.length > 0) {
        await roleRepository.delete({ name: In(roleNames) });
      }
    } catch (error) {
      // 忽略清理错误
      console.warn('Cleanup error:', error);
    }
  }
}
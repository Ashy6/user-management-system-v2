import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, EmailCode, EmailCodeType, UserSession, LoginLog, LoginStatus } from '../entities';
import { EmailService } from './email.service';
import { getJwtRefreshConfig } from '../config';
import { SendCodeDto } from '../dto/send-code.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';





export interface AuthResult {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailCode)
    private emailCodeRepository: Repository<EmailCode>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @InjectRepository(LoginLog)
    private loginLogRepository: Repository<LoginLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async sendVerificationCode(sendCodeDto: SendCodeDto): Promise<{ success: boolean; message: string }> {
    const { email, type } = sendCodeDto;

    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }

    // 检查是否已存在用户（注册时）
    if (type === EmailCodeType.REGISTER) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('该邮箱已被注册');
      }
    }

    // 检查是否存在用户（登录时）
    if (type === EmailCodeType.LOGIN) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (!existingUser) {
        throw new BadRequestException('该邮箱尚未注册');
      }
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('账户已被禁用');
      }
    }

    // 检查频率限制（5分钟内只能发送一次）
    const recentCode = await this.emailCodeRepository.findOne({
      where: {
        email,
        type,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
      },
      order: { createdAt: 'DESC' },
    });

    if (recentCode && recentCode.createdAt > new Date(Date.now() - 5 * 60 * 1000)) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 保存验证码
    const emailCode = this.emailCodeRepository.create({
      email,
      code,
      type,
      expiresAt,
    });
    await this.emailCodeRepository.save(emailCode);

    // 发送邮件
    const emailSent = await this.emailService.sendVerificationCode(email, code, type);
    if (!emailSent) {
      throw new BadRequestException('验证码发送失败，请稍后重试');
    }

    this.logger.log(`Verification code sent to ${email} for ${type}`);
    return { success: true, message: '验证码已发送' };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const { email, code } = loginDto;

    // 验证验证码
    const emailCode = await this.emailCodeRepository.findOne({
      where: {
        email,
        code,
        type: EmailCodeType.LOGIN,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!emailCode) {
      await this.logLoginAttempt(undefined, ipAddress, userAgent, LoginStatus.FAILED);
      throw new UnauthorizedException('验证码无效');
    }

    if (emailCode.expiresAt < new Date()) {
      await this.logLoginAttempt(undefined, ipAddress, userAgent, LoginStatus.FAILED);
      throw new UnauthorizedException('验证码已过期');
    }

    // 查找用户，如果不存在则创建
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      // 用户不存在，自动创建用户（验证码登录即代表用户创建）
      const newUser = this.userRepository.create({
        email,
        name: email.split('@')[0], // 使用邮箱前缀作为默认用户名
        status: UserStatus.ACTIVE,
        roleId: undefined, // 默认角色将在数据库层面设置
      });

      const savedUser = await this.userRepository.save(newUser);
      
      // 重新查询用户以获取关联的角色信息
      user = await this.userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['role'],
      });

      if (!user) {
        await this.logLoginAttempt(undefined, ipAddress, userAgent, LoginStatus.FAILED);
        throw new Error('用户创建失败');
      }

      this.logger.log(`New user ${user.email} created via login`);
    } else if (user.status !== UserStatus.ACTIVE) {
      await this.logLoginAttempt(user.id, ipAddress, userAgent, LoginStatus.FAILED);
      throw new UnauthorizedException('用户已被禁用');
    }

    // 标记验证码为已使用
    emailCode.isUsed = true;
    await this.emailCodeRepository.save(emailCode);

    // 生成令牌
    const tokens = await this.generateTokens(user);

    // 保存会话
    await this.saveUserSession(user.id, tokens.refreshToken, ipAddress, userAgent);

    // 记录登录日志
    await this.logLoginAttempt(user.id, ipAddress, userAgent, LoginStatus.SUCCESS);

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        status: user.status,
        role: user.role,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const { email, code, name } = registerDto;
    const phone = (registerDto as any).phone;

    // 验证验证码
    const emailCode = await this.emailCodeRepository.findOne({
      where: {
        email,
        code,
        type: EmailCodeType.REGISTER,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!emailCode) {
      throw new BadRequestException('验证码无效');
    }

    if (emailCode.expiresAt < new Date()) {
      throw new BadRequestException('验证码已过期');
    }

    // 检查邮箱是否已被注册
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 创建用户
    const user = this.userRepository.create({
      email,
      name,
      phone,
      status: UserStatus.ACTIVE,
      roleId: undefined, // 默认角色将在数据库层面设置
    });

    const savedUser = await this.userRepository.save(user);

    // 标记验证码为已使用
    emailCode.isUsed = true;
    await this.emailCodeRepository.save(emailCode);

    // 重新查询用户以获取关联的角色信息
    const userWithRole = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });

    if (!userWithRole) {
      throw new Error('用户创建失败');
    }

    // 生成令牌
    const tokens = await this.generateTokens(userWithRole);

    // 保存会话
    await this.saveUserSession(userWithRole.id, tokens.refreshToken, ipAddress, userAgent);

    // 记录登录日志
    await this.logLoginAttempt(userWithRole.id, ipAddress, userAgent, LoginStatus.SUCCESS);

    this.logger.log(`User ${userWithRole.email} registered successfully`);

    return {
      user: {
        id: userWithRole.id,
        email: userWithRole.email,
        name: userWithRole.name,
        avatarUrl: userWithRole.avatarUrl,
        phone: userWithRole.phone,
        status: userWithRole.status,
        role: userWithRole.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const refreshConfig = getJwtRefreshConfig(this.configService);
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshConfig.secret,
      });

      // 查找会话
      const session = await this.userSessionRepository.findOne({
        where: { refreshToken, userId: payload.sub },
        relations: ['user', 'user.role'],
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      // 生成新的令牌
      const tokens = await this.generateTokens(session.user);

      // 更新会话
      session.refreshToken = tokens.refreshToken;
      session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天
      await this.userSessionRepository.save(session);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效');
    }
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    await this.userSessionRepository.delete({ refreshToken });
    return { success: true };
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    };

    const refreshConfig = getJwtRefreshConfig(this.configService);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: refreshConfig.secret,
        expiresIn: refreshConfig.expiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveUserSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const session = this.userSessionRepository.create({
      userId,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天
    });

    await this.userSessionRepository.save(session);
  }

  private async logLoginAttempt(
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    status: LoginStatus = LoginStatus.SUCCESS,
  ): Promise<void> {
    const loginLog = this.loginLogRepository.create({
      userId,
      ipAddress,
      userAgent,
      status,
    });

    await this.loginLogRepository.save(loginLog);
  }
}
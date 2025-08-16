/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { SettingsDto, UpdateSettingsDto } from '../dto/settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}

  async getSettings(): Promise<SettingsDto> {
    const settings = await this.settingRepository.find();

    const settingsMap = new Map<string, any>();
    settings.forEach((setting) => {
      settingsMap.set(
        setting.key,
        this.parseSettingValue(setting.value, setting.type),
      );
    });

    return {
      emailConfig: {
        host: settingsMap.get('email.host') || 'localhost',
        port: settingsMap.get('email.port') || 587,
        secure: settingsMap.get('email.secure') || false,
        username: settingsMap.get('email.username') || '',
        // 密码字段被过滤，不返回给客户端
        from: settingsMap.get('email.from') || 'noreply@yourdomain.com',
      },
      securityConfig: {
        jwtAccessExpiration:
          settingsMap.get('security.jwt_access_expiration') || 3600,
        jwtRefreshExpiration:
          settingsMap.get('security.jwt_refresh_expiration') || 86400,
        verificationCodeExpiration:
          settingsMap.get('security.verification_code_expiration') || 300,
        maxLoginAttempts: settingsMap.get('security.max_login_attempts') || 5,
        accountLockoutDuration:
          settingsMap.get('security.account_lockout_duration') || 900,
      },
      systemConfig: {
        systemName: settingsMap.get('system.name') || '用户管理系统',
        systemDescription: settingsMap.get('system.description') || '',
        systemVersion: settingsMap.get('system.version') || '1.0.0',
        allowUserRegistration:
          settingsMap.get('system.allow_user_registration') || true,
        defaultUserRoleId:
          settingsMap.get('system.default_user_role_id') || null,
        maintenanceMode: settingsMap.get('system.maintenance_mode') || false,
        maintenanceMessage: settingsMap.get('system.maintenance_message') || '',
      },
    };
  }

  async updateSettings(
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsDto> {
    // 业务逻辑验证
    this.validateSettingsUpdate(updateSettingsDto);
    
    const updates: Array<{ key: string; value: any; type: string }> = [];

    if (updateSettingsDto.emailConfig) {
      const { emailConfig } = updateSettingsDto;
      updates.push(
        { key: 'email.host', value: emailConfig.host, type: 'string' },
        { key: 'email.port', value: emailConfig.port, type: 'number' },
        { key: 'email.secure', value: emailConfig.secure, type: 'boolean' },
        { key: 'email.username', value: emailConfig.username, type: 'string' },
        { key: 'email.password', value: emailConfig.password, type: 'string' },
        { key: 'email.from', value: emailConfig.from, type: 'string' },
      );
    }

    if (updateSettingsDto.securityConfig) {
      const { securityConfig } = updateSettingsDto;
      updates.push(
        {
          key: 'security.jwt_access_expiration',
          value: securityConfig.jwtAccessExpiration,
          type: 'number',
        },
        {
          key: 'security.jwt_refresh_expiration',
          value: securityConfig.jwtRefreshExpiration,
          type: 'number',
        },
        {
          key: 'security.verification_code_expiration',
          value: securityConfig.verificationCodeExpiration,
          type: 'number',
        },
        {
          key: 'security.max_login_attempts',
          value: securityConfig.maxLoginAttempts,
          type: 'number',
        },
        {
          key: 'security.account_lockout_duration',
          value: securityConfig.accountLockoutDuration,
          type: 'number',
        },
      );
    }

    if (updateSettingsDto.systemConfig) {
      const { systemConfig } = updateSettingsDto;
      updates.push(
        { key: 'system.name', value: systemConfig.systemName, type: 'string' },
        {
          key: 'system.description',
          value: systemConfig.systemDescription || '',
          type: 'string',
        },
        {
          key: 'system.version',
          value: systemConfig.systemVersion,
          type: 'string',
        },
        {
          key: 'system.allow_user_registration',
          value: systemConfig.allowUserRegistration,
          type: 'boolean',
        },
        {
          key: 'system.default_user_role_id',
          value: systemConfig.defaultUserRoleId || '',
          type: 'string',
        },
        {
          key: 'system.maintenance_mode',
          value: systemConfig.maintenanceMode,
          type: 'boolean',
        },
        {
          key: 'system.maintenance_message',
          value: systemConfig.maintenanceMessage || '',
          type: 'string',
        },
      );
    }

    // 批量更新设置
    for (const update of updates) {
      await this.upsertSetting(update.key, update.value, update.type);
    }

    this.logger.log(`Settings updated: ${updates.length} items`);
    return this.getSettings();
  }

  async getSetting(key: string): Promise<any> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }
    return this.parseSettingValue(setting.value, setting.type);
  }

  async setSetting(
    key: string,
    value: any,
    type: string,
    description?: string,
  ): Promise<void> {
    await this.upsertSetting(key, value, type, description);
    this.logger.log(`Setting '${key}' updated`);
  }

  private async upsertSetting(
    key: string,
    value: any,
    type: string,
    description?: string,
  ): Promise<void> {
    const stringValue = this.stringifySettingValue(value, type);

    const existingSetting = await this.settingRepository.findOne({
      where: { key },
    });

    if (existingSetting) {
      existingSetting.value = stringValue;
      existingSetting.type = type as any;
      if (description) {
        existingSetting.description = description;
      }
      await this.settingRepository.save(existingSetting);
    } else {
      const newSetting = this.settingRepository.create({
        key,
        value: stringValue,
        type: type as any,
        description: description || '',
        isPublic: false,
        isEditable: true,
      });
      await this.settingRepository.save(newSetting);
    }
  }

  private parseSettingValue(value: string, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      case 'string':
      default:
        return value;
    }
  }

  private stringifySettingValue(value: any, type: string): string {
    switch (type) {
      case 'boolean':
        return String(Boolean(value));
      case 'number':
        return String(Number(value));
      case 'json':
        return JSON.stringify(value);
      case 'string':
      default:
        return String(value);
    }
  }

  private validateSettingsUpdate(updateSettingsDto: UpdateSettingsDto): void {
    // 检查注入攻击
    this.checkForInjectionAttacks(updateSettingsDto);
    
    // 验证安全配置
    if (updateSettingsDto.securityConfig) {
      const { securityConfig } = updateSettingsDto;
      if (securityConfig.jwtAccessExpiration !== undefined) {
        if (securityConfig.jwtAccessExpiration <= 0 || securityConfig.jwtAccessExpiration > 86400) {
          throw new BadRequestException('JWT访问令牌过期时间必须在1-86400秒之间');
        }
      }
      if (securityConfig.jwtRefreshExpiration !== undefined) {
        if (securityConfig.jwtRefreshExpiration <= 0 || securityConfig.jwtRefreshExpiration > 2592000) {
          throw new BadRequestException('JWT刷新令牌过期时间必须在1-2592000秒之间');
        }
      }
      if (securityConfig.verificationCodeExpiration !== undefined && securityConfig.verificationCodeExpiration <= 0) {
        throw new BadRequestException('验证码过期时间必须大于0');
      }
      if (securityConfig.maxLoginAttempts !== undefined) {
        if (securityConfig.maxLoginAttempts <= 0 || securityConfig.maxLoginAttempts > 100) {
          throw new BadRequestException('最大登录尝试次数必须在1-100之间');
        }
      }
      if (securityConfig.accountLockoutDuration !== undefined && securityConfig.accountLockoutDuration <= 0) {
        throw new BadRequestException('账户锁定时长必须大于0');
      }
    }

    // 验证邮件配置
    if (updateSettingsDto.emailConfig) {
      const { emailConfig } = updateSettingsDto;
      if (emailConfig.password !== undefined && emailConfig.password.trim() === '') {
        throw new BadRequestException('SMTP密码不能为空');
      }
      if (emailConfig.port !== undefined && (emailConfig.port < 1 || emailConfig.port > 65535)) {
        throw new BadRequestException('SMTP端口号必须在1-65535之间');
      }
      if (emailConfig.host !== undefined && emailConfig.host.length > 253) {
        throw new BadRequestException('SMTP主机名长度不能超过253个字符');
      }
      if (emailConfig.username !== undefined && emailConfig.username.length > 320) {
        throw new BadRequestException('邮箱用户名长度不能超过320个字符');
      }
    }

    // 验证系统配置
    if (updateSettingsDto.systemConfig) {
      const { systemConfig } = updateSettingsDto;
      if (systemConfig.systemName !== undefined) {
        if (systemConfig.systemName.trim() === '') {
          throw new BadRequestException('系统名称不能为空');
        }
        if (systemConfig.systemName.length > 255) {
          throw new BadRequestException('系统名称长度不能超过255个字符');
        }
      }
      if (systemConfig.systemDescription !== undefined && systemConfig.systemDescription.length > 1000) {
        throw new BadRequestException('系统描述长度不能超过1000个字符');
      }
      if (systemConfig.systemVersion !== undefined) {
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(systemConfig.systemVersion)) {
          throw new BadRequestException('系统版本格式无效，应为x.y.z格式');
        }
      }
      if (systemConfig.allowUserRegistration !== undefined && typeof systemConfig.allowUserRegistration !== 'boolean') {
        throw new BadRequestException('allowUserRegistration必须是布尔值');
      }
      if (systemConfig.maintenanceMode !== undefined && typeof systemConfig.maintenanceMode !== 'boolean') {
        throw new BadRequestException('maintenanceMode必须是布尔值');
      }
    }
  }

  private checkForInjectionAttacks(data: any): void {
    const maliciousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+SET/i,
      /<script[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /--/,
      /;\s*--/,
      /\/\*.*\*\//,
    ];

    const checkValue = (value: any): void => {
      if (typeof value === 'string') {
        for (const pattern of maliciousPatterns) {
          if (pattern.test(value)) {
            throw new BadRequestException('检测到潜在的安全威胁，请求被拒绝');
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(checkValue);
      }
    };

    checkValue(data);
  }
}

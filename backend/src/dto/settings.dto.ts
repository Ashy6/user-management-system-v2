import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class EmailConfigDto {
  @ApiProperty({ description: 'SMTP服务器地址' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'SMTP端口号' })
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ description: '是否使用SSL' })
  @IsBoolean()
  secure: boolean;

  @ApiProperty({ description: 'SMTP用户名' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'SMTP密码', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ApiProperty({ description: '发件人邮箱' })
  @IsEmail()
  from: string;
}

export class SecurityConfigDto {
  @ApiProperty({ description: 'JWT访问令牌过期时间（秒）' })
  @IsNumber()
  @Min(300)
  jwtAccessExpiration: number;

  @ApiProperty({ description: 'JWT刷新令牌过期时间（秒）' })
  @IsNumber()
  @Min(3600)
  jwtRefreshExpiration: number;

  @ApiProperty({ description: '验证码过期时间（秒）' })
  @IsNumber()
  @Min(60)
  @Max(600)
  verificationCodeExpiration: number;

  @ApiProperty({ description: '最大登录尝试次数' })
  @IsNumber()
  @Min(3)
  @Max(10)
  maxLoginAttempts: number;

  @ApiProperty({ description: '账户锁定时间（秒）' })
  @IsNumber()
  @Min(300)
  accountLockoutDuration: number;
}

export class SystemConfigDto {
  @ApiProperty({ description: '系统名称' })
  @IsString()
  systemName: string;

  @ApiProperty({ description: '系统描述', required: false })
  @IsOptional()
  @IsString()
  systemDescription?: string;

  @ApiProperty({ description: '系统版本' })
  @IsString()
  systemVersion: string;

  @ApiProperty({ description: '是否允许用户注册' })
  @IsBoolean()
  allowUserRegistration: boolean;

  @ApiProperty({ description: '默认用户角色ID', required: false })
  @IsOptional()
  @IsString()
  defaultUserRoleId?: string;

  @ApiProperty({ description: '系统维护模式' })
  @IsBoolean()
  maintenanceMode: boolean;

  @ApiProperty({ description: '维护模式消息', required: false })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}

export class SettingsDto {
  @ApiProperty({ type: EmailConfigDto, description: '邮件配置' })
  emailConfig: EmailConfigDto;

  @ApiProperty({ type: SecurityConfigDto, description: '安全配置' })
  securityConfig: SecurityConfigDto;

  @ApiProperty({ type: SystemConfigDto, description: '系统配置' })
  systemConfig: SystemConfigDto;
}

export class UpdateSettingsDto {
  @ApiProperty({
    type: EmailConfigDto,
    description: '邮件配置',
    required: false,
  })
  @IsOptional()
  emailConfig?: EmailConfigDto;

  @ApiProperty({
    type: SecurityConfigDto,
    description: '安全配置',
    required: false,
  })
  @IsOptional()
  securityConfig?: SecurityConfigDto;

  @ApiProperty({
    type: SystemConfigDto,
    description: '系统配置',
    required: false,
  })
  @IsOptional()
  systemConfig?: SystemConfigDto;
}

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getEmailConfig, EmailConfig } from '../config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private emailConfig: EmailConfig;
  private isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.emailConfig = getEmailConfig(this.configService);
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.logger.log(
      `Email config loaded: ${JSON.stringify({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        user: this.emailConfig.auth.user,
        from: this.emailConfig.from,
      })}`,
    );
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // 检查是否为邮件配置为占位符
    const isPlaceholderConfig =
      this.emailConfig.auth.user === 'your-email@example.com' ||
      this.emailConfig.auth.user === '' ||
      this.emailConfig.auth.pass === 'your-app-password' ||
      this.emailConfig.auth.pass === '';

    this.logger.log(
      `isDevelopment: ${this.isDevelopment}, isPlaceholderConfig: ${isPlaceholderConfig}`,
    );

    if (isPlaceholderConfig) {
      // 开发环境使用测试账户
      // this.transporter = nodemailer.createTransport({
      //   host: 'smtp.ethereal.email',
      //   port: 587,
      //   secure: false,
      //   auth: {
      //     user: 'test.user@ethereal.email',
      //     pass: 'ethereal.pass',
      //   },
      // });
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth,
      });
      this.logger.log('Using development email configuration (Ethereal Email)');
    } else {
      // 生产环境使用真实配置
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth,
      });
    }
    console.log(666, this.emailConfig);
  }

  async sendVerificationCode(
    email: string,
    code: string,
    type: string,
  ): Promise<boolean> {
    try {
      const subject = this.getSubjectByType(type);
      const html = this.getEmailTemplate(code, type);

      // 检查是否为占位符配置
      const isPlaceholderConfig =
        this.emailConfig.auth.user === 'your-email@example.com' ||
        this.emailConfig.auth.user === '' ||
        this.emailConfig.auth.pass === 'your-app-password' ||
        this.emailConfig.auth.pass === '';

      if (isPlaceholderConfig) {
        // 开发环境模拟发送邮件
        this.logger.log(`[DEV MODE] Simulating email send to ${email}`);
        this.logger.log(`[DEV MODE] Subject: ${subject}`);
        this.logger.log(`[DEV MODE] Verification Code: ${code}`);
        this.logger.log(`[DEV MODE] Type: ${type}`);
        this.logger.log(
          `[DEV MODE] isPlaceholderConfig: ${isPlaceholderConfig}`,
        );

        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 100));

        this.logger.log(`[DEV MODE] Email simulation completed for ${email}`);
        return true;
      } else {
        // 生产环境真实发送
        this.logger.log(
          `[PROD MODE] Attempting to send real email to ${email}`,
        );
        this.logger.log(
          `[PROD MODE] Using SMTP config: ${this.emailConfig.host}:${this.emailConfig.port}`,
        );

        const mailOptions = {
          from: this.emailConfig.from,
          to: email,
          subject,
          html,
        };

        this.logger.log(
          `[PROD MODE] Mail options: ${JSON.stringify(mailOptions)}`,
        );

        const result = await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `[PROD MODE] Email sent successfully: ${JSON.stringify(result)}`,
        );
        this.logger.log(`Verification code sent to ${email}`);
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      return false;
    }
  }

  private getSubjectByType(type: string): string {
    const subjects = {
      login: '登录验证码',
      register: '注册验证码',
      reset: '密码重置验证码',
    };
    return subjects[type] || '验证码';
  }

  private getEmailTemplate(code: string, type: string): string {
    const typeText = {
      login: '登录',
      register: '注册',
      reset: '密码重置',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>验证码</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">用户管理系统</h2>
          <p>您好！北京星界力科技的邮件提醒服务</p>
          <p>您正在进行${typeText[type] || ''}操作，验证码为：</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <span style="font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="color: #666;">验证码有效期为5分钟，请及时使用。</p>
          <p style="color: #666;">如果这不是您的操作，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">此邮件由系统自动发送，请勿回复。</p>
        </div>
      </body>
      </html>
    `;
  }
}

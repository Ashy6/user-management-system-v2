/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sendGridApiKey: string;
  private fromEmail: string;
  private isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.sendGridApiKey = this.configService.get('SENDGRID_API_KEY', '');
    this.fromEmail = this.configService.get('SENDGRID_FROM_EMAIL', 'noreply@example.com');
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.logger.log(
      `SendGrid config loaded: ${JSON.stringify({
        hasApiKey: !!this.sendGridApiKey,
        fromEmail: this.fromEmail,
        isDevelopment: this.isDevelopment,
      })}`,
    );
  }

  private async sendEmailWithSendGrid(
    to: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              subject: subject,
            },
          ],
          from: { email: this.fromEmail },
          content: [
            {
              type: 'text/html',
              value: html,
            },
          ],
        }),
      });

      if (response.ok) {
        this.logger.log(`Email sent successfully to ${to}`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`SendGrid API error: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send email via SendGrid:`, error);
      return false;
    }
  }

  async sendVerificationCode(
    email: string,
    code: string,
    type: string,
  ): Promise<boolean> {
    try {
      const subject = this.getSubjectByType(type);
      const html = this.getEmailTemplate(code, type);

      // 检查是否配置了SendGrid API Key
      if (!this.sendGridApiKey || this.sendGridApiKey === '') {
        this.logger.warn(`[DEV MODE] No SendGrid API key configured, simulating email send to ${email}`);
        this.logger.log(`[DEV MODE] Subject: ${subject}`);
        this.logger.log(`[DEV MODE] Verification Code: ${code}`);
        this.logger.log(`[DEV MODE] Type: ${type}`);
        
        // 模拟网络延迟
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        this.logger.log(`[DEV MODE] Email simulation completed for ${email}`);
        return true;
      }

      // 使用SendGrid发送邮件
      this.logger.log(`[SendGrid] Attempting to send email to ${email}`);
      this.logger.log(`[SendGrid] Subject: ${subject}`);
      this.logger.log(`[SendGrid] From: ${this.fromEmail}`);
      
      const result = await this.sendEmailWithSendGrid(email, subject, html);
      
      if (result) {
        this.logger.log(`[SendGrid] Verification code sent successfully to ${email}`);
      } else {
        this.logger.error(`[SendGrid] Failed to send verification code to ${email}`);
      }
      
      return result;
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

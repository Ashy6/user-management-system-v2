import { ConfigService } from '@nestjs/config';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export const getEmailConfig = (configService: ConfigService): EmailConfig => ({
  host: configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
  port: configService.get<number>('SMTP_PORT', 587),
  secure: configService.get<boolean>('SMTP_SECURE', false),
  auth: {
    user: configService.get<string>('SMTP_USER', ''),
    pass: configService.get<string>('SMTP_PASS', ''),
  },
  from: configService.get<string>('SMTP_FROM', 'noreply@yourdomain.com'),
});
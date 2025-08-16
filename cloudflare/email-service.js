// Cloudflare Workers邮件发送服务
// 使用第三方邮件API服务，因为Workers不支持直接SMTP连接

// 使用Resend API作为邮件发送服务（免费额度足够测试）
// 也可以使用SendGrid、Mailgun等其他服务

class EmailService {
  constructor(env) {
    this.env = env;
    // 如果有Resend API Key，使用Resend服务
    this.resendApiKey = env.RESEND_API_KEY;
    // 否则使用模拟发送
    this.mockMode = !this.resendApiKey;
  }

  async sendEmail(to, subject, text) {
    if (this.mockMode) {
      return this.mockSendEmail(to, subject, text);
    } else {
      return this.sendWithResend(to, subject, text);
    }
  }

  // 模拟邮件发送（用于测试）
  async mockSendEmail(to, subject, text) {
    console.log('📧 模拟邮件发送:');
    console.log('收件人:', to);
    console.log('主题:', subject);
    console.log('内容:', text);
    console.log('发送时间:', new Date().toISOString());
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      service: 'mock'
    };
  }

  // 使用Resend API发送邮件
  async sendWithResend(to, subject, text) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.env.SMTP_FROM || 'noreply@yourdomain.com',
          to: [to],
          subject: subject,
          text: text
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API错误: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log('✅ 邮件通过Resend发送成功:', result.id);
      
      return {
        success: true,
        messageId: result.id,
        service: 'resend'
      };
    } catch (error) {
      console.error('❌ Resend邮件发送失败:', error);
      throw error;
    }
  }

  // 使用SendGrid API发送邮件（备选方案）
  async sendWithSendGrid(to, subject, text) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: { email: this.env.SMTP_FROM || 'noreply@yourdomain.com' },
          subject: subject,
          content: [{
            type: 'text/plain',
            value: text
          }]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid API错误: ${response.status} - ${error}`);
      }

      console.log('✅ 邮件通过SendGrid发送成功');
      
      return {
        success: true,
        messageId: response.headers.get('x-message-id'),
        service: 'sendgrid'
      };
    } catch (error) {
      console.error('❌ SendGrid邮件发送失败:', error);
      throw error;
    }
  }
}

// 导出邮件服务
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailService;
} else {
  // 在Workers环境中使用
  globalThis.EmailService = EmailService;
}
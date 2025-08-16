// SendGrid API测试脚本
const testSendGrid = async () => {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
  const SENDGRID_FROM_EMAIL = '1801273437@qq.com';
  
  if (!SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY 未设置');
    return false;
  }
  
  console.log('🔑 API Key:', SENDGRID_API_KEY.substring(0, 10) + '...');
  console.log('📧 From Email:', SENDGRID_FROM_EMAIL);
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: '1801273437@qq.com' }],
          subject: 'SendGrid测试邮件',
        }],
        from: { email: SENDGRID_FROM_EMAIL },
        content: [{
          type: 'text/html',
          value: '<h1>SendGrid配置测试</h1><p>如果您收到此邮件，说明SendGrid配置正确！</p>',
        }],
      }),
    });
    
    console.log('📡 Response Status:', response.status);
    
    if (response.ok) {
      console.log('✅ SendGrid配置正确，邮件发送成功！');
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ SendGrid API错误:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ 网络错误:', error.message);
    return false;
  }
};

// 运行测试
testSendGrid().then(success => {
  process.exit(success ? 0 : 1);
});
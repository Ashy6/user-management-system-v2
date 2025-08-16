// 测试邮件发送功能的脚本
// 使用本地环境测试邮件配置

const nodemailer = require('nodemailer');

// SMTP配置（从.env.cloudflare文件中获取）
const smtpConfig = {
  host: 'smtp.qq.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: '1801273437@qq.com',
    pass: 'unpviszocymheeaa' // QQ邮箱授权码
  }
};

// 创建邮件传输器
const transporter = nodemailer.createTransport(smtpConfig);

// 测试邮件发送
async function testEmailSending() {
  try {
    console.log('正在测试SMTP连接...');
    
    // 验证SMTP连接
    await transporter.verify();
    console.log('✅ SMTP连接成功');
    
    // 发送测试邮件
    const testEmail = {
      from: '1801273437@qq.com',
      to: '1801273437@qq.com', // 发送给自己测试
      subject: '用户管理系统 - 验证码测试',
      text: '您的验证码是: 123456\n\n这是一封测试邮件，验证邮件发送功能是否正常。\n\n如果您收到此邮件，说明邮件配置正确。'
    };
    
    console.log('正在发送测试邮件...');
    const info = await transporter.sendMail(testEmail);
    console.log('✅ 邮件发送成功!');
    console.log('邮件ID:', info.messageId);
    console.log('响应:', info.response);
    
  } catch (error) {
    console.error('❌ 邮件发送失败:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 解决方案:');
      console.log('1. 确认QQ邮箱已开启SMTP服务');
      console.log('2. 确认授权码正确（不是QQ密码）');
      console.log('3. 在QQ邮箱设置中生成新的授权码');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 解决方案:');
      console.log('1. 检查网络连接');
      console.log('2. 确认SMTP服务器地址和端口正确');
      console.log('3. 检查防火墙设置');
    }
  }
}

// 运行测试
testEmailSending();
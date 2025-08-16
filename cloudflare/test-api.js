// 测试Cloudflare Workers API
const testEmailAPI = async () => {
  try {
    console.log('🔄 开始测试邮件发送API...');
    
    const response = await fetch('https://email-backend-worker.zengjx1998.workers.dev/api/auth/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        email: '1801273437@qq.com',
        type: 'login'
      })
    });
    
    console.log('📡 响应状态:', response.status);
    console.log('📡 响应头:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 响应内容:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ 邮件发送成功:', data);
    } else {
      console.error('❌ 邮件发送失败:', responseText);
    }
  } catch (error) {
    console.error('❌ 网络错误:', error);
  }
};

// 测试健康检查
const testHealthAPI = async () => {
  try {
    console.log('🔄 测试健康检查API...');
    
    const response = await fetch('https://email-backend-worker.zengjx1998.workers.dev/api/health');
    
    console.log('📡 健康检查状态:', response.status);
    const responseText = await response.text();
    console.log('📡 健康检查响应:', responseText);
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
  }
};

// 运行测试
const runTests = async () => {
  await testHealthAPI();
  await testEmailAPI();
};

runTests();
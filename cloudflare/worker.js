// Cloudflare Workers 邮件发送服务

// 工具函数
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// 使用SendGrid发送邮件
async function sendEmailWithSendGrid(to, subject, text, env) {
  console.log('📧 SendGrid发送邮件:', {
    to: to,
    from: env.SENDGRID_FROM_EMAIL,
    subject: subject,
    hasApiKey: !!env.SENDGRID_API_KEY
  });
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">${subject}</h2>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; line-height: 1.6; color: #555;">${text.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="font-size: 12px; color: #888; text-align: center;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `;
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: to }],
        subject: subject
      }],
      from: { email: env.SENDGRID_FROM_EMAIL },
      content: [{
        type: 'text/html',
        value: htmlContent
      }]
    })
  });

  console.log('📡 SendGrid响应状态:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ SendGrid API错误:', error);
    throw new Error(`SendGrid API错误: ${response.status} - ${error}`);
  }

  console.log('✅ SendGrid邮件发送成功');
  return { success: true };
}

// 模拟的数据存储
const emailCodes = new Map();

// 发送验证码处理函数
async function handleSendCode(request, env, origin) {
  try {
    const { email, type } = await request.json();
    
    console.log('📨 收到发送验证码请求:', { email, type });
    
    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ error: '邮箱格式不正确' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }

    const code = generateCode();
    emailCodes.set(email, {
      code,
      expires: Date.now() + 5 * 60 * 1000, // 5分钟过期
    });

    // 发送验证码邮件
    const emailSubject = '用户管理系统 - 验证码';
    const emailText = `您的验证码是: ${code}\n\n验证码将在5分钟后过期，请及时使用。\n\n如果您没有请求此验证码，请忽略此邮件。`;
    
    if (env.SENDGRID_API_KEY) {
      await sendEmailWithSendGrid(email, emailSubject, emailText, env);
    } else {
      console.log('🔄 模拟发送邮件 (未配置SendGrid):', { email, code });
    }
    
    console.log(`✅ 验证码已发送到 ${email}: ${code}`);

    return new Response(JSON.stringify({ 
      message: '验证码已发送，请查收邮件',
      // 开发环境返回验证码
      ...(env.NODE_ENV === 'development' && { code })
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    console.error('❌ 发送验证码失败:', error);
    return new Response(JSON.stringify({ 
      error: '发送验证码失败，请稍后重试',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  }
}

// 健康检查处理函数
async function handleHealth(request, env, origin) {
  return new Response(JSON.stringify({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    sendgrid_configured: !!env.SENDGRID_API_KEY,
    from_email: env.SENDGRID_FROM_EMAIL
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// 配置状态处理函数
async function handleConfigStatus(request, env, origin) {
  console.log('🔍 检查配置状态:', { env: !!env, apiKey: !!env?.SENDGRID_API_KEY });
  
  const hasApiKey = !!(env && env.SENDGRID_API_KEY);
  const fromEmail = (env && env.SENDGRID_FROM_EMAIL) || 'not-configured';
  const environment = (env && env.NODE_ENV) || 'development';
  
  const response = {
    hasApiKey,
    fromEmail,
    environment,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 配置状态响应:', response);
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// 主请求处理函数
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get('Origin');

  console.log(`📥 ${method} ${path}`);

  // 处理CORS预检请求
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(origin),
    });
  }

  // 路由处理
  if (path === '/api/auth/send-code' && method === 'POST') {
    return handleSendCode(request, env, origin);
  }
  
  if (path === '/api/health' && method === 'GET') {
    return handleHealth(request, env, origin);
  }

  if (path === '/api/auth/config-status' && method === 'GET') {
    return handleConfigStatus(request, env, origin);
  }

  // 404处理
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// Workers导出
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('❌ Worker Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
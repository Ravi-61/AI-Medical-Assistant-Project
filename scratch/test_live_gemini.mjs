import http from 'http';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testLive() {
  console.log('--- TESTING LIVE GEMINI API INTEGRATION ---');

  // 1. Get Auth Token
  const loginRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'testuser@example.com', password: 'Password123!' }
  );

  let token = loginRes.body?.data?.token;
  if (!token) {
    const regRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Live Tester', email: `live_tester_${Date.now()}@example.com`, password: 'Password123!' }
    );
    token = regRes.body?.data?.token;
  }

  console.log('Authenticated token obtained:', Boolean(token));

  // 2. Test Chat API
  console.log('Sending message to /api/chat/message...');
  const chatRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat/message',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    },
    { message: 'What is normal blood pressure?' }
  );

  console.log('Chat Response Status:', chatRes.status);
  console.log('Chat Success:', chatRes.body?.success);
  if (chatRes.status === 200) {
    console.log('Live Gemini response received!');
    console.log('Message preview:', chatRes.body?.data?.message?.substring(0, 100) + '...');
    console.log('Model:', chatRes.body?.data?.model);
    console.log('Provider:', chatRes.body?.data?.provider);
  } else {
    console.log('Error Code:', chatRes.body?.error?.code);
    console.log('Error Message:', chatRes.body?.error?.message);
  }
}

testLive().catch((err) => console.error('Test error:', err));

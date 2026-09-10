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
    if (data) {
      if (Buffer.isBuffer(data) || typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function testAll() {
  console.log('=== VERIFYING ALL 5 AI FEATURES WITH LIVE GEMINI ===\n');

  // Login / Auth token
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

  console.log('Authentication successful:', Boolean(token));

  // 1. Chat
  console.log('[1/5] Testing Chat (/api/chat/message)...');
  const chatRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/chat/message', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    { message: 'What does a normal resting heart rate look like?' }
  );
  console.log('  Chat Status:', chatRes.status, '| Success:', chatRes.body?.success, '| Model:', chatRes.body?.data?.model);
  if (chatRes.status !== 200) console.error('  Chat Error:', chatRes.body?.error);

  // 2. Symptoms
  console.log('[2/5] Testing Symptoms (/api/symptoms/analyze)...');
  const sympRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/symptoms/analyze', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    { symptoms: ['mild sore throat', 'dry cough'], additionalContext: 'Duration 1 day, no fever.' }
  );
  console.log('  Symptoms Status:', sympRes.status, '| Success:', sympRes.body?.success, '| Urgency:', sympRes.body?.data?.analysis?.urgency);
  if (sympRes.status !== 200) console.error('  Symptoms Error:', sympRes.body?.error);

  // 3. Reports
  console.log('[3/5] Testing Reports (/api/reports/analyze)...');
  const boundary = '----WebKitFormBoundaryLiveTestReport789';
  const reportBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="report"; filename="lab_test.txt"',
    'Content-Type: text/plain',
    '',
    'Complete Blood Count: Hemoglobin 14.5 g/dL (Reference 13.5 - 17.5). White Blood Cells 6.2 x10^3/uL. Platelets 250 x10^3/uL.',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const reportRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(reportBody),
        Authorization: `Bearer ${token}`,
      },
    },
    reportBody
  );
  console.log('  Reports Status:', reportRes.status, '| Success:', reportRes.body?.success, '| Findings:', reportRes.body?.data?.explanation?.keyFindings?.length);
  if (reportRes.status !== 200) console.error('  Reports Error:', reportRes.body?.error);

  // 4. Medicine
  console.log('[4/5] Testing Medicine (/api/medicine/search)...');
  const medRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/medicine/search', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    { medicine: 'Amoxicillin' }
  );
  console.log('  Medicine Status:', medRes.status, '| Success:', medRes.body?.success, '| Generic Name:', medRes.body?.data?.medicine?.genericName, '| Confidence:', medRes.body?.data?.medicine?.confidence);
  if (medRes.status !== 200) console.error('  Medicine Error:', medRes.body?.error);

  // 5. Health Recommendations
  console.log('[5/5] Testing Health Recommendations (/api/health/recommendations)...');
  const healthRes = await request(
    { hostname: 'localhost', port: 5000, path: '/api/health/recommendations', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    { goals: ['Cardiovascular stamina', 'Better sleep hygiene'], ageGroup: 'Adult (31-50)', activityLevel: 'Moderately Active' }
  );
  console.log('  Health Status:', healthRes.status, '| Success:', healthRes.body?.success, '| Focus Areas:', healthRes.body?.data?.recommendations?.focusAreas?.length);
  if (healthRes.status !== 200) console.error('  Health Error:', healthRes.body?.error);

  console.log('\n=== ALL 5 AI FEATURES TESTED ===');
}

testAll().catch((err) => console.error('Error running tests:', err));

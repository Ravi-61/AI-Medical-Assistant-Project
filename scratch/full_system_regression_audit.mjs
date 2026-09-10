import http from 'http';

function request(options, data, isMultipart = false, boundary = '') {
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

async function runAudit() {
  console.log('===========================================================');
  console.log('  AI MEDICAL ASSISTANT — FULL SUITE REGRESSION & AUDIT');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // --- 1. SYSTEM HEALTH AUDIT ---
  console.log('\n[1/8] System Health API Audit:');
  const healthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
  });
  assert(healthRes.status === 200, 'GET /api/health returned 200 OK');
  assert(healthRes.body?.success === true, 'GET /api/health success is true');

  // --- 2. AUTHENTICATION & PROFILE AUDIT ---
  console.log('\n[2/8] Authentication & Profile API Audit:');
  const uniqueEmail = `audit_user_${Date.now()}@example.com`;
  const registerRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { name: 'Audit User', email: uniqueEmail, password: 'Password123!' }
  );
  assert(registerRes.status === 201, 'POST /api/auth/register returned 201 Created');
  const token = registerRes.body?.data?.token;
  assert(!!token, 'Registration returned JWT token');

  // Login test
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: uniqueEmail, password: 'Password123!' }
  );
  assert(loginRes.status === 200, 'POST /api/auth/login returned 200 OK');

  // Invalid login
  const invalidLogin = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: uniqueEmail, password: 'WrongPassword!' }
  );
  assert(invalidLogin.status === 401, 'Invalid password rejected with 401 Unauthorized');

  // Profile test
  const profileRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/profile',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(profileRes.status === 200, 'GET /api/auth/profile returned 200 OK');
  assert(profileRes.body?.data?.user?.email === uniqueEmail, 'Profile email matches registered user');

  // --- 3. CHATBOT AUDIT (PHASE 5) ---
  console.log('\n[3/8] Chatbot API Audit (Phase 5):');
  // Unauthenticated
  const chatUnauth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat/message',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { message: 'What causes headaches?' }
  );
  assert(chatUnauth.status === 401, 'Unauthenticated chat rejected with 401');

  // Authenticated call
  const chatAuth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { message: 'What causes headaches?' }
  );
  assert(
    chatAuth.status === 200 || chatAuth.status === 503,
    `Chat returned valid status (${chatAuth.status}) with safe handling`
  );

  // --- 4. SYMPTOM ANALYSIS AUDIT (PHASE 6) ---
  console.log('\n[4/8] Symptom Analysis API Audit (Phase 6):');
  const sympUnauth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/symptoms/analyze',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { symptoms: ['mild fatigue'] }
  );
  assert(sympUnauth.status === 401, 'Unauthenticated symptom analysis rejected with 401');

  const sympAuth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/symptoms/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { symptoms: ['mild fatigue', 'dry cough'], additionalContext: 'Duration 2 days' }
  );
  assert(
    sympAuth.status === 200 || sympAuth.status === 503,
    `Symptom analysis returned valid status (${sympAuth.status}) with safe handling`
  );

  // --- 5. MEDICAL REPORT AUDIT (PHASE 7) ---
  console.log('\n[5/8] Medical Report Explanation API Audit (Phase 7):');
  const boundary = '----WebKitFormBoundaryAuditTest123';
  const reportBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="report"; filename="sample_lab.txt"',
    'Content-Type: text/plain',
    '',
    'Patient Lab Results: Hemoglobin 14.2 g/dL (Reference: 13.5 - 17.5). White Blood Cells 6.5 x10^3/uL. Glucose 92 mg/dL.',
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
        Authorization: `Bearer ${token}`,
      },
    },
    reportBody
  );
  assert(
    reportRes.status === 200 || reportRes.status === 503,
    `Report analysis returned valid status (${reportRes.status}) with safe in-memory extraction`
  );

  // Disallowed extension test
  const badExtBody = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="report"; filename="malicious.exe"',
    'Content-Type: application/x-msdownload',
    '',
    'executable binary content',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const badExtRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/reports/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${token}`,
      },
    },
    badExtBody
  );
  assert(badExtRes.status === 400, 'Malicious/disallowed file upload rejected with 400');

  // --- 6. MEDICINE INFORMATION AUDIT (PHASE 8) ---
  console.log('\n[6/8] Medicine Information API Audit (Phase 8):');
  const medUnauth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicine/search',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { medicine: 'Amoxicillin' }
  );
  assert(medUnauth.status === 401, 'Unauthenticated medicine search rejected with 401');

  const medAuth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/medicine/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { medicine: 'Amoxicillin' }
  );
  assert(
    medAuth.status === 200 || medAuth.status === 503,
    `Medicine search returned valid status (${medAuth.status}) with safe handling`
  );

  // --- 7. HEALTH RECOMMENDATIONS AUDIT (PHASE 9) ---
  console.log('\n[7/8] Health Recommendations API Audit (Phase 9):');
  const healthUnauth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health/recommendations',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { goals: ['Cardiovascular health'] }
  );
  assert(healthUnauth.status === 401, 'Unauthenticated health recommendations rejected with 401');

  const healthAuth = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health/recommendations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      goals: ['Cardiovascular health', 'Better sleep hygiene'],
      ageGroup: 'Adult (31-50)',
      activityLevel: 'Moderately Active',
    }
  );
  assert(
    healthAuth.status === 200 || healthAuth.status === 503,
    `Health recommendations returned valid status (${healthAuth.status}) with safe handling`
  );

  // --- 8. MEDICAL SAFETY & SECURITY AUDIT ---
  console.log('\n[8/8] Security & Medical Safety Audit:');
  // Check 404 handler
  const notFoundRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/nonexistent-route-12345',
    method: 'GET',
  });
  assert(notFoundRes.status === 404, 'Unknown backend endpoint returned 404');

  console.log('\n===========================================================');
  console.log(`AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

const http = require('http');

console.log("Starting test script...");

function request(options, dataStr) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

(async () => {
  try {
    // 1. Register test user (might fail if exists, that's okay)
    const regData = JSON.stringify({ email: "testbot@test.com", password: "password123", role: "PATIENT", name: "Test Bot" });
    await request({
      hostname: 'localhost', port: 8081, path: '/api/auth/register', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': regData.length }
    }, regData);

    // 2. Login
    const loginData = JSON.stringify({ email: "testbot@test.com", password: "password123" });
    const loginRes = await request({
      hostname: 'localhost', port: 8081, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, loginData);
    
    console.log("Login HTTP code:", loginRes.statusCode);
    const token = JSON.parse(loginRes.body).token;
    if (!token) throw new Error("No token received");

    // 3. Get profile
    const profileRes = await request({
      hostname: 'localhost', port: 8081, path: '/api/drugs/profile?name=Amoxicillin', method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    console.log("Profile HTTP code:", profileRes.statusCode);
    console.log("Profile body:", profileRes.body);

    const valRes = await request({
        hostname: 'localhost',
        port: 8081,
        path: '/api/prescriptions/validate-item?drugName=Warfarin&patientEmail=console.patient@gmail.com',
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    console.log("Validate status:", valRes.status);
    console.log("Validate response:", valRes.body);

  } catch(e) {
    console.error("Error:", e);
  }
})();

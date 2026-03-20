const http = require('http');

function request(options, bodyData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (bodyData) {
            req.write(JSON.stringify(bodyData));
        }
        req.end();
    });
}

async function testWarfarin() {
    try {
        console.log("1. Logging in as doctor...");
        const loginRes = await request({
            hostname: 'localhost',
            port: 8081,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'doctor@system.com', password: 'password' });
        
        const token = JSON.parse(loginRes.body).token;
        console.log("Token obtained.");

        console.log("2. Validating Warfarin...");
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
        
        console.log("Status:", valRes.status);
        console.log("Response:", valRes.body);

    } catch (e) {
        console.error("Error:", e);
    }
}
testWarfarin();

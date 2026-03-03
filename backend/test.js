const http = require('http');

async function test() {
    console.log("Registering admin...");
    const regRes = await fetch('http://localhost:8081/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'testadmin2@test.com', password: 'password', fullName: 'Test Admin', role: 'ADMIN' })
    });
    console.log("Register status:", regRes.status);
    console.log("Register response:", await regRes.text());

    console.log("Logging in as admin...");
    const loginRes = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'testadmin2@test.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    console.log("Login token acquired:", !!loginData.token);

    const token = loginData.token;

    console.log("Getting all users...");
    const usersRes = await fetch('http://localhost:8081/api/admin/users', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await usersRes.json();
    console.log("Total users fetched:", users.length);

    const pendingDoc = users.find(u => !u.verified && u.role === 'DOCTOR');
    if (!pendingDoc) {
        console.log("No pending doctor found to verify!");
        return;
    }

    console.log(`Verifying pending user ${pendingDoc.fullName} (ID: ${pendingDoc.id})...`);
    const verifyRes = await fetch(`http://localhost:8081/api/admin/verify/${pendingDoc.id}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log("Verify HTTP status:", verifyRes.status);
    const verifyText = await verifyRes.text();
    console.log("Verify Response body:", verifyText);
}

test().catch(console.error);

const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

const accounts = [
    { email: 'console.doc@gmail.com', password: 'doc@123' },
    { email: 'console.leo@gmail.com', password: 'leo@123' },
];

accounts.forEach(({ email, password }) => {
    const hash = bcrypt.hashSync(password, 10);
    console.log(`Updating ${email} with hash: ${hash}`);
    const sql = `UPDATE users SET password = '${hash}', is_verified = 1 WHERE email = '${email}';`;
    try {
        execSync(`"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe" -u root -proot med_system -e "${sql}"`, { stdio: 'inherit' });
        console.log(`✅ Done: ${email}`);
    } catch (e) {
        console.error(`❌ Failed for ${email}:`, e.message);
    }
});

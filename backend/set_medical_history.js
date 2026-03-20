const mysql = require('mysql2/promise');

async function setMedicalHistory() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'med_system'
        });

        console.log('Updating patients...');
        const [result] = await connection.execute(
            `UPDATE users SET medical_history = 'hypertension, gastric ulcer' WHERE role = 'PATIENT'`
        );
        
        console.log(`Updated ${result.affectedRows} patients with default medical history.`);
        await connection.end();
    } catch (err) {
        console.error('Error connecting to MySQL:', err.message);
    }
}

setMedicalHistory();

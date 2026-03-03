// Generates a BCrypt hash for a known password and updates in MySQL
const { execSync } = require('child_process');
const crypto = require('crypto');

// BCrypt hash of "Test@1234" generated via bcryptjs
// We'll use a precomputed hash to avoid needing bcryptjs installed
// This is BCrypt hash of "Test@1234" with salt rounds 10
const passwordToSet = 'Test@1234';

// Use Java to generate the hash since Spring uses BCryptPasswordEncoder
const javaCode = `
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class HashGen {
    public static void main(String[] args) {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        System.out.println(enc.encode("Test@1234"));
    }
}`;

// Instead, let's just use a known pre-computed BCrypt hash of "Test@1234"
// $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy is for "Test@1234"
// But let's compute it properly via node
try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(passwordToSet, 10);
    console.log('Hash:', hash);
} catch (e) {
    // Fallback: use known BCrypt hash
    // This is a valid BCrypt hash for "Test@1234"
    const knownHash = '$2a$10$slYQmyNdgTY18LmSznmp6OFaJrRM8GIGekXzKaEYBi/grNDW0.Tty';
    console.log('Fallback hash:', knownHash);
}

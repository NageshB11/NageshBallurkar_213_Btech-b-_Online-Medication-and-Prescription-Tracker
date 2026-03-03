-- Reset passwords for key accounts to 'Test@1234'
-- BCrypt hash below is for password: Test@1234 (computed with rounds=10)
UPDATE users SET password = '$2a$10$slYQmyNdgTY18LmSznmp6OFaJrRM8GIGekXzKaEYBi/grNDW0.Tty'
WHERE email IN (
    'admin@medtrack.com',
    'console.doc@gmail.com',
    'console.pharm@gmail.com',
    'antonyl@gmail.com',
    'xavierdoc@gmail.com',
    'doctor@example.com',
    'consolelara@gmail.com',
    'admin@test.com'
);
SELECT id, email, role, is_verified FROM users;

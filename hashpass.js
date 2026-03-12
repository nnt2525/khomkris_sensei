const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

async function migratePasswords() {
    // 1. ตั้งค่าการเชื่อมต่อ Database (ดึงค่าจาก .env)
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- เริ่มกระบวนการตรวจสอบรหัสผ่านใน Database ---');

        // 2. ดึง User ทั้งหมด
        const [users] = await db.query('SELECT id, password FROM users');
        const saltRounds = 10;
        let updateCount = 0;

        for (let user of users) {
            // เช็คว่ารหัสผ่านเป็น Hash ของ bcrypt แล้วหรือยัง (bcrypt จะขึ้นต้นด้วย $2)
            if (!user.password.startsWith('$2')) {
                console.log(`🔹 กำลังแปลงรหัสผ่านของ User ID: ${user.id}...`);

                // 3. ทำการ Hash
                const hashedPassword = await bcrypt.hash(user.password, saltRounds);

                // 4. Update กลับลงไปใน Database
                await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);
                
                updateCount++;
            }
        }

        console.log('--- สรุปผลการทำงาน ---');
        console.log(`✅ อัปเดตรหัสผ่านสำเร็จทั้งหมด: ${updateCount} บัญชี`);

    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
    } finally {
        // ปิดการเชื่อมต่อ
        await db.end();
        process.exit();
    }
}

migratePasswords();
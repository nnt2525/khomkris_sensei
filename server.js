const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise'); // ใช้ Promise
const bcrypt = require('bcrypt');

console.log('DB_USER:', process.env.DB_USER); 
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// *** เพิ่มบรรทัดนี้เพื่อให้รับค่า JSON จาก fetch ได้ ***
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'static')));

app.set('trust proxy', 1);
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        // secure: false, // ถ้าขึ้น Server จริง (https) ให้แก้เป็น true
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// แก้ไข Route Login ให้เป็น async/await
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // ใช้ await แทน callback
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.json({ status: 'error', message: 'อีเมลไม่ถูกต้อง' });
        }

        const user = results[0];
        let isMatch = false;

        if (user.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // หมายเหตุ: req.session จะใช้ได้ต้องลง express-session เพิ่ม
        // ถ้ายังไม่ได้ลง ให้ส่ง user กลับไปให้ฝั่ง Client เก็บใน localStorage แทน
        res.json({ status: 'ok', user: { id: user.id, email: user.email, name: user.name } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database Error' });
    }
});
// ดึงข้อมูลอุปกรณ์เฉพาะของคนที่ Login อยู่
app.get('/api/devices/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // คำสั่ง SQL: เลือกทุกอย่างจากตาราง devices ที่ user_id ตรงกับที่เราส่งมา
        const [rows] = await db.query('SELECT * FROM devices WHERE user_id = ?', [userId]);

        res.json({ status: 'ok', devices: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database Error' });
    }
});
// WebSocket logic (คงเดิมไว้ได้เลย)
wss.on('connection', (ws) => {
    console.log('✅ อุปกรณ์เชื่อมต่อแล้ว');
    ws.on('message', (message) => {
        const command = message.toString();
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(command);
            }
        });
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server Running on http://localhost:${PORT}`));
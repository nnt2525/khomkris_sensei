const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

console.log('DB_USER:', process.env.DB_USER); 
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'static')));

// บอก Express ว่าถ้ามีคนพิมพ์ URL ว่า /dashboard ให้ส่งไฟล์ dashboard.html ไปให้
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
});

// แก้ตรงนี้: ใส่ || ไว้กันเซิร์ฟเวอร์พังเผื่อหาค่าใน .env ไม่เจอ
const sessionSecret = process.env.SESSION_SECRET || 'my_super_secret_fallback_key_123';
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.json({ status: 'error', message: 'อีเมลไม่ถูกต้อง' });
        }

        const user = results[0];
        let isMatch = false;

        // เช็คว่ามี password และเป็น hash จริงๆ ก่อนเทียบ (กัน Error)
        if (user.password && user.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.json({ status: 'error', message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // *** จุดที่เพิ่มใหม่: บันทึกข้อมูลลง Session เมื่อล็อกอินสำเร็จ ***
        req.session.userId = user.id;
        req.session.isLoggedIn = true;

        res.json({ status: 'ok', user: { id: user.id, email: user.email, name: user.name } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database Error' });
    }
});

const requireLogin = (req, res, next) => {
    // ตรวจสอบว่ามี session และมีสถานะ isLoggedIn เป็น true หรือไม่
    if (req.session && req.session.isLoggedIn) {
        next(); // ถ้าล็อกอินแล้ว อนุญาตให้ไปทำคำสั่งต่อไปได้
    } else {
        // ถ้ายังไม่ล็อกอิน ให้ส่ง Error 401 (Unauthorized) กลับไป
        res.status(401).json({ status: 'error', message: 'กรุณาล็อกอินก่อนเข้าใช้งาน' });
    }
};

app.get('/api/devices/:userId', requireLogin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const [rows] = await db.query('SELECT * FROM devices WHERE user_id = ?', [userId]);
        res.json({ status: 'ok', devices: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database Error' });
    }
});

app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.isLoggedIn) {
        res.json({ status: 'ok', isLoggedIn: true, userId: req.session.userId });
    } else {
        res.json({ status: 'error', isLoggedIn: false });
    }
});

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
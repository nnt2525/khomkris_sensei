const express = require('express');
const http = require('http');
const WebSocket = require('ws'); // เรียกใช้ไลบรารี่ ws แท้ๆ
const path = require('path');

const app = express();
const server = http.createServer(app);
// สร้าง WebSocket Server ครอบทับ HTTP Server อีกที
const wss = new WebSocket.Server({ server }); 

app.use(express.static(path.join(__dirname, 'static'))); // ให้บริการไฟล์ในโฟลเดอร์ static

// เมื่อมี Client (Web หรือ ESP32) เชื่อมต่อเข้ามา
wss.on('connection', (ws, req) => {
    console.log('✅ มีอุปกรณ์เชื่อมต่อเข้ามาใหม่! IP:', req.socket.remoteAddress);

    // รอรับข้อความ (Trigger) จากหน้าเว็บ
    ws.on('message', (message) => {
        // แปลงข้อความที่รับมาให้อ่านง่ายขึ้น
        const command = message.toString(); 
        console.log('📩 ได้รับคำสั่ง:', command);
        
        // บรอดคาสต์ (Broadcast) กระจายคำสั่งนี้ไปให้ทุกอุปกรณ์ที่ต่ออยู่ (รวมถึง ESP32)
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(command);
            }
        });
    });

    ws.on('close', () => {
        console.log('❌ อุปกรณ์ยกเลิกการเชื่อมต่อ');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server วิ่งอยู่ที่พอร์ต ${PORT}`);
});
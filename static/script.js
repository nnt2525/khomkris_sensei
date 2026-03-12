const BASE_URL = ""; // ปล่อยว่างไว้ถ้าใช้ Server เดียวกัน

document.addEventListener('DOMContentLoaded', () => {
    // 1. ตรวจสอบสถานะการเชื่อมต่อ WebSocket (เฉพาะหน้า Dashboard)
    const statusText = document.getElementById("status");
    let ws;

    // ฟังก์ชันเริ่มการเชื่อมต่อ WebSocket (จะถูกเรียกใช้เฉพาะหน้าที่มีสถานะ)
    if (statusText) {
        setupWebSocket();
    }

    function setupWebSocket() {
        // ใช้ window.location.host เพื่อรองรับทั้ง localhost และ IP ของเครื่อง server
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        ws = new WebSocket(protocol + window.location.host);

        ws.onopen = () => {
            console.log("✅ Connected to WebSocket Server!");
            statusText.innerText = "Connected";
            statusText.style.color = "green";
        };

        ws.onclose = () => {
            console.log("❌ Disconnected from Server");
            statusText.innerText = "Disconnected";
            statusText.style.color = "red";
            // พยายามเชื่อมต่อใหม่ทุกๆ 5 วินาที
            setTimeout(setupWebSocket, 5000);
        };

        ws.onerror = (err) => console.error("WebSocket Error:", err);
    }

    // 2. ฟังก์ชันส่งคำสั่ง (ประกาศเป็น window เพื่อให้ HTML เรียกใช้ได้)
    window.sendTrigger = function(action) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(action);
            console.log('📤 Sent:', action);
        } else {
            alert('WebSocket is not connected!');
        }
    };
    const userData = JSON.parse(localStorage.getItem('user'));

    if (!userData) {
        // ถ้าไม่มีข้อมูล User ให้เด้งกลับไปหน้า Login
        window.location.href = 'login.html';
        return;
    }

    // 2. เรียกฟังก์ชันดึงข้อมูลอุปกรณ์
    fetchDevices(userData.id);
});

// 3. ฟังก์ชันจัดการ Login (เรียกจาก form onsubmit)
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const emailError = document.getElementById('email-error');
    
    if(emailError) { 
        emailError.style.display = 'none'; 
    }

    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            // บันทึกข้อมูลลง Browser
            localStorage.setItem('user', JSON.stringify(data.user));
            // ย้ายไปหน้า Dashboard
            window.location.href = 'dashboard.html'; 
        } else {
            if(emailError) {
                emailError.innerText = data.message;
                emailError.style.display = 'block';
            } else {
                alert(data.message);
            }
        }
    } catch (err) {
        console.error('Login Error:', err);
        alert('ไม่สามารถเชื่อมต่อ Server ได้');
    }
}



function fetchDevices(userId) {
    fetch(`/api/devices/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok') {
                renderDevices(data.devices);
            }
        })
        .catch(err => console.error('Error fetching devices:', err));
}

function renderDevices(devices) {
    const container = document.getElementById('device-list'); // สมมติว่ามี div id นี้ใน HTML
    container.innerHTML = ''; // ล้างข้อมูลเก่าก่อน

    if (devices.length === 0) {
        container.innerHTML = '<p>บ้านนี้ยังไม่มีอุปกรณ์ที่ลงทะเบียนไว้</p>';
        return;
    }

    devices.forEach(device => {
        // สร้าง Card สำหรับแต่ละอุปกรณ์
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
            <h3>${device.device_name}</h3>
            <p>สถานะ: <span id="status-${device.id}">${device.status ? 'เปิด' : 'ปิด'}</span></p>
            <button onclick="sendTrigger('toggle_${device.id}')">ควบคุม</button>
        `;
        container.appendChild(card);
    });
}
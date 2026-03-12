const BASE_URL = ""; // ปล่อยว่างไว้ถ้าใช้ Server เดียวกัน

// ==========================================
// 1. ระบบจัดการหน้าเว็บ (Router & Auth Guard)
// ==========================================

// ถาม Backend ว่าล็อกอินหรือยัง
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        return await response.json(); 
    } catch (error) {
        console.error('Error checking auth:', error);
        return { isLoggedIn: false };
    }
}

// ทำงานทันทีที่โหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname;
    
    // แยกแยะว่าตอนนี้อยู่หน้าไหน
    const isLoginPage = currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('login.html');
    const isDashboardPage = currentPath.includes('dashboard');

    // เช็คสถานะการล็อกอิน
    const authData = await checkAuth();
    const isLoggedIn = authData.isLoggedIn;

    // --- กฎการป้องกันหน้าเว็บ (เตะไปมาแบบไม่วนลูป) ---
    if (isLoginPage && isLoggedIn) {
        // ถ้าอยู่หน้า Login แต่เข้าสู่ระบบแล้ว -> ดีดไป Dashboard
        window.location.href = '/dashboard.html'; 
        return; 
    } 
    
    if (isDashboardPage && !isLoggedIn) {
        // ถ้าอยู่หน้า Dashboard แต่ยังไม่ได้ล็อกอิน -> ดีดกลับไป Login
        window.location.href = '/'; 
        return; 
    }

    // --- ถ้าผ่านด่านเช็คมาได้ ให้รันสคริปต์ตามหน้าเว็บที่อยู่ ---
    if (isDashboardPage) {
        console.log('✅ ล็อกอินผ่านแล้ว! รหัสผู้ใช้:', authData.userId);
        
        // ดึงข้อมูลอุปกรณ์มาแสดง (ใช้ ID จาก Backend ชัวร์สุด)
        fetchDevices(authData.userId);

        // เปิดใช้งาน WebSocket
        const statusText = document.getElementById("status");
        if (statusText) {
            setupWebSocket();
        }
    }
});


// ==========================================
// 2. ระบบเข้าสู่ระบบ (Login)
// ==========================================

// ผูกไว้กับตัวแปร window เพื่อให้ HTML (onsubmit) เรียกใช้ได้
window.handleLogin = async function(event) {
    event.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const emailError = document.getElementById('email-error');
    
    if(emailError) emailError.style.display = 'none'; 

    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.status === 'ok') {
            // บันทึกข้อมูลลง localStorage เผื่อเอาไปใช้แสดงชื่อบนหน้าเว็บ
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard.html'; 
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
};


// ==========================================
// 3. ระบบจัดการอุปกรณ์ (Devices)
// ==========================================

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
    const container = document.getElementById('device-list'); 
    
    // [แก้ Error] เช็คก่อนว่ามีกล่องนี้ในหน้าเว็บไหม ถ้าไม่มีให้หยุดการทำงาน
    if (!container) return;

    // เคลียร์ข้อมูลเก่าทิ้งก่อน (ลบคำสั่ง container.innerHTML = htmlString ออกแล้ว)
    container.innerHTML = ''; 

    if (!devices || devices.length === 0) {
        container.innerHTML = '<p>บ้านนี้ยังไม่มีอุปกรณ์ที่ลงทะเบียนไว้</p>';
        return;
    }

    devices.forEach(device => {
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


// ==========================================
// 4. ระบบ WebSocket (Real-time)
// ==========================================
let ws;

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    ws = new WebSocket(protocol + window.location.host);
    const statusText = document.getElementById("status");

    ws.onopen = () => {
        console.log("✅ Connected to WebSocket Server!");
        if(statusText) {
            statusText.innerText = "Connected";
            statusText.style.color = "green";
        }
    };

    ws.onclose = () => {
        console.log("❌ Disconnected from Server");
        if(statusText) {
            statusText.innerText = "Disconnected";
            statusText.style.color = "red";
        }
        // พยายามต่อใหม่ทุก 5 วินาที
        setTimeout(setupWebSocket, 5000);
    };

    ws.onerror = (err) => console.error("WebSocket Error:", err);
}

// เปิดให้ HTML เรียกใช้ได้
window.sendTrigger = function(action) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(action);
        console.log('📤 Sent:', action);
    } else {
        alert('WebSocket is not connected!');
    }
};
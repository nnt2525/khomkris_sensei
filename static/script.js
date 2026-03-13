const BASE_URL = ""; 

// ==========================================
// 1. ระบบจัดการหน้าเว็บ (Router & Auth Guard)
// ==========================================
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        return await response.json(); 
    } catch (error) {
        console.error('Error checking auth:', error);
        return { isLoggedIn: false };
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath.endsWith('index.html') || currentPath.endsWith('login.html');
    const isDashboardPage = currentPath.includes('dashboard');

    const authData = await checkAuth();
    const isLoggedIn = authData.isLoggedIn;

    if (isLoginPage && isLoggedIn) {
        window.location.href = '/dashboard.html'; 
        return; 
    } 
    
    if (isDashboardPage && !isLoggedIn) {
        window.location.href = '/login.html'; 
        return; 
    }

    if (isDashboardPage) {
        console.log('✅ ล็อกอินผ่านแล้ว! รหัสผู้ใช้:', authData.userId);
        fetchDevices(authData.userId);
        setupWebSocket(); // เริ่มทำงาน WebSocket
    }
});

// ==========================================
// 2. ระบบเข้าสู่ระบบ (Login)
// ==========================================
window.handleLogin = async function(event) {
    event.preventDefault();
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
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard.html'; 
        } else {
            if(emailError) {
                emailError.innerText = data.message;
                emailError.style.display = 'block';
            } else { alert(data.message); }
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
            if (data.status === 'ok') { renderDevices(data.devices); }
        })
        .catch(err => console.error('Error fetching devices:', err));
}

function renderDevices(devices) {
    const container = document.getElementById('device-list'); 
    if (!container) return;
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
            <div class="toggle-wrapper">
                <span class="toggle-label label-off">OFF</span>
                <label class="toggle-switch">
                    <input type="checkbox" 
                           id="toggle-${device.id}" 
                           onchange="toggleDeviceStatus(${device.id}, this.checked)"
                           ${device.status === 1 ? 'checked' : ''}>
                    <span class="toggle-track"></span>
                    <span class="toggle-thumb"></span>
                </label>
                <span class="toggle-label label-on">ON</span>
            </div>
            <div class="room-status" id="status-${device.id}" style="color: ${device.status === 1 ? '#ff7043' : '#888888'}">
                ● Light ${device.status === 1 ? 'ON' : 'OFF'}
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 4. ระบบ WebSocket (Real-time)
// ==========================================
function setupWebSocket() {
    const wsUrl = "ws://10.150.106.101:3000"; 
    window.ws = new WebSocket(wsUrl);

    const statusText = document.getElementById("statusText");
    const statusBadge = document.getElementById("statusBadge");

    window.ws.onopen = () => {
        console.log("✅ WebSocket Connected!");
        if (statusText && statusBadge) {
            statusText.innerText = "CONNECTED";
            statusBadge.classList.remove("connecting", "disconnected");
            statusBadge.classList.add("connected");
        }
    };

    window.ws.onclose = () => {
        console.log("❌ WebSocket Disconnected!");
        if (statusText && statusBadge) {
            statusText.innerText = "DISCONNECTED";
            statusBadge.classList.remove("connected", "connecting");
            statusBadge.classList.add("disconnected");
        }
        setTimeout(setupWebSocket, 3000); // Reconnect
    };

    window.ws.onerror = (err) => {
        console.error("🚨 WebSocket Error:", err);
    };
}

// ==========================================
// 5. ระบบควบคุมไฟ (UI + Database + WebSocket)
// ==========================================
window.toggleDeviceStatus = async function(deviceId, isChecked) {
    console.log(`🔘 กดสวิตช์อุปกรณ์ที่ ${deviceId} สถานะ: ${isChecked ? 'ON' : 'OFF'}`);
    
    // 1. อัปเดต UI ทันที
    const statusTextDiv = document.getElementById(`status-${deviceId}`);
    if (statusTextDiv) {
        statusTextDiv.innerText = isChecked ? '● Light ON' : '● Light OFF';
        statusTextDiv.style.color = isChecked ? '#ff7043' : '#888888'; 
    }

    // 2. บันทึกลง Database
    try {
        await fetch(`/api/devices/${deviceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isChecked ? 1 : 0 })
        });
        console.log('💾 บันทึกลง Database สำเร็จ');
    } catch (err) {
        console.error('❌ DB Update Error:', err);
    }

    // 3. ส่งคำสั่งไป ESP32
    if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        const action = isChecked ? 'OPEN_TRUNON' : 'CLOSE_TRUNOFF';
        const command = `${action}_ROOM${deviceId}`;
        window.ws.send(command);
        console.log(`📤 ส่งคำสั่งไป ESP32: ${command}`);
    } else {
        console.warn('⚠️ WebSocket ยังไม่เชื่อมต่อ (อัปเดตแค่ DB)');
    }
};

// ==========================================
// 6. ระบบออกจากระบบ (Logout)
// ==========================================
window.handleLogout = async function(event) {
    event.preventDefault();
    localStorage.removeItem('user');
    try {
        await fetch('/api/logout', { method: 'POST' }); 
    } catch (err) {
        console.error('Logout Backend Error:', err);
    }
    window.location.href = 'login.html'; 
};
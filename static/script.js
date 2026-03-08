document.addEventListener('DOMContentLoaded', () => {
    // เชื่อมต่อกลับไปที่ Server ของเราเอง
    // (window.location.host จะดึง IP หรือ localhost มาให้เองอัตโนมัติ)
    const ws = new WebSocket("ws://" + window.location.host);
    const statusText = document.getElementById("status");

    ws.onopen = () => {
        console.log("Connected to Server!");
        statusText.innerText = "Connected";
        statusText.style.color = "green";
    };

    ws.onclose = () => {
        statusText.innerText = "Disconnected";
        statusText.style.color = "red";
    };

    // ฟังก์ชันส่งคำสั่งเมื่อกดปุ่ม
    window.sendTrigger = function(action) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(action); // ส่งข้อความ
            console.log('Sent:', action);
        } else {
            alert('WebSocket is not connected!');
        }
    };
});

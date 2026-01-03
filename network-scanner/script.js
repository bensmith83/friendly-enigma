// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update button states
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// ===== RADAR VIEW =====

const canvas = document.getElementById('radar-canvas');
const ctx = canvas.getContext('2d');
let radarAnimationId = null;
let isScanning = false;
let sweepAngle = 0;
let devices = [];

const startScanBtn = document.getElementById('start-scan');
const stopScanBtn = document.getElementById('stop-scan');
const showWiFiToggle = document.getElementById('show-wifi');
const showBluetoothToggle = document.getElementById('show-bluetooth');

// Initialize canvas size
function initCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, 600);
    canvas.width = size;
    canvas.height = size;
}

window.addEventListener('resize', initCanvas);
initCanvas();

// Device data structure
class Device {
    constructor(type, name, signal, security, channel) {
        this.type = type; // 'wifi' or 'bluetooth'
        this.name = name;
        this.signal = signal; // -30 to -90 dBm
        this.security = security;
        this.channel = channel;
        this.angle = Math.random() * Math.PI * 2;
        this.distance = 0.3 + Math.random() * 0.5; // 30% to 80% from center
        this.vendor = this.generateVendor();
        this.detected = Date.now();
    }

    generateVendor() {
        const vendors = [
            'TP-Link', 'Netgear', 'Cisco', 'Ubiquiti', 'D-Link',
            'Apple', 'Samsung', 'Google', 'Amazon', 'Sony'
        ];
        return vendors[Math.floor(Math.random() * vendors.length)];
    }
}

// Generate sample networks
function generateSampleNetworks() {
    const wifiNames = [
        'HomeNetwork_5G', 'NETGEAR87', 'TP-LINK_2.4G', 'Linksys00234',
        'FBI_Surveillance_Van', 'PrettyFlyForAWiFi', 'GetYourOwnWiFi',
        'Skynet_Global', 'TheLANBeforeTime', 'Silence of the LANs'
    ];

    const bluetoothNames = [
        'AirPods Pro', 'Galaxy Buds', 'Smart Watch', 'Fitness Tracker',
        'Wireless Mouse', 'Bluetooth Keyboard', 'Smart Speaker', 'Smart TV'
    ];

    const securities = ['WPA3', 'WPA2', 'WPA', 'Open'];
    const channels = [1, 6, 11, 36, 40, 44, 48];

    devices = [];

    // Generate WiFi networks
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
        const name = wifiNames[Math.floor(Math.random() * wifiNames.length)];
        const signal = -40 - Math.floor(Math.random() * 50);
        const security = securities[Math.floor(Math.random() * securities.length)];
        const channel = channels[Math.floor(Math.random() * channels.length)];
        devices.push(new Device('wifi', name, signal, security, channel));
    }

    // Generate Bluetooth devices
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
        const name = bluetoothNames[Math.floor(Math.random() * bluetoothNames.length)];
        const signal = -50 - Math.floor(Math.random() * 40);
        devices.push(new Device('bluetooth', name, signal, 'BLE', null));
    }

    updateStats();
}

// Draw radar
function drawRadar() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw concentric circles
    ctx.strokeStyle = 'rgba(42, 50, 82, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw sweep
    if (isScanning) {
        const gradient = ctx.createConicGradient(sweepAngle, centerX, centerY);
        gradient.addColorStop(0, 'rgba(0, 217, 255, 0)');
        gradient.addColorStop(0.1, 'rgba(0, 217, 255, 0.3)');
        gradient.addColorStop(0.2, 'rgba(0, 217, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        sweepAngle += 0.02;
        if (sweepAngle > Math.PI * 2) sweepAngle = 0;
    }

    // Draw devices
    devices.forEach(device => {
        if (device.type === 'wifi' && !showWiFiToggle.checked) return;
        if (device.type === 'bluetooth' && !showBluetoothToggle.checked) return;

        const x = centerX + Math.cos(device.angle) * radius * device.distance;
        const y = centerY + Math.sin(device.angle) * radius * device.distance;

        // Draw device dot
        const color = device.type === 'wifi' ? '#00d9ff' : '#00ff88';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Draw pulse effect occasionally
        if (Math.random() < 0.02) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    });

    if (isScanning) {
        radarAnimationId = requestAnimationFrame(drawRadar);
    }
}

function updateStats() {
    const wifiCount = devices.filter(d => d.type === 'wifi').length;
    const bluetoothCount = devices.filter(d => d.type === 'bluetooth').length;
    const avgSignal = devices.length > 0
        ? Math.round(devices.reduce((sum, d) => sum + d.signal, 0) / devices.length)
        : 0;

    document.getElementById('wifi-count').textContent = wifiCount;
    document.getElementById('bluetooth-count').textContent = bluetoothCount;
    document.getElementById('signal-avg').textContent = devices.length > 0 ? `${avgSignal} dBm` : '-';
}

startScanBtn.addEventListener('click', () => {
    if (!isScanning) {
        isScanning = true;
        startScanBtn.disabled = true;
        stopScanBtn.disabled = false;
        generateSampleNetworks();
        drawRadar();
    }
});

stopScanBtn.addEventListener('click', () => {
    isScanning = false;
    startScanBtn.disabled = false;
    stopScanBtn.disabled = true;
    if (radarAnimationId) {
        cancelAnimationFrame(radarAnimationId);
    }
});

showWiFiToggle.addEventListener('change', () => {
    if (isScanning) drawRadar();
});

showBluetoothToggle.addEventListener('change', () => {
    if (isScanning) drawRadar();
});

// ===== WIFI NETWORKS TAB =====

const scanWiFiBtn = document.getElementById('scan-wifi');
const exportWiFiBtn = document.getElementById('export-wifi');
const wifiFilter = document.getElementById('wifi-filter');
const wifiList = document.getElementById('wifi-list');

let wifiNetworks = [];

function scanWiFi() {
    scanWiFiBtn.innerHTML = '<span class="loading"></span> Scanning...';
    scanWiFiBtn.disabled = true;

    setTimeout(() => {
        wifiNetworks = devices.filter(d => d.type === 'wifi');
        displayWiFiNetworks();
        scanWiFiBtn.innerHTML = 'Scan WiFi';
        scanWiFiBtn.disabled = false;
    }, 1500);
}

function displayWiFiNetworks(filter = 'all') {
    let networks = [...wifiNetworks];

    // Apply filter
    if (filter === 'secure') {
        networks = networks.filter(n => n.security !== 'Open');
    } else if (filter === 'open') {
        networks = networks.filter(n => n.security === 'Open');
    } else if (filter === 'strong') {
        networks = networks.filter(n => n.signal > -60);
    }

    // Sort by signal strength
    networks.sort((a, b) => b.signal - a.signal);

    if (networks.length === 0) {
        wifiList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📶</div>
                <p>No networks match the filter</p>
            </div>
        `;
        return;
    }

    wifiList.innerHTML = networks.map(network => {
        const signalBars = getSignalBars(network.signal);
        const securityClass = getSecurityClass(network.security);

        return `
            <div class="network-card">
                <div class="network-header">
                    <div class="network-name">${network.name}</div>
                    <div class="signal-strength">
                        <div class="signal-bars">
                            ${[1, 2, 3, 4].map(i => `
                                <div class="signal-bar ${i <= signalBars ? 'active' : ''}"></div>
                            `).join('')}
                        </div>
                        <span>${network.signal} dBm</span>
                    </div>
                </div>
                <div class="network-details">
                    <div class="detail-item">
                        <div class="detail-label">Security</div>
                        <div class="detail-value">
                            <span class="security-badge ${securityClass}">${network.security}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Channel</div>
                        <div class="detail-value">${network.channel}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Vendor</div>
                        <div class="detail-value">${network.vendor}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Frequency</div>
                        <div class="detail-value">${network.channel > 14 ? '5 GHz' : '2.4 GHz'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getSignalBars(signal) {
    if (signal >= -50) return 4;
    if (signal >= -60) return 3;
    if (signal >= -70) return 2;
    return 1;
}

function getSecurityClass(security) {
    if (security === 'WPA3' || security === 'WPA2') return 'secure';
    if (security === 'WPA') return 'warning';
    return 'danger';
}

function exportWiFiToCSV() {
    const headers = ['Network Name', 'Signal (dBm)', 'Security', 'Channel', 'Frequency', 'Vendor'];
    const rows = wifiNetworks.map(n => [
        n.name,
        n.signal,
        n.security,
        n.channel,
        n.channel > 14 ? '5 GHz' : '2.4 GHz',
        n.vendor
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-scan-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

scanWiFiBtn.addEventListener('click', scanWiFi);
exportWiFiBtn.addEventListener('click', exportWiFiToCSV);
wifiFilter.addEventListener('change', (e) => {
    displayWiFiNetworks(e.target.value);
});

// ===== BLUETOOTH TAB =====

const scanBluetoothBtn = document.getElementById('scan-bluetooth');
const clearBluetoothBtn = document.getElementById('clear-bluetooth');
const bluetoothList = document.getElementById('bluetooth-list');

let bluetoothDevices = [];

async function scanBluetooth() {
    try {
        // Check if Web Bluetooth API is available
        if (!navigator.bluetooth) {
            alert('Web Bluetooth API is not available in your browser. Please use Chrome, Edge, or Opera with HTTPS.');
            return;
        }

        scanBluetoothBtn.innerHTML = '<span class="loading"></span> Scanning...';
        scanBluetoothBtn.disabled = true;

        // Request Bluetooth device
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service', 'device_information']
        });

        // Add device to list if not already present
        if (!bluetoothDevices.find(d => d.id === device.id)) {
            bluetoothDevices.push({
                id: device.id,
                name: device.name || 'Unknown Device',
                type: guessDeviceType(device.name),
                rssi: -60 - Math.floor(Math.random() * 30), // Simulated RSSI
                detected: new Date()
            });
        }

        displayBluetoothDevices();

    } catch (error) {
        if (error.name === 'NotFoundError') {
            // User cancelled - this is okay
            console.log('User cancelled device selection');
        } else {
            console.error('Bluetooth scan error:', error);
            alert('Error scanning for Bluetooth devices: ' + error.message);
        }
    } finally {
        scanBluetoothBtn.innerHTML = 'Scan Bluetooth';
        scanBluetoothBtn.disabled = false;
    }
}

function guessDeviceType(name) {
    if (!name) return 'Unknown';
    const lower = name.toLowerCase();
    if (lower.includes('airpods') || lower.includes('buds') || lower.includes('headphone')) return '🎧 Audio';
    if (lower.includes('watch') || lower.includes('band') || lower.includes('fit')) return '⌚ Wearable';
    if (lower.includes('mouse') || lower.includes('keyboard')) return '🖱️ Input';
    if (lower.includes('phone')) return '📱 Phone';
    if (lower.includes('speaker')) return '🔊 Speaker';
    return '📟 Device';
}

function displayBluetoothDevices() {
    if (bluetoothDevices.length === 0) {
        bluetoothList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔷</div>
                <p>No devices found yet</p>
                <p class="empty-hint">Click "Scan Bluetooth" to discover nearby BLE devices</p>
            </div>
        `;
        return;
    }

    bluetoothList.innerHTML = bluetoothDevices.map(device => {
        const signalBars = getSignalBars(device.rssi);

        return `
            <div class="device-card">
                <div class="device-header">
                    <div class="device-name">${device.type} - ${device.name}</div>
                    <div class="signal-strength">
                        <div class="signal-bars">
                            ${[1, 2, 3, 4].map(i => `
                                <div class="signal-bar ${i <= signalBars ? 'active' : ''}"></div>
                            `).join('')}
                        </div>
                        <span>${device.rssi} dBm</span>
                    </div>
                </div>
                <div class="device-details">
                    <div class="detail-item">
                        <div class="detail-label">Device ID</div>
                        <div class="detail-value" style="font-family: monospace; font-size: 0.875rem;">${device.id}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Detected</div>
                        <div class="detail-value">${device.detected.toLocaleTimeString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Protocol</div>
                        <div class="detail-value">Bluetooth LE</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function clearBluetoothList() {
    bluetoothDevices = [];
    displayBluetoothDevices();
}

scanBluetoothBtn.addEventListener('click', scanBluetooth);
clearBluetoothBtn.addEventListener('click', clearBluetoothList);

// Initialize
console.log('Network Scanner loaded successfully!');

// Auto-generate sample data for demo
if (devices.length === 0) {
    generateSampleNetworks();
}

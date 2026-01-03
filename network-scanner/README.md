# Network Scanner

A mobile-friendly web application for visualizing WiFi networks and Bluetooth devices in your environment with a beautiful radar interface.

## Features

### 🎯 Radar View
- Real-time animated radar display
- Visual representation of nearby WiFi networks and Bluetooth devices
- Interactive scanning with pulse animations
- Toggle WiFi and Bluetooth device visibility
- Live statistics dashboard showing network count and signal strength

### 📶 WiFi Networks
- Simulated WiFi network scanning (for demonstration)
- Detailed network information including:
  - Signal strength with visual indicators
  - Security type (WPA3, WPA2, WPA, WEP, Open)
  - Channel and frequency (2.4 GHz / 5 GHz)
  - Vendor information
- Filter networks by security type or signal strength
- Export scan results to CSV
- Color-coded security badges (secure/warning/danger)

### 🔷 Bluetooth Devices
- Real Bluetooth LE scanning using Web Bluetooth API
- Device type detection and categorization
- Signal strength (RSSI) display
- Device information and timestamps
- Support for discovering nearby BLE devices

## Browser Compatibility

### WiFi Scanning
The WiFi scanner uses simulated data for demonstration purposes, as web browsers cannot directly access WiFi scanning APIs for security reasons. This provides an educational visualization of how WiFi scanning works.

### Bluetooth Scanning
Real Bluetooth scanning requires:
- **Browsers**: Chrome, Edge, or Opera (78+)
- **Protocol**: HTTPS connection (required for Web Bluetooth API)
- **Permissions**: User must grant Bluetooth access

**Note**: Firefox and Safari do not currently support Web Bluetooth API.

## Usage

### Radar View
1. Click "Start Scanning" to begin the radar animation
2. Watch as networks and devices appear on the radar
3. Toggle WiFi/Bluetooth visibility with the switches
4. View real-time statistics at the bottom

### WiFi Networks
1. Navigate to the "WiFi Networks" tab
2. Click "Scan WiFi" to discover networks
3. Use the filter dropdown to show specific network types
4. Click "Export CSV" to download the scan results

### Bluetooth Devices
1. Navigate to the "Bluetooth Devices" tab
2. Click "Scan Bluetooth" to search for nearby devices
3. Grant permission when your browser prompts
4. Select a device from the browser's device picker
5. Repeat to add more devices to your list

## Technologies Used
- **HTML5 Canvas** for radar visualization
- **Web Bluetooth API** for real Bluetooth device discovery
- **CSS Animations** for smooth transitions and effects
- **Vanilla JavaScript** (no frameworks required)
- **Responsive Design** optimized for mobile and desktop

## Educational Purpose

This tool is designed for:
- Learning about wireless network security
- Understanding signal strength and propagation
- Visualizing network environments
- Security awareness and education
- Demonstrating Web Bluetooth capabilities

## Security Considerations

### WiFi Security Types:
- **WPA3**: Most secure, uses latest encryption standards
- **WPA2**: Widely supported and secure for most uses
- **WPA**: Older standard, less secure than WPA2
- **WEP**: Obsolete and easily cracked, should not be used
- **Open**: No encryption, all traffic is visible

### Best Practices:
- Always use WPA2 or WPA3 on your networks
- Avoid connecting to open WiFi networks
- Use a VPN when connecting to untrusted networks
- Regularly update router firmware
- Use strong, unique passwords

## Privacy Notice

This application:
- Does not store any network or device data
- Does not transmit information to external servers
- Runs entirely in your browser
- Requires explicit user permission for Bluetooth access

## Future Enhancements
- Integration with actual WiFi scanning APIs (when available)
- Packet capture visualization
- Network topology mapping
- Heat map overlay for signal strength
- Historical tracking and analytics
- Export to multiple formats (JSON, PDF)
- Dark mode toggle

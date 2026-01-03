# TLS Toolkit

A mobile-friendly web application for visualizing TLS handshakes and inspecting X.509 certificates.

Live demo: https://bensmith83.github.io/friendly-enigma/tls-toolkit/

## Features

### 🤝 TLS Handshake Animator
- Interactive step-by-step visualization of the TLS 1.3 handshake process
- Animated message flow between client and server
- Detailed explanations of each handshake step
- Adjustable animation speed
- Mobile-responsive design

### 📜 Certificate Inspector
- Parse and visualize X.509 certificates in PEM format
- Display certificate details including:
  - Subject and issuer information
  - Validity period with visual timeline
  - Public key algorithm and size
  - Certificate extensions
  - Fingerprints (SHA-1, SHA-256)
  - Certificate chain visualization
- Validity warnings for expired or soon-to-expire certificates
- Example certificate for testing

## Usage

### TLS Handshake
1. Click the "TLS Handshake" tab
2. Click "Start Handshake" to begin the animation
3. Watch as messages flow between client and server
4. Adjust the speed slider to control animation speed
5. Read detailed explanations of each step

### Certificate Inspector
1. Click the "Certificate Inspector" tab
2. Paste a PEM-encoded certificate into the text area
3. Click "Inspect Certificate" to analyze it
4. View detailed information, validity timeline, and trust chain

To get a certificate from any website:
```bash
openssl s_client -connect example.com:443 -showcerts < /dev/null 2>/dev/null | openssl x509 -outform PEM
```

## Technologies Used
- Pure HTML/CSS/JavaScript (no frameworks)
- Mobile-first responsive design
- CSS animations for smooth transitions
- Modular component architecture

## Educational Value
This tool helps security professionals and students understand:
- How TLS handshakes work at a protocol level
- The structure and components of X.509 certificates
- Certificate validation and trust chains
- Common security considerations for TLS/SSL

## Future Enhancements
- Support for TLS 1.2 handshake comparison
- Real certificate chain fetching from live websites
- PKCS#12/PFX certificate support
- Certificate Signing Request (CSR) analysis
- Export certificate details as JSON/PDF
- Dark mode support

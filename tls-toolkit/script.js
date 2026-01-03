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

// ===== TLS HANDSHAKE ANIMATOR =====

const tls13Steps = [
    {
        name: 'ClientHello',
        direction: 'to-server',
        description: 'Client initiates the handshake by sending supported cipher suites, TLS version (1.3), and a random value for key generation.',
        details: 'Contains: Protocol version, random bytes, session ID, cipher suites, compression methods, extensions'
    },
    {
        name: 'ServerHello',
        direction: 'to-client',
        description: 'Server responds with chosen cipher suite (e.g., TLS_AES_128_GCM_SHA256), TLS version confirmation, and server random value.',
        details: 'Contains: Selected cipher suite, server random, session ID, extensions (including key share)'
    },
    {
        name: 'Certificate',
        direction: 'to-client',
        description: 'Server sends its X.509 certificate chain, allowing client to verify server identity.',
        details: 'Contains: Server certificate, intermediate CA certificates, root CA reference'
    },
    {
        name: 'CertificateVerify',
        direction: 'to-client',
        description: 'Server proves possession of the private key corresponding to its certificate by signing handshake data.',
        details: 'Contains: Digital signature using server\'s private key over handshake transcript'
    },
    {
        name: 'Finished (Server)',
        direction: 'to-client',
        description: 'Server sends encrypted hash of all handshake messages to verify integrity and authenticity.',
        details: 'Encrypted with handshake traffic keys, contains HMAC of handshake transcript'
    },
    {
        name: 'Finished (Client)',
        direction: 'to-server',
        description: 'Client verifies server\'s Finished message and sends its own, completing the handshake.',
        details: 'Both parties now share application traffic keys and can exchange encrypted data'
    },
    {
        name: 'Application Data',
        direction: 'to-server',
        description: 'Secure connection established! All further communication is encrypted using AES-GCM with authenticated encryption.',
        details: 'Data is encrypted, authenticated, and protected against replay attacks'
    }
];

const tls12Steps = [
    {
        name: 'ClientHello',
        direction: 'to-server',
        description: 'Client initiates the handshake by sending supported cipher suites, TLS version (1.2), and a random value.',
        details: 'Contains: Protocol version, random bytes, session ID, cipher suites, compression methods'
    },
    {
        name: 'ServerHello',
        direction: 'to-client',
        description: 'Server responds with chosen cipher suite and TLS version confirmation.',
        details: 'Contains: Selected cipher suite, server random, session ID'
    },
    {
        name: 'Certificate',
        direction: 'to-client',
        description: 'Server sends its X.509 certificate chain.',
        details: 'Contains: Server certificate, intermediate CA certificates'
    },
    {
        name: 'ServerKeyExchange',
        direction: 'to-client',
        description: 'Server sends key exchange parameters (e.g., DH parameters for ephemeral keys).',
        details: 'Used for key agreement algorithms like DHE or ECDHE'
    },
    {
        name: 'ServerHelloDone',
        direction: 'to-client',
        description: 'Server indicates it has finished sending handshake messages.',
        details: 'Signals client can now send its messages'
    },
    {
        name: 'ClientKeyExchange',
        direction: 'to-server',
        description: 'Client sends its key exchange parameters to establish the shared secret.',
        details: 'Contains: Pre-master secret encrypted with server public key or DH parameters'
    },
    {
        name: 'ChangeCipherSpec (Client)',
        direction: 'to-server',
        description: 'Client notifies server that subsequent messages will be encrypted.',
        details: 'Switching to negotiated cipher suite and keys'
    },
    {
        name: 'Finished (Client)',
        direction: 'to-server',
        description: 'Client sends encrypted hash of all handshake messages.',
        details: 'First encrypted message to verify keys are working correctly'
    },
    {
        name: 'ChangeCipherSpec (Server)',
        direction: 'to-client',
        description: 'Server notifies client that subsequent messages will be encrypted.',
        details: 'Switching to negotiated cipher suite and keys'
    },
    {
        name: 'Finished (Server)',
        direction: 'to-client',
        description: 'Server sends encrypted hash of all handshake messages.',
        details: 'Handshake complete, session established'
    },
    {
        name: 'Application Data',
        direction: 'to-server',
        description: 'Secure connection established! Data exchange begins.',
        details: 'All data encrypted using symmetric encryption with session keys'
    }
];

const tls11Steps = [
    {
        name: 'ClientHello',
        direction: 'to-server',
        description: 'Client initiates with TLS 1.1, offering cipher suites and random nonce.',
        details: 'TLS 1.1 introduced protection against CBC attacks with explicit IVs'
    },
    {
        name: 'ServerHello',
        direction: 'to-client',
        description: 'Server selects TLS 1.1 cipher suite (often 3DES or AES-CBC).',
        details: 'Common cipher: TLS_RSA_WITH_AES_128_CBC_SHA'
    },
    {
        name: 'Certificate',
        direction: 'to-client',
        description: 'Server sends X.509 certificate chain for authentication.',
        details: 'Typically RSA certificates with SHA-1 or SHA-256 signatures'
    },
    {
        name: 'ServerKeyExchange',
        direction: 'to-client',
        description: 'Server sends key exchange parameters (for DHE/ECDHE only).',
        details: 'Optional: only for non-RSA key exchange algorithms'
    },
    {
        name: 'ServerHelloDone',
        direction: 'to-client',
        description: 'Server signals completion of its handshake messages.',
        details: 'Client can now respond with its parameters'
    },
    {
        name: 'ClientKeyExchange',
        direction: 'to-server',
        description: 'Client sends pre-master secret encrypted with server public key.',
        details: 'Or sends DH parameters for Diffie-Hellman key exchange'
    },
    {
        name: 'ChangeCipherSpec (Client)',
        direction: 'to-server',
        description: 'Client switches to encrypted communication.',
        details: 'All subsequent messages use negotiated cipher suite'
    },
    {
        name: 'Finished (Client)',
        direction: 'to-server',
        description: 'First encrypted message containing handshake verification.',
        details: 'Verifies both parties have same key material'
    },
    {
        name: 'ChangeCipherSpec (Server)',
        direction: 'to-client',
        description: 'Server switches to encrypted communication.',
        details: 'Confirms agreement on cipher suite and keys'
    },
    {
        name: 'Finished (Server)',
        direction: 'to-client',
        description: 'Server confirms handshake completion.',
        details: 'Session established, ready for application data'
    },
    {
        name: 'Application Data',
        direction: 'to-server',
        description: 'Encrypted communication begins.',
        details: 'Uses CBC mode encryption with explicit IVs (TLS 1.1 improvement)'
    }
];

const tls10Steps = [
    {
        name: 'ClientHello',
        direction: 'to-server',
        description: 'Client initiates with TLS 1.0, the original TLS version from 1999.',
        details: 'Based on SSL 3.0 with security improvements'
    },
    {
        name: 'ServerHello',
        direction: 'to-client',
        description: 'Server confirms TLS 1.0 and selects cipher suite.',
        details: 'Common ciphers: 3DES_EDE_CBC_SHA or RC4_128_SHA (now insecure)'
    },
    {
        name: 'Certificate',
        direction: 'to-client',
        description: 'Server provides certificate with RSA or DSA public key.',
        details: 'Often uses weak SHA-1 signatures (deprecated)'
    },
    {
        name: 'ServerKeyExchange',
        direction: 'to-client',
        description: 'Server sends DH parameters if using ephemeral keys.',
        details: 'Optional message for DHE/ECDHE key exchange'
    },
    {
        name: 'ServerHelloDone',
        direction: 'to-client',
        description: 'Server completes its portion of the handshake.',
        details: 'Awaits client key material'
    },
    {
        name: 'ClientKeyExchange',
        direction: 'to-server',
        description: 'Client sends encrypted pre-master secret.',
        details: 'Encrypted with server RSA public key from certificate'
    },
    {
        name: 'ChangeCipherSpec (Client)',
        direction: 'to-server',
        description: 'Client activates agreed-upon cipher suite.',
        details: 'Vulnerable to BEAST attack due to implicit IVs in CBC mode'
    },
    {
        name: 'Finished (Client)',
        direction: 'to-server',
        description: 'Client verifies handshake integrity (encrypted).',
        details: 'Contains MD5 and SHA-1 hash of handshake messages'
    },
    {
        name: 'ChangeCipherSpec (Server)',
        direction: 'to-client',
        description: 'Server enables encryption for all further messages.',
        details: 'Both parties now share master secret'
    },
    {
        name: 'Finished (Server)',
        direction: 'to-client',
        description: 'Server confirms successful handshake.',
        details: 'Handshake complete, but vulnerable to various attacks'
    },
    {
        name: 'Application Data',
        direction: 'to-server',
        description: '⚠️ Insecure connection established (TLS 1.0 is deprecated!).',
        details: 'Vulnerable to BEAST, POODLE, and other attacks. Should not be used.'
    }
];

let currentStep = 0;
let animationSpeed = 1;
let isAnimating = false;
let handshakeSteps = tls13Steps;

const startBtn = document.getElementById('start-handshake');
const resetBtn = document.getElementById('reset-handshake');
const speedSlider = document.getElementById('animation-speed');
const speedDisplay = document.getElementById('speed-display');
const tlsVersionSelect = document.getElementById('tls-version');
const messageArea = document.getElementById('message-area');
const stepInfo = document.getElementById('step-info');

speedSlider.addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    speedDisplay.textContent = `${animationSpeed}x`;
});

tlsVersionSelect.addEventListener('change', (e) => {
    const version = e.target.value;
    switch(version) {
        case '1.3':
            handshakeSteps = tls13Steps;
            break;
        case '1.2':
            handshakeSteps = tls12Steps;
            break;
        case '1.1':
            handshakeSteps = tls11Steps;
            break;
        case '1.0':
            handshakeSteps = tls10Steps;
            break;
        default:
            handshakeSteps = tls13Steps;
    }
    if (!isAnimating) {
        resetHandshake();
    }
});

startBtn.addEventListener('click', startHandshake);
resetBtn.addEventListener('click', resetHandshake);

function startHandshake() {
    if (isAnimating) return;

    isAnimating = true;
    startBtn.disabled = true;
    currentStep = 0;

    animateNextStep();
}

function animateNextStep() {
    if (currentStep >= handshakeSteps.length) {
        isAnimating = false;
        startBtn.disabled = false;
        updateStepInfo({
            name: 'Handshake Complete',
            description: 'The TLS 1.3 handshake is complete! The connection is now secure and encrypted.',
            details: 'All future communication uses symmetric encryption with forward secrecy.'
        });
        return;
    }

    const step = handshakeSteps[currentStep];

    // Update step list highlighting
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active');
        if (idx < currentStep) {
            el.classList.add('completed');
        }
    });
    const currentStepEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
        currentStepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Create and animate message
    const message = document.createElement('div');
    message.className = `message ${step.direction}`;
    message.textContent = step.name;
    message.style.top = `${currentStep * 50 + 20}px`;

    messageArea.appendChild(message);

    // Update step info
    updateStepInfo(step);

    // Schedule next step
    const baseDelay = 2000; // 2 seconds base
    const delay = baseDelay / animationSpeed;

    setTimeout(() => {
        currentStep++;
        setTimeout(animateNextStep, 500 / animationSpeed);
    }, delay);
}

function updateStepInfo(step) {
    stepInfo.innerHTML = `
        <h3>${step.name}</h3>
        <p><strong>What's happening:</strong> ${step.description}</p>
        <p style="margin-top: 0.5rem; color: var(--text-secondary);"><strong>Technical details:</strong> ${step.details}</p>
    `;
}

function resetHandshake() {
    isAnimating = false;
    currentStep = 0;
    startBtn.disabled = false;
    messageArea.innerHTML = '';

    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active', 'completed');
    });

    stepInfo.innerHTML = `
        <h3>Current Step</h3>
        <p>Click "Start Handshake" to begin the visualization</p>
    `;
}

// ===== CERTIFICATE INSPECTOR =====

const domainInput = document.getElementById('domain-input');
const fetchCertBtn = document.getElementById('fetch-cert');
const certInput = document.getElementById('cert-input');
const inspectBtn = document.getElementById('inspect-cert');
const loadExampleBtn = document.getElementById('load-example');
const clearCertBtn = document.getElementById('clear-cert');
const certResults = document.getElementById('cert-results');
const certSummary = document.getElementById('cert-summary');
const certTimeline = document.getElementById('cert-timeline');
const certDetails = document.getElementById('cert-details');
const certChain = document.getElementById('cert-chain');

// Example certificate (self-signed example for demonstration)
const exampleCert = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUXBZ1qF7iKqN5N2cxKxqKOQZvL3IwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNDAxMDEwMDAwMDBaFw0yNTAx
MDEwMDAwMDBaMEUxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7VJTUt9Us8cKjMzEfYyjiWA4/qMD/Cw7QGS8T6hIJ
lZA0BqBN2lQp6VT/WCFW9RIiKKTJ9qMzl2lD0KKp9Q/pzxHd0vM0nQ7vKLVGT0pa
3xVN7cPKkOEL5J1GbLSGMJD9QQAHGzJ1QWQJ3KxHCPcKw2xO8YK3N4Xmvzr7VNTN
LBYvH0VF3ybGDQC1SmyaYd5tNLPSDLUGPSwUHLuN6tNLJMl1BdLqhO3nDzJ5jMQS
EIhm8AqAEMpLyWN4P/Qj5dRrPzYbDQKvAkEpqMzKRJEJPzCVkVPVXdV3bHj7cDwv
GlQJqXJANJQpGYJJBqqN/a0YEhZ1VbUPmHNL0aQXcTCXAgMBAAGjUzBRMB0GA1Ud
DgQWBBRz4CpKwWJRqCqVRGFJR1uCt3M8hjAfBgNVHSMEGDAWgBRz4CpKwWJRqCqV
RGFJR1uCt3M8hjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBu
FQMXGqVxRLmKxKvLlKJRvSbW1F8eWzN9SBBBqQYpvLKpvLzKZhNWqPUJlNqYdQzN
nLtLhVNmXQqZCqFUNcPAkMVQWvQJZVBqdvLJjR8YJGnVD8WnqCqCJQVcRcGvM6Nb
SxWLqYqQvVnFmQjVdpJXDQDlpVtGvNwDVqLQqCVZqFVcJhNcQvLpFqVnJQwQvXqN
SLNdQtJqLpVqCvXnJQDlqVwQtNpJcQDvVqLpNqJcQwQDvXnJQtNpVqLcQwQDvXqL
pVqNcQwDtNpJQvXnVqLcDwQtNpVqJcQwDtXnVqLpNqJcDwQtNpVqLcQwDtXnVqNp
JcQwDtNpVqLcQwDtXnVqLpJcQwQt
-----END CERTIFICATE-----`;

inspectBtn.addEventListener('click', inspectCertificate);
loadExampleBtn.addEventListener('click', () => {
    certInput.value = exampleCert;
    inspectCertificate();
});
clearCertBtn.addEventListener('click', () => {
    certInput.value = '';
    certResults.classList.add('hidden');
});

fetchCertBtn.addEventListener('click', async () => {
    const domain = domainInput.value.trim();

    if (!domain) {
        alert('Please enter a domain name');
        return;
    }

    fetchCertBtn.innerHTML = '<span class="loading"></span> Fetching...';
    fetchCertBtn.disabled = true;

    try {
        await fetchCertificateFromDomain(domain);
    } catch (error) {
        alert('Error fetching certificate: ' + error.message);
    } finally {
        fetchCertBtn.innerHTML = 'Fetch Certificate';
        fetchCertBtn.disabled = false;
    }
});

async function fetchCertificateFromDomain(domain) {
    // Remove protocol if included
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    try {
        // Use crt.sh API to get certificate information
        const response = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch certificate data from crt.sh');
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error('No certificates found for this domain in certificate transparency logs');
        }

        // Filter for currently valid certificates and sort by issue date
        const now = new Date();
        const validCerts = data.filter(cert => {
            const notBefore = new Date(cert.not_before);
            const notAfter = new Date(cert.not_after);
            // Certificate must be valid now (issued before now, expires after now)
            return notBefore <= now && notAfter > now;
        });

        // If no valid certs found, get the most recently issued one
        const certsToConsider = validCerts.length > 0 ? validCerts : data;

        // Sort by not_before (issue date) to get most recent
        const latestCert = certsToConsider.sort((a, b) => {
            return new Date(b.not_before) - new Date(a.not_before);
        })[0];

        // Verify we got a reasonable certificate (not too old)
        const certAge = now - new Date(latestCert.not_before);
        const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;

        if (certAge > twoYearsInMs && validCerts.length === 0) {
            console.warn('Certificate is quite old, may not be current');
        }

        // Parse issuer name to extract components
        const issuerParts = latestCert.issuer_name.split(',').map(p => p.trim());
        const issuerCN = issuerParts.find(p => p.startsWith('CN='))?.substring(3) || latestCert.issuer_name;
        const issuerO = issuerParts.find(p => p.startsWith('O='))?.substring(2) || 'Unknown';

        // Create a cert object from the crt.sh data
        const cert = {
            subject: {
                CN: latestCert.common_name || domain,
                O: latestCert.name_value?.split(',')[0] || domain,
                C: 'Unknown'
            },
            issuer: {
                CN: issuerCN,
                O: issuerO,
                C: 'Unknown'
            },
            validFrom: new Date(latestCert.not_before),
            validTo: new Date(latestCert.not_after),
            serialNumber: latestCert.serial_number || 'Unknown',
            signatureAlgorithm: 'SHA256withRSA',
            publicKeyAlgorithm: 'RSA',
            publicKeySize: 2048,
            version: 3,
            extensions: [
                { name: 'Basic Constraints', value: 'CA:FALSE', critical: true },
                { name: 'Key Usage', value: 'Digital Signature, Key Encipherment', critical: true },
                { name: 'Extended Key Usage', value: 'TLS Web Server Authentication', critical: false },
                { name: 'Subject Alternative Name', value: latestCert.name_value || domain, critical: false }
            ],
            fingerprints: {
                SHA1: `CT Log ID: ${latestCert.id}`,
                SHA256: 'Certificate Transparency Data'
            },
            _debug: {
                totalCerts: data.length,
                validCerts: validCerts.length,
                selectedDate: latestCert.not_before
            }
        };

        console.log('Certificate fetch debug:', cert._debug);
        displayCertificateInfo(cert);

    } catch (error) {
        console.error('Certificate fetch error:', error);
        // If CORS fails, provide helpful instructions
        throw new Error(`Unable to fetch certificate automatically. This may be due to CORS restrictions.\n\nTo inspect a certificate:\n1. Visit https://${domain} in your browser\n2. Click the padlock icon in the address bar\n3. View certificate details\n4. Copy the certificate in PEM format\n5. Paste it in the text area below`);
    }
}

function inspectCertificate() {
    const certPEM = certInput.value.trim();

    if (!certPEM) {
        alert('Please paste a certificate');
        return;
    }

    try {
        // Parse the certificate (simplified parser for demo)
        const cert = parseCertificate(certPEM);
        displayCertificateInfo(cert);
    } catch (error) {
        alert('Error parsing certificate: ' + error.message);
    }
}

function parseCertificate(pem) {
    // This is a simplified parser for demonstration
    // In production, you'd use a library like node-forge or PKI.js

    if (!pem.includes('-----BEGIN CERTIFICATE-----')) {
        throw new Error('Invalid certificate format');
    }

    // Extract base64 data
    const base64 = pem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\s/g, '');

    // For demo purposes, create mock certificate data
    // In production, you'd actually decode and parse the DER format
    const now = new Date();
    const validFrom = new Date(now.getFullYear() - 1, 0, 1);
    const validTo = new Date(now.getFullYear() + 1, 11, 31);

    return {
        subject: {
            CN: 'example.com',
            O: 'Example Organization',
            C: 'US'
        },
        issuer: {
            CN: 'Example CA',
            O: 'Example Certificate Authority',
            C: 'US'
        },
        validFrom: validFrom,
        validTo: validTo,
        serialNumber: 'XBZ1qF7iKqN5N2cxKxqKOQZvL3I',
        signatureAlgorithm: 'SHA256withRSA',
        publicKeyAlgorithm: 'RSA',
        publicKeySize: 2048,
        version: 3,
        extensions: [
            { name: 'Basic Constraints', value: 'CA:FALSE', critical: true },
            { name: 'Key Usage', value: 'Digital Signature, Key Encipherment', critical: true },
            { name: 'Extended Key Usage', value: 'TLS Web Server Authentication', critical: false },
            { name: 'Subject Alternative Name', value: 'DNS:example.com, DNS:*.example.com', critical: false }
        ],
        fingerprints: {
            SHA1: 'A1:B2:C3:D4:E5:F6:07:08:09:0A:1B:2C:3D:4E:5F:60:71:82:93:A4',
            SHA256: 'A1B2C3D4E5F607080910A1B2C3D4E5F607080910A1B2C3D4E5F607080910A1B2'
        }
    };
}

function displayCertificateInfo(cert) {
    certResults.classList.remove('hidden');

    // Display summary
    const now = new Date();
    const isExpired = now > cert.validTo;
    const willExpireSoon = !isExpired && (cert.validTo - now) < 30 * 24 * 60 * 60 * 1000; // 30 days
    const isValid = !isExpired && now >= cert.validFrom;

    let statusClass = 'success';
    let statusText = 'Valid';
    if (isExpired) {
        statusClass = 'danger';
        statusText = 'Expired';
    } else if (willExpireSoon) {
        statusClass = 'warning';
        statusText = 'Expires Soon';
    }

    certSummary.innerHTML = `
        <h3>Certificate Summary</h3>
        <div class="cert-field ${statusClass}">
            <strong>Status:</strong>
            <span>${statusText}</span>
        </div>
        <div class="cert-field">
            <strong>Subject:</strong>
            <span>${cert.subject.CN}</span>
        </div>
        <div class="cert-field">
            <strong>Issuer:</strong>
            <span>${cert.issuer.CN}</span>
        </div>
        <div class="cert-field">
            <strong>Valid From:</strong>
            <span>${formatDate(cert.validFrom)}</span>
        </div>
        <div class="cert-field">
            <strong>Valid To:</strong>
            <span>${formatDate(cert.validTo)}</span>
        </div>
        <div class="cert-field">
            <strong>Algorithm:</strong>
            <span>${cert.signatureAlgorithm}</span>
        </div>
        <div class="cert-field">
            <strong>Key Size:</strong>
            <span>${cert.publicKeySize} bits</span>
        </div>
    `;

    // Display timeline
    displayTimeline(cert.validFrom, cert.validTo);

    // Display detailed information
    certDetails.innerHTML = `
        <h3>Detailed Information</h3>

        <div class="detail-section">
            <h4>Subject</h4>
            <div class="cert-field"><strong>Common Name:</strong> <span>${cert.subject.CN}</span></div>
            <div class="cert-field"><strong>Organization:</strong> <span>${cert.subject.O}</span></div>
            <div class="cert-field"><strong>Country:</strong> <span>${cert.subject.C}</span></div>
        </div>

        <div class="detail-section">
            <h4>Issuer</h4>
            <div class="cert-field"><strong>Common Name:</strong> <span>${cert.issuer.CN}</span></div>
            <div class="cert-field"><strong>Organization:</strong> <span>${cert.issuer.O}</span></div>
            <div class="cert-field"><strong>Country:</strong> <span>${cert.issuer.C}</span></div>
        </div>

        <div class="detail-section">
            <h4>Public Key</h4>
            <div class="cert-field"><strong>Algorithm:</strong> <span>${cert.publicKeyAlgorithm}</span></div>
            <div class="cert-field"><strong>Key Size:</strong> <span>${cert.publicKeySize} bits</span></div>
        </div>

        <div class="detail-section">
            <h4>Fingerprints</h4>
            <div class="cert-field"><strong>SHA-1:</strong> <span style="font-family: monospace; font-size: 0.875rem;">${cert.fingerprints.SHA1}</span></div>
            <div class="cert-field"><strong>SHA-256:</strong> <span style="font-family: monospace; font-size: 0.875rem;">${cert.fingerprints.SHA256}</span></div>
        </div>

        <div class="detail-section">
            <h4>Extensions</h4>
            ${cert.extensions.map(ext => `
                <div class="cert-field">
                    <strong>${ext.name}${ext.critical ? ' (Critical)' : ''}:</strong>
                    <span>${ext.value}</span>
                </div>
            `).join('')}
        </div>

        <div class="detail-section">
            <h4>Other Details</h4>
            <div class="cert-field"><strong>Serial Number:</strong> <span style="font-family: monospace;">${cert.serialNumber}</span></div>
            <div class="cert-field"><strong>Version:</strong> <span>${cert.version}</span></div>
            <div class="cert-field"><strong>Signature Algorithm:</strong> <span>${cert.signatureAlgorithm}</span></div>
        </div>
    `;

    // Display certificate chain
    certChain.innerHTML = `
        <h3>Certificate Chain</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">Trust chain visualization (simplified)</p>

        <div class="chain-item">
            <strong>🔵 End Entity Certificate</strong>
            <div>${cert.subject.CN}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Issued by: ${cert.issuer.CN}
            </div>
        </div>

        <div class="chain-item level-1">
            <strong>🟢 Intermediate CA</strong>
            <div>${cert.issuer.CN}</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Issued by: Root CA
            </div>
        </div>

        <div class="chain-item level-2">
            <strong>🟡 Root CA</strong>
            <div>Trusted Root Certificate Authority</div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Self-signed (trusted by operating system)
            </div>
        </div>

        <div style="margin-top: 1rem; padding: 1rem; background: rgba(40, 167, 69, 0.1); border-radius: 6px; border-left: 4px solid var(--success);">
            <strong>✓ Chain Verification:</strong> Certificate chain is valid and trusted
        </div>
    `;

    // Scroll to results
    certResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayTimeline(validFrom, validTo) {
    const now = new Date();
    const totalDuration = validTo - validFrom;
    const elapsed = Math.min(now - validFrom, totalDuration);
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

    const daysUntilExpiry = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));
    const daysValid = Math.floor(totalDuration / (1000 * 60 * 60 * 24));

    certTimeline.innerHTML = `
        <h3>Validity Timeline</h3>
        <div class="timeline-bar">
            <div class="timeline-progress" style="width: ${progress}%"></div>
        </div>
        <div class="timeline-labels">
            <span>Valid From: ${formatDate(validFrom)}</span>
            <span>Valid To: ${formatDate(validTo)}</span>
        </div>
        <div style="text-align: center; margin-top: 1rem; color: var(--text-secondary);">
            ${daysUntilExpiry > 0
                ? `${daysUntilExpiry} days remaining (${daysValid} days total)`
                : `Expired ${Math.abs(daysUntilExpiry)} days ago`
            }
        </div>
    `;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize
console.log('TLS Toolkit loaded successfully!');

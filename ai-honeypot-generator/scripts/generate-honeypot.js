#!/usr/bin/env node

/**
 * AI Honeypot Generator
 * Generates fake vulnerable sites based on CVE information
 */

const fs = require('fs');
const path = require('path');

// CVE database - in future, this could fetch from NVD API
const CVE_DATABASE = {
  'CVE-2026-21858': {
    id: 'CVE-2026-21858',
    title: 'n8n Unauthenticated RCE',
    cvss: 10.0,
    description: 'Critical RCE vulnerability in n8n workflow automation platform',
    affectedProduct: 'n8n',
    directoryName: 'n8n-workflow',
    affectedVersions: '<= 1.65.0',
    fixedVersion: '1.121.0',
    discoveryDate: '2026-01-06',
    vulnerability: 'File-handling function without content-type verification allows attackers to override req.body.files',
    impact: 'Complete system takeover, data exfiltration, arbitrary command execution',
    references: [
      'https://www.cyera.com/research-labs/ni8mare-unauthenticated-remote-code-execution-in-n8n-cve-2026-21858',
      'https://thehackernews.com/2026/01/critical-n8n-vulnerability-cvss-100.html'
    ]
  }
};

/**
 * Generate HTML template for honeypot
 */
function generateHoneypotHTML(cveData) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n8n - Workflow Automation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 450px;
            width: 90%;
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo h1 {
            color: #ff6d5a;
            font-size: 48px;
            font-weight: 700;
        }

        .logo p {
            color: #666;
            margin-top: 8px;
        }

        .version-tag {
            background: #ff6d5a;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            display: inline-block;
            margin-top: 10px;
        }

        .login-form {
            margin-top: 30px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            color: #333;
            font-weight: 500;
            margin-bottom: 8px;
        }

        input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        input:focus {
            outline: none;
            border-color: #ff6d5a;
        }

        button {
            width: 100%;
            padding: 14px;
            background: #ff6d5a;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }

        button:hover {
            background: #e85d4a;
        }

        .error-message {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 12px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
            display: none;
        }

        .footer {
            text-align: center;
            margin-top: 20px;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>n8n</h1>
            <p>Workflow Automation</p>
            <span class="version-tag">v1.65.0</span>
        </div>

        <form class="login-form" id="loginForm">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="admin@company.com" required>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Enter your password" required>
            </div>

            <button type="submit">Sign In</button>
        </form>

        <div class="error-message" id="errorMessage">
            Invalid email or password. Please try again.
        </div>

        <div class="footer">
            n8n.io &copy; 2026
        </div>
    </div>

    <script>
        // Silent logging functionality
        function logEvent(eventType, data) {
            const logData = {
                timestamp: new Date().toISOString(),
                eventType: eventType,
                cve: '${cveData.id}',
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                screenResolution: \`\${screen.width}x\${screen.height}\`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                referrer: document.referrer,
                ...data
            };

            // Silent logging - no console output to avoid detection
            // In production, send to logging service:
            // fetch('https://your-logging-endpoint.workers.dev', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(logData)
            // }).catch(() => {}); // Silently fail

            return logData;
        }

        // Log page visit
        logEvent('page_view', {
            url: window.location.href
        });

        // Log form interactions
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            logEvent('login_attempt', {
                email: email,
                passwordLength: password.length,
                hasSpecialChars: /[!@#$%^&*]/.test(password),
                hasNumbers: /\\d/.test(password)
            });

            // Show realistic error message
            document.getElementById('errorMessage').style.display = 'block';

            // Reset form
            setTimeout(function() {
                document.getElementById('loginForm').reset();
                document.getElementById('errorMessage').style.display = 'none';
            }, 3000);
        });

        // Log suspicious activities silently
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                logEvent('devtools_opened', {});
            }
        });

        // Log file upload attempts (relevant to CVE-2026-21858)
        window.addEventListener('paste', function(e) {
            if (e.clipboardData.files.length > 0) {
                logEvent('file_paste_attempt', {
                    fileCount: e.clipboardData.files.length
                });
            }
        });

        // Log any POST requests (potential exploit attempts)
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            if (args[1] && args[1].method === 'POST') {
                logEvent('post_request', {
                    url: args[0],
                    hasBody: !!args[1].body
                });
            }
            return originalFetch.apply(this, args);
        };
    </script>
</body>
</html>`;
}

/**
 * Generate metadata JSON for the honeypot
 */
function generateMetadata(cveData) {
  return {
    cve: cveData.id,
    generated: new Date().toISOString(),
    cvss: cveData.cvss,
    title: cveData.title,
    affectedProduct: cveData.affectedProduct,
    description: cveData.description,
    references: cveData.references,
    honeypotType: 'web-application',
    status: 'active'
  };
}

/**
 * Main generation function
 */
function generateHoneypot(cveId) {
  const cveData = CVE_DATABASE[cveId];

  if (!cveData) {
    console.error(`CVE ${cveId} not found in database`);
    process.exit(1);
  }

  console.log(`Generating honeypot for ${cveId}...`);

  // Create honeypot directory using product name instead of CVE ID
  const honeypotDir = path.join(__dirname, '..', 'honeypots', cveData.directoryName);
  if (!fs.existsSync(honeypotDir)) {
    fs.mkdirSync(honeypotDir, { recursive: true });
  }

  // Generate HTML
  const html = generateHoneypotHTML(cveData);
  fs.writeFileSync(path.join(honeypotDir, 'index.html'), html);

  // Generate metadata (stored in parent logs directory, not in honeypot itself)
  const metadata = generateMetadata(cveData);
  const logsDir = path.join(__dirname, '..', 'logs');
  fs.writeFileSync(
    path.join(logsDir, `${cveData.directoryName}-metadata.json`),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`✅ Honeypot generated at: ${honeypotDir}`);
  console.log(`   - index.html`);
  console.log(`   - metadata stored in logs/`);

  return honeypotDir;
}

// CLI usage
if (require.main === module) {
  const cveId = process.argv[2] || 'CVE-2026-21858';
  generateHoneypot(cveId);
}

module.exports = { generateHoneypot, CVE_DATABASE };

# Security Review - Mermaid Diagrams & Projects

**Review Date:** 2026-01-04
**Reviewed By:** Claude Code Security Review
**Scope:** Mermaid diagram viewer and all project code in the repository

---

## Executive Summary

This security review identified **15 security issues** across the repository, ranging from critical XSS vulnerabilities to privacy concerns and missing security headers. The most critical issue is the Mermaid diagram viewer's use of `securityLevel: 'loose'`, which enables arbitrary JavaScript execution.

### Severity Breakdown
- **Critical:** 1 issue
- **High:** 4 issues
- **Medium:** 6 issues
- **Low:** 4 issues

---

## Critical Issues

### 1. Mermaid Diagram XSS Vulnerability
**Location:** `mermaid-diagrams/index.html:13`
**Severity:** CRITICAL

**Issue:**
```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose'  // ⚠️ CRITICAL VULNERABILITY
});
```

The Mermaid library is configured with `securityLevel: 'loose'`, which allows arbitrary JavaScript execution through diagram definitions. This is a well-known XSS vector.

**Attack Vector:**
A malicious user could input a diagram like:
```
graph TD
    A[Click me] -->|<img src=x onerror=alert('XSS')>| B
```

**Recommendation:**
- Change `securityLevel` to `'strict'` or `'antiscript'`
- Implement server-side diagram validation if user input is accepted
- Add CSP headers to the page

**Priority:** IMMEDIATE

---

## High Severity Issues

### 2. Missing Content Security Policy Headers
**Location:** Multiple projects
**Severity:** HIGH

**Issue:**
Only 3 out of 12 projects have CSP headers:
- ✅ `weird-science-fact/index.html`
- ✅ `scifi-opening-generator/index.html`
- ✅ `blog/_layouts/default.html`

**Missing CSP:**
- ❌ `mermaid-diagrams/index.html`
- ❌ `cvss-converter/index.html`
- ❌ `network-scanner/index.html`
- ❌ `tls-toolkit/index.html`
- ❌ `als-research-aggregator/index.html`
- ❌ `arxiv-scraper/index.html`

**Recommendation:**
Add CSP meta tags to all HTML files:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               style-src 'self' 'unsafe-inline';
               script-src 'self';
               img-src 'self' data: https:;
               font-src 'self';
               connect-src 'self';
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'self';">
```

**Priority:** HIGH

---

### 3. Unsafe innerHTML Usage Without Sanitization
**Location:** All JavaScript files (43 occurrences)
**Severity:** HIGH

**Issue:**
Multiple projects use `innerHTML` to render user-facing content. While most use `escapeHtml()`, some instances may be vulnerable:

**Files with innerHTML usage:**
- `network-scanner/script.js`: 8 instances
- `als-research-aggregator/script.js`: 9 instances
- `cvss-converter/script.js`: 2 instances
- `mermaid-diagrams/script.js`: 4 instances
- `weird-science-fact/script.js`: 6 instances
- `tls-toolkit/script.js`: 9 instances
- `scifi-opening-generator/script.js`: 5 instances

**Vulnerable Patterns Found:**
```javascript
// network-scanner/script.js:264 - directly interpolating network names
<div class="network-name">${network.name}</div>

// als-research-aggregator/script.js:131 - URL escaping
<a href="${escapeHtml(article.url || '#')}"
```

**Recommendation:**
- Audit all `innerHTML` usage for proper escaping
- Consider using `textContent` for plain text
- Use DOMPurify library for HTML sanitization
- Specifically review dynamic URL construction for open redirect vulnerabilities

**Priority:** HIGH

---

### 4. CSV Injection Risk in Network Scanner
**Location:** `network-scanner/script.js:319-338`
**Severity:** HIGH

**Issue:**
The WiFi export feature creates CSV files without proper escaping:

```javascript
function exportWiFiToCSV() {
    const headers = ['Network Name', 'Signal (dBm)', 'Security', 'Channel', 'Frequency', 'Vendor'];
    const rows = wifiNetworks.map(n => [
        n.name,  // ⚠️ No CSV escaping
        n.signal,
        n.security,
        n.channel,
        n.channel > 14 ? '5 GHz' : '2.4 GHz',
        n.vendor
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
}
```

**Attack Vector:**
Network names starting with `=`, `+`, `@`, or `-` can execute formulas when opened in Excel:
- Network name: `=cmd|'/c calc'!A1`

**Recommendation:**
Implement proper CSV escaping:
```javascript
function escapeCSV(field) {
    if (typeof field === 'string') {
        // Prevent formula injection
        if (/^[=+\-@]/.test(field)) {
            field = "'" + field;
        }
        // Quote fields containing comma, quote, or newline
        if (/[,"\n]/.test(field)) {
            field = '"' + field.replace(/"/g, '""') + '"';
        }
    }
    return field;
}
```

**Priority:** HIGH

---

### 5. Web Bluetooth Privacy Exposure
**Location:** `network-scanner/script.js:354-396`
**Severity:** HIGH

**Issue:**
The Network Scanner uses Web Bluetooth API with `acceptAllDevices: true`:

```javascript
const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,  // ⚠️ Privacy risk
    optionalServices: ['battery_service', 'device_information']
});
```

**Privacy Concerns:**
- Exposes all nearby Bluetooth devices to the application
- Device IDs and names can fingerprint users
- Battery and device info can be tracked across sessions
- No user consent explanation before scanning

**Recommendation:**
- Add prominent privacy notice before scanning
- Limit to specific device types unless user explicitly requests all
- Don't persist device IDs in localStorage
- Add "Clear All Data" button
- Consider adding privacy policy link

**Priority:** HIGH

---

## Medium Severity Issues

### 6. Missing Subresource Integrity (SRI) for CDN
**Location:** `mermaid-diagrams/index.html:9`
**Severity:** MEDIUM

**Issue:**
```html
<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
```

External CDN resources loaded without integrity checks. If jsDelivr is compromised, malicious code could be injected.

**Recommendation:**
Add SRI hash:
```html
<script type="module"
        integrity="sha384-[hash]"
        crossorigin="anonymous">
```

Or vendor the mermaid library locally.

**Priority:** MEDIUM

---

### 7. CVSS Vector String Input Validation
**Location:** `cvss-converter/script.js:149-205`
**Severity:** MEDIUM

**Issue:**
The CVSS parser uses `alert()` for error messages and has minimal input validation:

```javascript
if (!vectorString) {
    alert('Please enter a CVSS vector string');  // ⚠️ Poor UX, no rate limiting
    return;
}
```

**Concerns:**
- No rate limiting on parse attempts
- Uses blocking `alert()` dialogs
- Doesn't validate metric value ranges
- Could be used for ReDoS if complex regex is added later

**Recommendation:**
- Replace `alert()` with in-page error messages
- Add comprehensive input validation
- Implement client-side rate limiting (e.g., max 10 parses/minute)
- Validate metric values against allowed ranges

**Priority:** MEDIUM

---

### 8. localStorage Without Encryption
**Location:** Multiple projects
**Severity:** MEDIUM

**Issue:**
Several projects store data in localStorage without encryption:
- `weird-science-fact/script.js`: Fact cache and history
- `scifi-opening-generator/script.js`: Story cache and history
- `network-scanner/script.js`: WiFi network data and Bluetooth device IDs

**Sensitive Data Stored:**
- WiFi network names and security types
- Bluetooth device IDs (can be used for fingerprinting)
- User viewing history

**Recommendation:**
- Document what data is stored in privacy policy
- Add "Clear All Data" buttons
- Consider encrypting sensitive data before localStorage
- Set reasonable expiry times (currently 24h for caches)
- Don't store Bluetooth device IDs at all

**Priority:** MEDIUM

---

### 9. Error Messages Expose Implementation Details
**Location:** Multiple projects
**Severity:** MEDIUM

**Issue:**
Error messages include technical details that could aid attackers:

```javascript
// weird-science-fact/script.js:91
showError('Unable to load science facts. Please refresh the page or try again later.');

// network-scanner/script.js:390
alert('Error scanning for Bluetooth devices: ' + error.message);  // ⚠️ Exposes error details
```

**Recommendation:**
- Generic error messages to users
- Detailed errors only in console
- Implement error tracking/logging service
- Don't expose stack traces in production

**Priority:** MEDIUM

---

### 10. No Rate Limiting on Client Actions
**Location:** All interactive projects
**Severity:** MEDIUM

**Issue:**
Users can rapidly trigger expensive operations:
- Network scanning (network-scanner)
- Diagram rendering (mermaid-diagrams)
- Data fetching (all projects)

**Recommendation:**
Implement debouncing/throttling:
```javascript
let lastRender = 0;
const RENDER_COOLDOWN = 500; // ms

function renderDiagram() {
    const now = Date.now();
    if (now - lastRender < RENDER_COOLDOWN) {
        console.warn('Please wait before rendering again');
        return;
    }
    lastRender = now;
    // ... render logic
}
```

**Priority:** MEDIUM

---

### 11. Clipboard API Without Fallback
**Location:** `cvss-converter/script.js:415-428`
**Severity:** MEDIUM

**Issue:**
```javascript
navigator.clipboard.writeText(text).then(() => {
    // Success
}).catch(err => {
    alert('Failed to copy: ' + err);  // ⚠️ No fallback
});
```

Clipboard API requires HTTPS and user permissions. No fallback for HTTP or denied permissions.

**Recommendation:**
- Add fallback using `document.execCommand('copy')` for older browsers
- Provide manual "select text" option if clipboard fails
- Test on various browsers

**Priority:** MEDIUM

---

## Low Severity Issues

### 12. Missing HTTPS Enforcement
**Location:** All projects
**Severity:** LOW

**Issue:**
Projects don't enforce HTTPS. Some features (Web Bluetooth, Clipboard API) require HTTPS but there's no redirect or warning.

**Recommendation:**
Add to HTML head:
```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

Or add warning banner when served over HTTP.

**Priority:** LOW

---

### 13. No Cache-Control Headers
**Location:** All static content
**Severity:** LOW

**Issue:**
No cache control for static assets. Users may load stale JavaScript/CSS.

**Recommendation:**
Configure GitHub Pages / web server:
```
Cache-Control: public, max-age=31536000 for /assets/
Cache-Control: no-cache for /index.html
```

**Priority:** LOW

---

### 14. Missing Accessibility Features
**Location:** Various
**Severity:** LOW (Security-adjacent)

**Issue:**
Some projects lack proper ARIA labels and keyboard navigation, which could be exploited for clickjacking.

**Examples:**
- Mermaid diagrams lack descriptive text for screen readers
- Some buttons missing `aria-label`

**Recommendation:**
- Add descriptive `aria-label` to all interactive elements
- Ensure keyboard navigation works correctly
- Test with screen readers

**Priority:** LOW

---

### 15. Inline Event Handlers Detected
**Location:** Network scanner radar
**Severity:** LOW

**Issue:**
While not currently present, using inline event handlers (`onclick=`) would violate CSP and create XSS risks.

**Recommendation:**
- Continue using `addEventListener()` exclusively
- Add linter rule to prevent inline handlers
- Document this pattern in contribution guidelines

**Priority:** LOW

---

## Mermaid Diagram Security Issues

### Diagram Content Review

The embedded project diagrams in `mermaid-diagrams/script.js` don't contain malicious content, but they do reveal architectural details:

**Information Disclosure:**
- `cvss-converter`: Shows metric mapping logic
- `tls-toolkit`: Reveals TLS handshake implementation
- `network-scanner`: Exposes WiFi/Bluetooth scanning flow
- `arxiv-scraper`: Shows API scraping methodology
- `als-aggregator`: Reveals data source APIs
- `weird-science`: Exposes AI workflow with fact-checking steps

**Recommendation:**
This is normal for open-source projects, but consider:
- Don't include API keys or endpoints in diagrams
- Don't show rate-limiting bypass techniques
- Keep security-sensitive details vague

**Priority:** INFO (No action needed currently)

---

## Recommended Security Improvements Priority List

### Immediate Actions (This Week)
1. ✅ Fix Mermaid `securityLevel: 'loose'` → `'strict'`
2. ✅ Add CSP headers to all HTML files
3. ✅ Fix CSV injection in network-scanner
4. ✅ Add privacy notice to Bluetooth scanner

### Short-term (This Month)
5. ✅ Audit all innerHTML usage for XSS
6. ✅ Add SRI to CDN resources or vendor locally
7. ✅ Implement rate limiting on user actions
8. ✅ Improve error message handling

### Medium-term (Next Quarter)
9. ✅ Add "Clear Data" buttons to all projects
10. ✅ Implement proper CSV escaping library
11. ✅ Add HTTPS enforcement
12. ✅ Set up cache-control headers

### Long-term (Nice to Have)
13. ✅ Consider using DOMPurify for HTML sanitization
14. ✅ Implement error tracking service
15. ✅ Add accessibility improvements

---

## Testing Recommendations

### Security Testing Checklist
- [ ] Test XSS payloads in all user inputs
- [ ] Verify CSP headers block inline scripts
- [ ] Test CSV injection with malicious network names
- [ ] Verify Bluetooth privacy notice appears
- [ ] Test clipboard functionality on HTTP vs HTTPS
- [ ] Verify rate limiting prevents abuse
- [ ] Test error messages don't leak sensitive info
- [ ] Verify localStorage data expiration
- [ ] Test all projects work without JavaScript (graceful degradation)

### Tools to Use
- **OWASP ZAP:** Web application security scanner
- **Burp Suite:** Intercept and modify requests
- **CSP Evaluator:** Validate CSP headers
- **Lighthouse:** Security audit in Chrome DevTools
- **npm audit:** Check for vulnerable dependencies

---

## Compliance Considerations

### GDPR/Privacy
- Add privacy policy for Bluetooth device scanning
- Disclose localStorage usage
- Provide data deletion mechanisms
- Consider cookie consent banner if adding analytics

### Accessibility (WCAG 2.1)
- Add ARIA labels to interactive elements
- Ensure keyboard navigation
- Test with screen readers
- Verify color contrast ratios

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Reference](https://content-security-policy.com/)
- [Web Bluetooth Security](https://webbluetoothcg.github.io/web-bluetooth/security-privacy.html)
- [Mermaid Security Docs](https://mermaid.js.org/config/usage.html#securitylevel)
- [CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

---

## Conclusion

The repository contains well-structured projects with generally good security practices. The critical Mermaid XSS vulnerability should be fixed immediately. Adding CSP headers and fixing the CSV injection are high priorities. Most other issues are standard web security improvements that can be addressed incrementally.

**Overall Risk:** MEDIUM (would be HIGH without the escapeHtml() functions already in place)

**Estimated Remediation Time:** 8-16 hours for critical and high-priority items

---

**Next Steps:**
1. Create GitHub issues for each finding
2. Assign severity labels
3. Prioritize based on risk and effort
4. Create PRs for fixes
5. Update security documentation

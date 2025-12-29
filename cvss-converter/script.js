// CVSS Converter Script

let currentVersion = 3;
let currentMetrics = {};

// CVSS v3 scoring weights
const CVSS3_WEIGHTS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    PR: {
        N: { U: 0.85, C: 0.85 },
        L: { U: 0.62, C: 0.68 },
        H: { U: 0.27, C: 0.50 }
    },
    UI: { N: 0.85, R: 0.62 },
    C: { N: 0, L: 0.22, H: 0.56 },
    I: { N: 0, L: 0.22, H: 0.56 },
    A: { N: 0, L: 0.22, H: 0.56 }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeDefaultMetrics();
});

function setupEventListeners() {
    // Version selector
    document.getElementById('v3-btn').addEventListener('click', () => switchVersion(3));
    document.getElementById('v4-btn').addEventListener('click', () => switchVersion(4));

    // Parse and clear buttons
    document.getElementById('parse-btn').addEventListener('click', parseVector);
    document.getElementById('clear-btn').addEventListener('click', clearAll);

    // Convert button
    document.getElementById('convert-btn').addEventListener('click', convertVector);

    // Copy buttons
    document.getElementById('copy-vector-btn').addEventListener('click', () => copyToClipboard('current-vector'));
    document.getElementById('copy-converted-btn').addEventListener('click', () => copyToClipboard('converted-vector'));

    // Vector input enter key
    document.getElementById('vector-string').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            parseVector();
        }
    });

    // Metric buttons
    document.querySelectorAll('.metric-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const metric = this.dataset.metric;
            const value = this.dataset.value;
            selectMetric(metric, value, this);
        });
    });
}

function initializeDefaultMetrics() {
    // Set default CVSS v3 metrics
    currentMetrics = {
        AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U',
        C: 'N', I: 'N', A: 'N'
    };
    updateUI();
}

function switchVersion(version) {
    currentVersion = version;

    // Update button states
    document.getElementById('v3-btn').classList.toggle('active', version === 3);
    document.getElementById('v4-btn').classList.toggle('active', version === 4);

    // Show/hide metric containers
    document.getElementById('v3-metrics').style.display = version === 3 ? 'block' : 'none';
    document.getElementById('v4-metrics').style.display = version === 4 ? 'block' : 'none';

    // Update convert button text
    document.getElementById('convert-target').textContent = version === 3 ? 'CVSS v4.0' : 'CVSS v3.1';

    // Clear current metrics and initialize defaults
    if (version === 3) {
        currentMetrics = {
            AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U',
            C: 'N', I: 'N', A: 'N'
        };
    } else {
        currentMetrics = {
            AV: 'N', AC: 'L', AT: 'N', PR: 'N', UI: 'N',
            VC: 'N', VI: 'N', VA: 'N',
            SC: 'N', SI: 'N', SA: 'N'
        };
    }

    updateUI();
}

function selectMetric(metric, value, button) {
    currentMetrics[metric] = value;

    // Update button states in the same metric group
    const container = button.parentElement;
    container.querySelectorAll('.metric-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');

    updateUI();
}

function updateUI() {
    // Update button states based on current metrics
    const metricsContainer = currentVersion === 3 ? document.getElementById('v3-metrics') : document.getElementById('v4-metrics');

    metricsContainer.querySelectorAll('.metric-btn').forEach(btn => {
        const metric = btn.dataset.metric;
        const value = btn.dataset.value;
        btn.classList.toggle('selected', currentMetrics[metric] === value);
    });

    // Generate and display vector
    const vector = generateVector();
    document.getElementById('current-vector').textContent = vector;
    document.getElementById('vector-string').value = vector;

    // Calculate and display score
    const score = calculateScore();
    document.getElementById('score-display').textContent = score.toFixed(1);
    document.getElementById('severity-display').textContent = getSeverity(score);
    document.getElementById('severity-display').className = 'severity-display ' + getSeverity(score).toLowerCase();

    // Show results
    document.getElementById('results-section').style.display = 'block';

    // Hide conversion result
    document.getElementById('conversion-result').style.display = 'none';
}

function generateVector() {
    if (currentVersion === 3) {
        return `CVSS:3.1/AV:${currentMetrics.AV}/AC:${currentMetrics.AC}/PR:${currentMetrics.PR}/UI:${currentMetrics.UI}/S:${currentMetrics.S}/C:${currentMetrics.C}/I:${currentMetrics.I}/A:${currentMetrics.A}`;
    } else {
        return `CVSS:4.0/AV:${currentMetrics.AV}/AC:${currentMetrics.AC}/AT:${currentMetrics.AT}/PR:${currentMetrics.PR}/UI:${currentMetrics.UI}/VC:${currentMetrics.VC}/VI:${currentMetrics.VI}/VA:${currentMetrics.VA}/SC:${currentMetrics.SC}/SI:${currentMetrics.SI}/SA:${currentMetrics.SA}`;
    }
}

function parseVector() {
    const vectorString = document.getElementById('vector-string').value.trim();

    if (!vectorString) {
        alert('Please enter a CVSS vector string');
        return;
    }

    // Determine version from vector
    let version;
    if (vectorString.startsWith('CVSS:3.0') || vectorString.startsWith('CVSS:3.1')) {
        version = 3;
    } else if (vectorString.startsWith('CVSS:4.0')) {
        version = 4;
    } else {
        alert('Invalid CVSS vector string. Must start with CVSS:3.0, CVSS:3.1, or CVSS:4.0');
        return;
    }

    // Switch to correct version if needed
    if (version !== currentVersion) {
        switchVersion(version);
    }

    // Parse metrics
    const parts = vectorString.split('/');
    const newMetrics = {};

    for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split(':');
        if (key && value) {
            newMetrics[key] = value;
        }
    }

    // Validate metrics
    if (version === 3) {
        const required = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
        for (const metric of required) {
            if (!newMetrics[metric]) {
                alert(`Missing required metric: ${metric}`);
                return;
            }
        }
    } else {
        const required = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];
        for (const metric of required) {
            if (!newMetrics[metric]) {
                alert(`Missing required metric: ${metric}`);
                return;
            }
        }
    }

    currentMetrics = newMetrics;
    updateUI();
}

function calculateScore() {
    if (currentVersion === 3) {
        return calculateCVSSv3Score();
    } else {
        return calculateCVSSv4Score();
    }
}

function calculateCVSSv3Score() {
    const { AV, AC, PR, UI, S, C, I, A } = currentMetrics;

    // Get weights
    const avScore = CVSS3_WEIGHTS.AV[AV];
    const acScore = CVSS3_WEIGHTS.AC[AC];
    const prScore = CVSS3_WEIGHTS.PR[PR][S];
    const uiScore = CVSS3_WEIGHTS.UI[UI];
    const cScore = CVSS3_WEIGHTS.C[C];
    const iScore = CVSS3_WEIGHTS.I[I];
    const aScore = CVSS3_WEIGHTS.A[A];

    // Calculate ISS (Impact Sub Score)
    const iss = 1 - ((1 - cScore) * (1 - iScore) * (1 - aScore));

    // Calculate Impact
    let impact;
    if (S === 'U') {
        impact = 6.42 * iss;
    } else {
        impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    // Calculate Exploitability
    const exploitability = 8.22 * avScore * acScore * prScore * uiScore;

    // Calculate Base Score
    let baseScore;
    if (impact <= 0) {
        baseScore = 0;
    } else {
        if (S === 'U') {
            baseScore = Math.min(impact + exploitability, 10);
        } else {
            baseScore = Math.min(1.08 * (impact + exploitability), 10);
        }
    }

    return roundUp(baseScore);
}

function calculateCVSSv4Score() {
    // CVSS v4 uses a different scoring mechanism (lookup table-based)
    // This is a simplified approximation for demonstration
    const { AV, AC, AT, PR, UI, VC, VI, VA, SC, SI, SA } = currentMetrics;

    // Exploitability metrics weights (approximation)
    const avWeight = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[AV];
    const acWeight = { L: 0.77, H: 0.44 }[AC];
    const atWeight = { N: 1.0, P: 0.8 }[AT];
    const prWeight = { N: 0.85, L: 0.62, H: 0.27 }[PR];
    const uiWeight = { N: 0.85, P: 0.70, A: 0.62 }[UI];

    // Impact metrics weights
    const vcWeight = { N: 0, L: 0.22, H: 0.56 }[VC];
    const viWeight = { N: 0, L: 0.22, H: 0.56 }[VI];
    const vaWeight = { N: 0, L: 0.22, H: 0.56 }[VA];
    const scWeight = { N: 0, L: 0.22, H: 0.56 }[SC];
    const siWeight = { N: 0, L: 0.22, H: 0.56 }[SI];
    const saWeight = { N: 0, L: 0.22, H: 0.56 }[SA];

    // Calculate exploitability (approximation)
    const exploitability = 8.22 * avWeight * acWeight * atWeight * prWeight * uiWeight;

    // Calculate vulnerable system impact
    const vulnImpact = 1 - ((1 - vcWeight) * (1 - viWeight) * (1 - vaWeight));

    // Calculate subsequent system impact
    const subImpact = 1 - ((1 - scWeight) * (1 - siWeight) * (1 - saWeight));

    // Combined impact
    const impact = 6.42 * Math.max(vulnImpact, subImpact);

    // Base score (approximation)
    const baseScore = Math.min(impact + exploitability, 10);

    return roundUp(baseScore);
}

function roundUp(value) {
    return Math.ceil(value * 10) / 10;
}

function getSeverity(score) {
    if (score === 0) return 'None';
    if (score < 4.0) return 'Low';
    if (score < 7.0) return 'Medium';
    if (score < 9.0) return 'High';
    return 'Critical';
}

function convertVector() {
    const targetVersion = currentVersion === 3 ? 4 : 3;
    let convertedMetrics = {};
    let warnings = [];

    if (currentVersion === 3) {
        // Convert v3 to v4
        convertedMetrics.AV = currentMetrics.AV;
        convertedMetrics.AC = currentMetrics.AC;
        convertedMetrics.AT = 'N'; // Default, no equivalent in v3
        convertedMetrics.PR = currentMetrics.PR;

        // User Interaction conversion
        if (currentMetrics.UI === 'N') {
            convertedMetrics.UI = 'N';
        } else {
            convertedMetrics.UI = 'P'; // Passive is default for Required
            warnings.push('UI:R mapped to UI:P (Passive). Consider if UI:A (Active) is more appropriate.');
        }

        // Impact conversion - v4 splits into Vulnerable and Subsequent systems
        if (currentMetrics.S === 'U') {
            // Unchanged scope - all impact to vulnerable system
            convertedMetrics.VC = currentMetrics.C;
            convertedMetrics.VI = currentMetrics.I;
            convertedMetrics.VA = currentMetrics.A;
            convertedMetrics.SC = 'N';
            convertedMetrics.SI = 'N';
            convertedMetrics.SA = 'N';
        } else {
            // Changed scope - split impact
            convertedMetrics.VC = currentMetrics.C;
            convertedMetrics.VI = currentMetrics.I;
            convertedMetrics.VA = currentMetrics.A;
            convertedMetrics.SC = currentMetrics.C;
            convertedMetrics.SI = currentMetrics.I;
            convertedMetrics.SA = currentMetrics.A;
            warnings.push('Scope:Changed mapped to both Vulnerable and Subsequent system impacts. Review appropriateness.');
        }

        warnings.push('AT (Attack Requirements) set to None - no v3 equivalent.');

    } else {
        // Convert v4 to v3
        convertedMetrics.AV = currentMetrics.AV;
        convertedMetrics.AC = currentMetrics.AC;
        convertedMetrics.PR = currentMetrics.PR;

        // User Interaction conversion
        if (currentMetrics.UI === 'N') {
            convertedMetrics.UI = 'N';
        } else {
            convertedMetrics.UI = 'R';
            warnings.push('UI:P or UI:A mapped to UI:R (Required). v3 has less granularity.');
        }

        // Scope determination
        const hasSubsequentImpact = currentMetrics.SC !== 'N' || currentMetrics.SI !== 'N' || currentMetrics.SA !== 'N';
        convertedMetrics.S = hasSubsequentImpact ? 'C' : 'U';

        if (hasSubsequentImpact) {
            warnings.push('Subsequent system impacts detected - Scope set to Changed.');
        }

        // Impact - use maximum of vulnerable and subsequent
        convertedMetrics.C = maxImpact(currentMetrics.VC, currentMetrics.SC);
        convertedMetrics.I = maxImpact(currentMetrics.VI, currentMetrics.SI);
        convertedMetrics.A = maxImpact(currentMetrics.VA, currentMetrics.SA);

        warnings.push('AT (Attack Requirements) metric has no v3 equivalent and was dropped.');
        warnings.push('Impact metrics merged from Vulnerable and Subsequent systems (using maximum).');
    }

    // Generate converted vector
    currentVersion = targetVersion;
    currentMetrics = convertedMetrics;
    const convertedVector = generateVector();

    // Display conversion result
    document.getElementById('converted-vector').textContent = convertedVector;

    const warningDiv = document.getElementById('conversion-warning');
    if (warnings.length > 0) {
        warningDiv.innerHTML = '<strong>⚠️ Conversion Notes:</strong><ul>' +
            warnings.map(w => `<li>${w}</li>`).join('') + '</ul>';
    } else {
        warningDiv.innerHTML = '';
    }

    document.getElementById('conversion-result').style.display = 'block';

    // Update UI to show converted metrics
    switchVersion(targetVersion);
}

function maxImpact(impact1, impact2) {
    const order = { N: 0, L: 1, H: 2 };
    if (order[impact1] >= order[impact2]) {
        return impact1;
    }
    return impact2;
}

function clearAll() {
    document.getElementById('vector-string').value = '';
    document.getElementById('conversion-result').style.display = 'none';
    initializeDefaultMetrics();
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
}

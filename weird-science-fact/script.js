/**
 * Weird Science Fact Generator - Cached Version
 *
 * Security features:
 * - No API keys exposed (facts pre-generated via GitHub Actions)
 * - Content sanitization before display
 * - CSP headers prevent XSS
 * - LocalStorage caching reduces network requests
 * - Global rate limiting via limited cache size
 *
 * Cost control:
 * - Zero cost during user visits (cached facts)
 * - API costs only during scheduled generation
 * - Predictable budget (N facts × cost per fact)
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        dataUrl: 'data/facts.json',
        cacheKey: 'weird-science-cache',
        cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
        historyKey: 'weird-science-history',
        historySize: 20, // Remember last N shown facts
    };

    // State
    let state = {
        data: null,
        history: [],
        currentFact: null,
    };

    // DOM Elements
    const elements = {
        generateBtn: document.getElementById('btn-generate'),
        progressContainer: document.getElementById('progress-container'),
        errorContainer: document.getElementById('error-container'),
        errorMessage: document.getElementById('error-message'),
        factContainer: document.getElementById('fact-container'),
        imageContainer: document.getElementById('image-container'),
        factImage: document.getElementById('fact-image'),
        imageStatus: document.getElementById('image-status'),
        verificationBadge: document.getElementById('verification-badge'),
    };

    /**
     * Initialize the application
     */
    async function init() {
        loadHistory();
        await loadData();
        setupEventListeners();

        // Display a random fact on load
        if (state.data && state.data.facts.length > 0) {
            displayRandomFact();
        }
    }

    /**
     * Load data from cache or fetch from server
     */
    async function loadData() {
        // Try to load from localStorage cache first
        const cached = loadFromCache();
        if (cached) {
            state.data = cached;
            updateLastUpdatedDisplay();
            return;
        }

        // Fetch fresh data
        try {
            showLoading('Loading science facts...');
            const response = await fetch(CONFIG.dataUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            state.data = await response.json();
            saveToCache(state.data);
            updateLastUpdatedDisplay();
            hideLoading();

        } catch (error) {
            console.error('Failed to load data:', error);
            showError('Unable to load science facts. Please refresh the page or try again later.');
        }
    }

    /**
     * Load data from localStorage cache if valid
     */
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CONFIG.cacheKey);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is expired
            if (now - timestamp > CONFIG.cacheExpiry) {
                localStorage.removeItem(CONFIG.cacheKey);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    /**
     * Save data to localStorage cache
     */
    function saveToCache(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
            };
            localStorage.setItem(CONFIG.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    /**
     * Load viewing history from localStorage
     */
    function loadHistory() {
        try {
            const saved = localStorage.getItem(CONFIG.historyKey);
            if (saved) {
                state.history = JSON.parse(saved);
            }
        } catch (error) {
            console.error('History load error:', error);
            state.history = [];
        }
    }

    /**
     * Save viewing history to localStorage
     */
    function saveHistory() {
        try {
            localStorage.setItem(CONFIG.historyKey, JSON.stringify(state.history));
        } catch (error) {
            console.error('History save error:', error);
        }
    }

    /**
     * Add fact ID to history
     */
    function addToHistory(factId) {
        state.history.push(factId);
        // Keep only recent items
        if (state.history.length > CONFIG.historySize) {
            state.history = state.history.slice(-CONFIG.historySize);
        }
        saveHistory();
    }

    /**
     * Get random fact that hasn't been shown recently
     */
    function getRandomFact() {
        if (!state.data || !state.data.facts || state.data.facts.length === 0) {
            return null;
        }

        const facts = state.data.facts;

        // Filter out recently shown facts
        const availableFacts = facts.filter(fact => !state.history.includes(fact.id));

        // If all facts have been shown, reset history for a fresh start
        const factsToChooseFrom = availableFacts.length > 0 ? availableFacts : facts;

        // Clear history if we're starting fresh
        if (availableFacts.length === 0) {
            state.history = [];
        }

        // Get random fact
        const randomIndex = Math.floor(Math.random() * factsToChooseFrom.length);
        const fact = factsToChooseFrom[randomIndex];

        // Add to history
        addToHistory(fact.id);

        return fact;
    }

    /**
     * Display a random fact
     */
    function displayRandomFact() {
        const fact = getRandomFact();

        if (!fact) {
            showError('No facts available. Please check back later.');
            return;
        }

        state.currentFact = fact;

        // Simulate loading for better UX (facts load instantly from cache)
        showSimulatedProgress(() => {
            displayFact(fact);
        });
    }

    /**
     * Display a fact
     */
    function displayFact(fact) {
        hideError();

        // Show verification badge
        elements.verificationBadge.style.display = 'inline-flex';

        // Display fact text
        elements.factContainer.innerHTML = `
            <div class="fact-text">
                ${escapeHtml(fact.text)}
            </div>
            <div class="fact-meta">
                <p><strong>Verification:</strong> ${escapeHtml(fact.verification_note)}</p>
                <p><strong>Confidence:</strong> ${escapeHtml(fact.confidence)}</p>
            </div>
        `;

        // Generate and display placeholder image with the description
        const placeholderImage = createPlaceholderImage(fact.image_description);
        elements.factImage.src = placeholderImage;
        elements.factImage.alt = `Illustration: ${fact.text}`;
        elements.imageStatus.innerHTML = `
            <strong>AI-Generated Image Description:</strong><br>
            ${escapeHtml(fact.image_description)}<br>
            <em class="note">💡 Integrate an image generation API to show actual images (see README.md)</em>
        `;
        elements.imageContainer.style.display = 'block';
    }

    /**
     * Create a placeholder SVG image with description
     */
    function createPlaceholderImage(description) {
        // Properly escape for XML/SVG
        const xmlEscape = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        const escapedDesc = xmlEscape(description);

        const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e2442;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0a0e27;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#grad)"/>
            <text x="400" y="280" font-family="Arial, sans-serif" font-size="20" fill="#00d4ff" text-anchor="middle" font-weight="bold">
                <tspan x="400" dy="0">🎨 Image Placeholder</tspan>
            </text>
            <foreignObject x="50" y="320" width="700" height="250">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 14px; color: #a0aec0; text-align: center; padding: 20px; line-height: 1.6;">
                    <strong style="color: #00d4ff;">AI-Generated Description:</strong><br/><br/>
                    ${escapedDesc}
                </div>
            </foreignObject>
        </svg>`;

        // Use URL encoding instead of base64 to avoid Unicode issues
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    /**
     * Show simulated progress (facts load instantly but we simulate for UX)
     */
    function showSimulatedProgress(callback) {
        elements.progressContainer.style.display = 'flex';
        elements.factContainer.innerHTML = '';
        elements.imageContainer.style.display = 'none';
        elements.verificationBadge.style.display = 'none';

        const steps = [
            { element: document.getElementById('step-1'), delay: 300 },
            { element: document.getElementById('step-2'), delay: 600 },
            { element: document.getElementById('step-3'), delay: 900 },
        ];

        let currentStep = 0;

        function animateStep() {
            if (currentStep >= steps.length) {
                elements.progressContainer.style.display = 'none';
                resetSteps();
                callback();
                return;
            }

            const step = steps[currentStep];
            step.element.classList.add('active');
            step.element.querySelector('.step-status').textContent = 'in progress';

            setTimeout(() => {
                step.element.classList.remove('active');
                step.element.classList.add('completed');
                step.element.querySelector('.step-status').textContent = 'completed';
                currentStep++;
                setTimeout(animateStep, 200);
            }, step.delay);
        }

        animateStep();
    }

    /**
     * Reset progress step indicators
     */
    function resetSteps() {
        const steps = [
            document.getElementById('step-1'),
            document.getElementById('step-2'),
            document.getElementById('step-3'),
        ];

        steps.forEach(step => {
            step.classList.remove('active', 'completed');
            step.querySelector('.step-status').textContent = 'pending';
        });
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        elements.generateBtn.addEventListener('click', () => {
            displayRandomFact();
        });

        // Keyboard shortcut: Space or R to generate new fact
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === ' ' || e.key.toLowerCase() === 'r') {
                e.preventDefault();
                elements.generateBtn.click();
            }
        });
    }

    /**
     * Update last updated display
     */
    function updateLastUpdatedDisplay() {
        if (!state.data || !state.data.metadata) return;

        const lastUpdated = new Date(state.data.metadata.last_updated);
        const factCount = state.data.metadata.total_facts || state.data.facts.length;

        // Update button text or add info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cache-info';
        infoDiv.innerHTML = `
            <small>
                💾 Cache: ${factCount} facts |
                🔄 Updated: ${lastUpdated.toLocaleDateString()}
            </small>
        `;

        const controlsDiv = document.querySelector('.controls');
        const existingInfo = controlsDiv.querySelector('.cache-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        controlsDiv.appendChild(infoDiv);
    }

    /**
     * Show loading message
     */
    function showLoading(message) {
        elements.factContainer.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
    }

    /**
     * Hide loading
     */
    function hideLoading() {
        const loading = elements.factContainer.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * Show error message
     */
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorContainer.style.display = 'flex';
    }

    /**
     * Hide error message
     */
    function hideError() {
        elements.errorContainer.style.display = 'none';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

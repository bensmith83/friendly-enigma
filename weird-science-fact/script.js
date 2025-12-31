/**
 * Weird Science Fact Generator
 *
 * Security features:
 * - Client-side rate limiting (localStorage)
 * - API calls through secure proxy (Cloudflare Worker)
 * - Content sanitization before display
 * - No direct API key exposure
 * - Prompt injection prevention through structured API calls
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        // IMPORTANT: Set this to your Cloudflare Worker URL after deployment
        // Example: 'https://weird-science-fact.your-subdomain.workers.dev'
        apiEndpoint: 'YOUR_CLOUDFLARE_WORKER_URL_HERE',

        // Rate limiting configuration
        rateLimit: {
            maxRequests: 5,              // Max requests per time window
            timeWindow: 60 * 60 * 1000,  // 1 hour in milliseconds
            storageKey: 'weird-science-rate-limit'
        },

        // LocalStorage keys
        storageKeys: {
            rateLimit: 'weird-science-rate-limit',
            lastFact: 'weird-science-last-fact'
        }
    };

    // State
    let state = {
        isGenerating: false,
        currentStep: 0,
        rateLimitData: null
    };

    // DOM Elements
    const elements = {
        generateBtn: document.getElementById('btn-generate'),
        rateLimitInfo: document.getElementById('rate-limit-info'),
        progressContainer: document.getElementById('progress-container'),
        errorContainer: document.getElementById('error-container'),
        errorMessage: document.getElementById('error-message'),
        factContainer: document.getElementById('fact-container'),
        imageContainer: document.getElementById('image-container'),
        factImage: document.getElementById('fact-image'),
        imageStatus: document.getElementById('image-status'),
        verificationBadge: document.getElementById('verification-badge'),
        step1: document.getElementById('step-1'),
        step2: document.getElementById('step-2'),
        step3: document.getElementById('step-3')
    };

    /**
     * Initialize the application
     */
    function init() {
        loadRateLimitData();
        updateRateLimitDisplay();
        setupEventListeners();
        loadLastFact();

        // Check if API endpoint is configured
        if (CONFIG.apiEndpoint === 'YOUR_CLOUDFLARE_WORKER_URL_HERE') {
            showError('⚙️ Configuration needed: Please set up your Cloudflare Worker endpoint in script.js. See README.md for instructions.');
            elements.generateBtn.disabled = true;
        }
    }

    /**
     * Load rate limit data from localStorage
     */
    function loadRateLimitData() {
        try {
            const stored = localStorage.getItem(CONFIG.storageKeys.rateLimit);
            if (stored) {
                state.rateLimitData = JSON.parse(stored);
                // Clean up old requests outside the time window
                const now = Date.now();
                state.rateLimitData.requests = state.rateLimitData.requests.filter(
                    timestamp => now - timestamp < CONFIG.rateLimit.timeWindow
                );
            } else {
                state.rateLimitData = { requests: [] };
            }
        } catch (error) {
            console.error('Error loading rate limit data:', error);
            state.rateLimitData = { requests: [] };
        }
    }

    /**
     * Save rate limit data to localStorage
     */
    function saveRateLimitData() {
        try {
            localStorage.setItem(
                CONFIG.storageKeys.rateLimit,
                JSON.stringify(state.rateLimitData)
            );
        } catch (error) {
            console.error('Error saving rate limit data:', error);
        }
    }

    /**
     * Check if rate limit is exceeded
     */
    function isRateLimited() {
        const now = Date.now();
        const recentRequests = state.rateLimitData.requests.filter(
            timestamp => now - timestamp < CONFIG.rateLimit.timeWindow
        );
        return recentRequests.length >= CONFIG.rateLimit.maxRequests;
    }

    /**
     * Record a new request
     */
    function recordRequest() {
        state.rateLimitData.requests.push(Date.now());
        saveRateLimitData();
    }

    /**
     * Get time until rate limit resets
     */
    function getTimeUntilReset() {
        if (state.rateLimitData.requests.length === 0) {
            return 0;
        }
        const oldestRequest = Math.min(...state.rateLimitData.requests);
        const resetTime = oldestRequest + CONFIG.rateLimit.timeWindow;
        const now = Date.now();
        return Math.max(0, resetTime - now);
    }

    /**
     * Update rate limit display
     */
    function updateRateLimitDisplay() {
        const now = Date.now();
        const recentRequests = state.rateLimitData.requests.filter(
            timestamp => now - timestamp < CONFIG.rateLimit.timeWindow
        );
        const remaining = CONFIG.rateLimit.maxRequests - recentRequests.length;

        if (remaining <= 0) {
            const timeUntilReset = getTimeUntilReset();
            const minutes = Math.ceil(timeUntilReset / (60 * 1000));
            elements.rateLimitInfo.textContent = `⏳ Rate limit reached. Reset in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
            elements.rateLimitInfo.className = 'rate-limit-info error';
        } else if (remaining <= 2) {
            elements.rateLimitInfo.textContent = `⚠️ ${remaining} request${remaining !== 1 ? 's' : ''} remaining this hour`;
            elements.rateLimitInfo.className = 'rate-limit-info warning';
        } else {
            elements.rateLimitInfo.textContent = `✓ ${remaining} requests remaining this hour`;
            elements.rateLimitInfo.className = 'rate-limit-info';
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        elements.generateBtn.addEventListener('click', handleGenerate);
    }

    /**
     * Handle generate button click
     */
    async function handleGenerate() {
        // Check rate limit
        if (isRateLimited()) {
            const timeUntilReset = getTimeUntilReset();
            const minutes = Math.ceil(timeUntilReset / (60 * 1000));
            showError(`You've reached the rate limit of ${CONFIG.rateLimit.maxRequests} requests per hour. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`);
            return;
        }

        // Start generation process
        state.isGenerating = true;
        elements.generateBtn.disabled = true;
        hideError();
        hideContent();
        showProgress();

        try {
            // Record this request
            recordRequest();
            updateRateLimitDisplay();

            // Step 1: Generate weird science fact
            setStepActive(1);
            const fact = await generateWeirdFact();
            setStepCompleted(1);

            // Step 2: Fact-check the claim
            setStepActive(2);
            const verification = await verifyFact(fact);
            setStepCompleted(2);

            // Only proceed to image generation if fact is verified
            if (!verification.isTrue) {
                showError(`Fact-check failed: ${verification.reason}. The generated fact was not scientifically accurate. Please try again.`);
                resetProgress();
                return;
            }

            // Step 3: Generate image
            setStepActive(3);
            const imageUrl = await generateImage(fact);
            setStepCompleted(3);

            // Display results
            displayResults(fact, verification, imageUrl);

            // Save to localStorage for reload
            saveLastFact({ fact, verification, imageUrl });

        } catch (error) {
            console.error('Generation error:', error);
            showError(`Error: ${error.message || 'Failed to generate science fact. Please try again.'}`);
            resetProgress();
        } finally {
            state.isGenerating = false;
            elements.generateBtn.disabled = false;
        }
    }

    /**
     * Call API endpoint
     */
    async function callAPI(endpoint, data) {
        const response = await fetch(`${CONFIG.apiEndpoint}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Generate a weird science fact
     */
    async function generateWeirdFact() {
        const result = await callAPI('/generate-fact', {
            timestamp: Date.now() // Helps prevent caching
        });
        return result.fact;
    }

    /**
     * Verify if the fact is true
     */
    async function verifyFact(fact) {
        const result = await callAPI('/verify-fact', {
            fact: fact
        });
        return {
            isTrue: result.isTrue,
            confidence: result.confidence,
            reason: result.reason
        };
    }

    /**
     * Generate an image for the fact
     */
    async function generateImage(fact) {
        const result = await callAPI('/generate-image', {
            fact: fact
        });
        return result.imageUrl;
    }

    /**
     * Set step as active
     */
    function setStepActive(stepNumber) {
        const step = stepNumber === 1 ? elements.step1 : stepNumber === 2 ? elements.step2 : elements.step3;
        step.classList.add('active');
        step.classList.remove('completed');
        const status = step.querySelector('.step-status');
        status.textContent = 'in progress';
    }

    /**
     * Set step as completed
     */
    function setStepCompleted(stepNumber) {
        const step = stepNumber === 1 ? elements.step1 : stepNumber === 2 ? elements.step2 : elements.step3;
        step.classList.remove('active');
        step.classList.add('completed');
        const status = step.querySelector('.step-status');
        status.textContent = 'completed';
    }

    /**
     * Reset progress indicators
     */
    function resetProgress() {
        [elements.step1, elements.step2, elements.step3].forEach(step => {
            step.classList.remove('active', 'completed');
            const status = step.querySelector('.step-status');
            status.textContent = 'pending';
        });
        elements.progressContainer.style.display = 'none';
    }

    /**
     * Show progress container
     */
    function showProgress() {
        elements.progressContainer.style.display = 'flex';
        resetProgress();
    }

    /**
     * Hide all content areas
     */
    function hideContent() {
        elements.factContainer.innerHTML = '';
        elements.imageContainer.style.display = 'none';
        elements.verificationBadge.style.display = 'none';
    }

    /**
     * Display results
     */
    function displayResults(fact, verification, imageUrl) {
        // Hide progress
        elements.progressContainer.style.display = 'none';

        // Show verification badge
        elements.verificationBadge.style.display = 'inline-flex';

        // Display fact
        elements.factContainer.innerHTML = `
            <div class="fact-text">
                ${escapeHtml(fact)}
            </div>
            <div class="fact-meta">
                <p><strong>Verification:</strong> ${escapeHtml(verification.reason)}</p>
                <p><strong>Confidence:</strong> ${escapeHtml(verification.confidence)}</p>
            </div>
        `;

        // Display image
        if (imageUrl) {
            elements.factImage.src = imageUrl;
            elements.factImage.alt = `Illustration of: ${fact}`;
            elements.imageStatus.textContent = '🎨 AI-generated illustration';
            elements.imageContainer.style.display = 'block';
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

    /**
     * Save last fact to localStorage
     */
    function saveLastFact(data) {
        try {
            localStorage.setItem(CONFIG.storageKeys.lastFact, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving last fact:', error);
        }
    }

    /**
     * Load last fact from localStorage
     */
    function loadLastFact() {
        try {
            const stored = localStorage.getItem(CONFIG.storageKeys.lastFact);
            if (stored) {
                const data = JSON.parse(stored);
                // Only show if it's relatively recent (within 24 hours)
                const age = Date.now() - (data.timestamp || 0);
                if (age < 24 * 60 * 60 * 1000) {
                    displayResults(data.fact, data.verification, data.imageUrl);
                }
            }
        } catch (error) {
            console.error('Error loading last fact:', error);
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

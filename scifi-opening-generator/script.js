/**
 * Sci-Fi Opening Generator
 * Displays random cached sci-fi openings and endings
 * with local storage caching to reduce network requests
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        dataUrl: 'data/openings.json',
        cacheKey: 'scifi-generator-cache',
        cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        historyKey: 'scifi-generator-history',
        historySize: 10 // Remember last N shown items to avoid repetition
    };

    // State
    let state = {
        data: null,
        mode: 'opening', // 'opening' or 'ending'
        history: []
    };

    // DOM Elements
    const elements = {
        storyText: document.getElementById('story-text'),
        storyMeta: document.getElementById('story-meta'),
        btnOpening: document.getElementById('btn-opening'),
        btnEnding: document.getElementById('btn-ending'),
        btnRefresh: document.getElementById('btn-refresh')
    };

    /**
     * Initialize the application
     */
    async function init() {
        loadHistory();
        await loadData();
        setupEventListeners();
        displayRandomStory();
    }

    /**
     * Load data from cache or fetch from server
     */
    async function loadData() {
        // Try to load from localStorage cache first
        const cached = loadFromCache();
        if (cached) {
            state.data = cached;
            return;
        }

        // Fetch fresh data
        try {
            const response = await fetch(CONFIG.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            state.data = await response.json();
            saveToCache(state.data);
        } catch (error) {
            console.error('Failed to load data:', error);
            showError('Unable to load stories. Please try again later.');
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
                timestamp: Date.now()
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
     * Add item to history
     */
    function addToHistory(key) {
        state.history.push(key);
        // Keep only recent items
        if (state.history.length > CONFIG.historySize) {
            state.history = state.history.slice(-CONFIG.historySize);
        }
        saveHistory();
    }

    /**
     * Get random item that hasn't been shown recently
     */
    function getRandomItem(items) {
        if (!items || items.length === 0) return null;

        // Filter out recently shown items
        const availableItems = items.filter((item, index) => {
            const key = `${state.mode}-${index}`;
            return !state.history.includes(key);
        });

        // If all items have been shown, reset history for this mode
        const itemsToChooseFrom = availableItems.length > 0 ? availableItems : items;

        // Get random item
        const randomIndex = Math.floor(Math.random() * itemsToChooseFrom.length);
        const item = itemsToChooseFrom[randomIndex];

        // Find original index for history tracking
        const originalIndex = items.indexOf(item);
        addToHistory(`${state.mode}-${originalIndex}`);

        return item;
    }

    /**
     * Display a random story
     */
    function displayRandomStory() {
        if (!state.data) {
            showError('No stories available.');
            return;
        }

        const items = state.mode === 'opening'
            ? state.data.openings
            : state.data.endings;

        const story = getRandomItem(items);

        if (!story) {
            showError('No stories available for this category.');
            return;
        }

        // Fade out current content
        elements.storyText.classList.add('fade-out');
        elements.storyText.classList.remove('fade-in');

        setTimeout(() => {
            // Update content
            renderStory(story);

            // Fade in new content
            elements.storyText.classList.remove('fade-out');
            elements.storyText.classList.add('fade-in');
        }, 300);
    }

    /**
     * Render story content
     */
    function renderStory(story) {
        // Split text into paragraphs
        const paragraphs = story.text
            .split('\n\n')
            .filter(p => p.trim())
            .map(p => `<p>${escapeHtml(p.trim())}</p>`)
            .join('');

        elements.storyText.innerHTML = paragraphs;

        // Render metadata
        const typeClass = story.type === 'ending' ? 'ending' : '';
        const typeLabel = story.type === 'ending' ? 'Ending' : 'Opening';

        // Handle both old format (single string) and new format (arrays)
        let inspirationText;
        if (Array.isArray(story.inspired_by)) {
            // New format: multiple inspirations
            const titles = story.inspired_by.map(t => `<em>${escapeHtml(t)}</em>`);
            inspirationText = `Inspired by ${titles.slice(0, -1).join(', ')}${titles.length > 1 ? ' & ' : ''}${titles[titles.length - 1]}`;
        } else {
            // Old format: single inspiration
            inspirationText = `Inspired by <em>${escapeHtml(story.inspired_by)}</em> by ${escapeHtml(story.author)}`;
        }

        elements.storyMeta.innerHTML = `
            <span class="inspiration">
                ${inspirationText}
            </span>
            <span class="type-badge ${typeClass}">${typeLabel}</span>
        `;
    }

    /**
     * Show error message
     */
    function showError(message) {
        elements.storyText.innerHTML = `<p class="loading">${escapeHtml(message)}</p>`;
        elements.storyMeta.innerHTML = '';
    }

    /**
     * Escape HTML special characters
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        elements.btnOpening.addEventListener('click', () => {
            if (state.mode !== 'opening') {
                state.mode = 'opening';
                updateModeButtons();
                displayRandomStory();
            }
        });

        elements.btnEnding.addEventListener('click', () => {
            if (state.mode !== 'ending') {
                state.mode = 'ending';
                updateModeButtons();
                displayRandomStory();
            }
        });

        elements.btnRefresh.addEventListener('click', () => {
            displayRandomStory();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'o':
                case 'O':
                    elements.btnOpening.click();
                    break;
                case 'e':
                case 'E':
                    elements.btnEnding.click();
                    break;
                case ' ':
                case 'r':
                case 'R':
                    e.preventDefault();
                    elements.btnRefresh.click();
                    break;
            }
        });
    }

    /**
     * Update mode button states
     */
    function updateModeButtons() {
        const isOpening = state.mode === 'opening';

        elements.btnOpening.classList.toggle('active', isOpening);
        elements.btnEnding.classList.toggle('active', !isOpening);

        elements.btnOpening.setAttribute('aria-pressed', isOpening);
        elements.btnEnding.setAttribute('aria-pressed', !isOpening);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

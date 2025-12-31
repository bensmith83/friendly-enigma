/**
 * Cloudflare Worker for Weird Science Fact Generator
 *
 * This worker acts as a secure API proxy that:
 * - Protects API keys from client exposure
 * - Implements server-side rate limiting
 * - Prevents prompt injection attacks
 * - Makes structured LLM API calls
 *
 * Deploy this to Cloudflare Workers and set the URL in your frontend
 */

// Configuration - Set these as environment variables in Cloudflare Workers
const CONFIG = {
    CLAUDE_API_KEY: '', // Set via Cloudflare Workers environment variable
    ALLOWED_ORIGINS: [
        'https://bensmith83.github.io',
        'http://localhost:3000', // For local development
        'http://127.0.0.1:3000'
    ],
    RATE_LIMIT: {
        MAX_REQUESTS: 5,
        WINDOW_MS: 60 * 60 * 1000 // 1 hour
    }
};

/**
 * Main request handler
 */
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming request
 */
async function handleRequest(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return handleCORS();
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Verify origin
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) {
        return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Extract client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     'unknown';

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
        return jsonResponse({
            error: 'Rate limit exceeded',
            resetIn: rateLimitCheck.resetIn
        }, 429);
    }

    // Route request
    const url = new URL(request.url);
    const path = url.pathname;

    try {
        let response;

        if (path === '/generate-fact') {
            response = await generateFact();
        } else if (path === '/verify-fact') {
            const body = await request.json();
            response = await verifyFact(body.fact);
        } else if (path === '/generate-image') {
            const body = await request.json();
            response = await generateImage(body.fact);
        } else {
            return jsonResponse({ error: 'Not found' }, 404);
        }

        return jsonResponse(response, 200, origin);

    } catch (error) {
        console.error('Handler error:', error);
        return jsonResponse({
            error: error.message || 'Internal server error'
        }, 500);
    }
}

/**
 * Generate a weird science fact using Claude
 */
async function generateFact() {
    const prompt = `Generate a single weird but TRUE science fact. The fact should be:
- Bizarre, unexpected, or counter-intuitive
- Scientifically accurate and verifiable
- About any field of science (biology, physics, chemistry, astronomy, etc.)
- Stated in 1-2 sentences
- Interesting and engaging

Return ONLY the fact, nothing else. No preamble, no explanation.`;

    const response = await callClaude(prompt, {
        max_tokens: 200,
        temperature: 0.9
    });

    return {
        fact: response.content[0].text.trim()
    };
}

/**
 * Verify if a fact is scientifically accurate
 * This uses a separate Claude call WITHOUT the original prompt context
 * to provide independent fact-checking
 */
async function verifyFact(fact) {
    // Sanitize input to prevent prompt injection
    const sanitizedFact = sanitizeInput(fact);

    const prompt = `You are a scientific fact-checker. Evaluate the following claim for scientific accuracy:

"${sanitizedFact}"

Analyze this claim and respond with:
1. Whether it is TRUE or FALSE
2. Your confidence level (High/Medium/Low)
3. A brief explanation (1-2 sentences)

Format your response as:
VERDICT: [TRUE/FALSE]
CONFIDENCE: [High/Medium/Low]
REASON: [Your explanation]`;

    const response = await callClaude(prompt, {
        max_tokens: 300,
        temperature: 0.3 // Lower temperature for more consistent fact-checking
    });

    const text = response.content[0].text;

    // Parse response
    const verdictMatch = text.match(/VERDICT:\s*(TRUE|FALSE)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(High|Medium|Low)/i);
    const reasonMatch = text.match(/REASON:\s*(.+?)(?:\n|$)/i);

    return {
        isTrue: verdictMatch ? verdictMatch[1].toUpperCase() === 'TRUE' : false,
        confidence: confidenceMatch ? confidenceMatch[1] : 'Unknown',
        reason: reasonMatch ? reasonMatch[1].trim() : 'Could not parse verification response'
    };
}

/**
 * Generate an image description and placeholder
 *
 * NOTE: Claude API doesn't generate images directly. This function:
 * 1. Generates a detailed image description using Claude
 * 2. Returns a placeholder or data URI
 *
 * To use actual image generation:
 * - Integrate with DALL-E, Stable Diffusion, or similar API
 * - Replace the placeholder return with actual API call
 */
async function generateImage(fact) {
    const sanitizedFact = sanitizeInput(fact);

    const prompt = `Create a detailed visual description for an illustration of this science fact:

"${sanitizedFact}"

Describe what the image should show in vivid detail (2-3 sentences). Focus on visual elements, colors, composition, and style. Make it suitable for a science illustration.`;

    const response = await callClaude(prompt, {
        max_tokens: 200,
        temperature: 0.7
    });

    const imageDescription = response.content[0].text.trim();

    // TODO: Replace this with actual image generation API call
    // For example, integrate with:
    // - DALL-E API: https://platform.openai.com/docs/guides/images
    // - Stability AI: https://platform.stability.ai/
    // - Replicate: https://replicate.com/

    // For now, return a placeholder data URI with the description
    const placeholderSvg = createPlaceholderImage(imageDescription);

    return {
        imageUrl: placeholderSvg,
        description: imageDescription,
        note: 'Replace this placeholder with actual image generation API'
    };
}

/**
 * Call Claude API
 */
async function callClaude(prompt, options = {}) {
    const apiKey = CLAUDE_API_KEY || (typeof CLAUDE_API_KEY_ENV !== 'undefined' ? CLAUDE_API_KEY_ENV : '');

    if (!apiKey) {
        throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: options.max_tokens || 1024,
            temperature: options.temperature || 0.7,
            messages: [{
                role: 'user',
                content: prompt
            }]
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    return await response.json();
}

/**
 * Create a placeholder SVG image with text
 */
function createPlaceholderImage(description) {
    const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="#1e2442"/>
        <text x="400" y="280" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" text-anchor="middle">
            <tspan x="400" dy="0">🎨 Image Generation Placeholder</tspan>
            <tspan x="400" dy="30">Configure an image generation API to display actual images</tspan>
        </text>
        <text x="400" y="350" font-family="Arial, sans-serif" font-size="14" fill="#a0aec0" text-anchor="middle">
            <tspan x="400" dy="0">Suggested illustration:</tspan>
        </text>
        <foreignObject x="100" y="380" width="600" height="180">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 13px; color: #a0aec0; text-align: center; padding: 10px;">
                ${escapeHtml(description)}
            </div>
        </foreignObject>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Sanitize input to prevent prompt injection
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove potential prompt injection patterns
    return input
        .replace(/```/g, '')  // Remove code blocks
        .replace(/\[INST\]/gi, '') // Remove instruction markers
        .replace(/\[\/INST\]/gi, '')
        .replace(/<\|.*?\|>/g, '') // Remove special tokens
        .slice(0, 1000); // Limit length
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin) {
    if (!origin) return false;
    return CONFIG.ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

/**
 * Rate limiting using Cloudflare Workers KV or Durable Objects
 * This is a simplified in-memory version - for production, use KV or Durable Objects
 */
const rateLimitStore = new Map();

async function checkRateLimit(clientIP) {
    const now = Date.now();
    const key = `ratelimit:${clientIP}`;

    // Get existing records
    let records = rateLimitStore.get(key) || [];

    // Filter out old records
    records = records.filter(timestamp => now - timestamp < CONFIG.RATE_LIMIT.WINDOW_MS);

    // Check limit
    if (records.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
        const oldestRecord = Math.min(...records);
        const resetIn = Math.ceil((oldestRecord + CONFIG.RATE_LIMIT.WINDOW_MS - now) / 1000);
        return { allowed: false, resetIn };
    }

    // Add new record
    records.push(now);
    rateLimitStore.set(key, records);

    return { allowed: true, remaining: CONFIG.RATE_LIMIT.MAX_REQUESTS - records.length };
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        }
    });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200, origin = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    return new Response(JSON.stringify(data), { status, headers });
}

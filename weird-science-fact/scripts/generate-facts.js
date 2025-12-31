#!/usr/bin/env node

/**
 * Science Fact Generator Script
 *
 * Generates weird science facts using Claude API with built-in:
 * - Fact generation
 * - Independent fact-checking
 * - Image description generation
 * - Rate limiting via fact count
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your_key FACT_COUNT=50 node generate-facts.js
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    FACT_COUNT: parseInt(process.env.FACT_COUNT || '50', 10),
    MODEL: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5', // Latest Sonnet 4.5 - best balance
    OUTPUT_FILE: path.join(__dirname, '../data/facts.json'),
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    MAX_CONSECUTIVE_FAILURES: 5, // Stop after 5 consecutive failures
};

// Validate configuration
if (!CONFIG.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: CONFIG.ANTHROPIC_API_KEY,
});

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Claude API with retry logic
 */
async function callClaude(prompt, options = {}) {
    const defaultOptions = {
        model: CONFIG.MODEL,
        max_tokens: 1024,
        temperature: 0.7,
    };

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
        try {
            const response = await anthropic.messages.create({
                ...defaultOptions,
                ...options,
                messages: [{ role: 'user', content: prompt }],
            });

            return response.content[0].text;
        } catch (error) {
            console.error(`  ⚠️  Attempt ${attempt}/${CONFIG.MAX_RETRIES} failed:`, error.message);

            if (attempt < CONFIG.MAX_RETRIES) {
                const delay = CONFIG.RETRY_DELAY * attempt;
                console.log(`  ⏳ Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }
}

/**
 * Generate a single weird science fact
 */
async function generateFact() {
    const prompt = `Generate a single weird but TRUE science fact. The fact should be:
- Bizarre, unexpected, or counter-intuitive
- Scientifically accurate and verifiable
- About any field of science (biology, physics, chemistry, astronomy, geology, etc.)
- Stated in 2-3 sentences maximum
- Interesting and engaging
- NOT about common knowledge (e.g., not "water boils at 100°C")

Return ONLY the fact, nothing else. No preamble, no explanation, no meta-commentary.`;

    const response = await callClaude(prompt, {
        max_tokens: 250,
        temperature: 0.9, // Higher temperature for creativity
    });

    return response.trim();
}

/**
 * Verify if a fact is scientifically accurate
 */
async function verifyFact(fact) {
    const prompt = `You are a scientific fact-checker. Evaluate the following claim for scientific accuracy:

"${fact}"

Analyze this claim and respond ONLY in this exact format:
VERDICT: [TRUE or FALSE]
CONFIDENCE: [High, Medium, or Low]
REASON: [One sentence explanation]

Do not include any other text or commentary.`;

    const response = await callClaude(prompt, {
        max_tokens: 300,
        temperature: 0.3, // Lower temperature for consistent fact-checking
    });

    // Parse response
    const verdictMatch = response.match(/VERDICT:\s*(TRUE|FALSE)/i);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(High|Medium|Low)/i);
    const reasonMatch = response.match(/REASON:\s*(.+?)(?:\n|$)/is);

    return {
        isTrue: verdictMatch ? verdictMatch[1].toUpperCase() === 'TRUE' : false,
        confidence: confidenceMatch ? confidenceMatch[1] : 'Unknown',
        reason: reasonMatch ? reasonMatch[1].trim() : 'Could not parse verification response',
    };
}

/**
 * Generate an image description
 */
async function generateImageDescription(fact) {
    const prompt = `Create a detailed visual description for an illustration of this science fact:

"${fact}"

Describe what the image should show in vivid detail (3-4 sentences). Focus on:
- Visual elements and composition
- Colors and lighting
- Style (scientific illustration, surreal, photorealistic, etc.)
- Specific details that make it engaging

Return ONLY the description, no preamble.`;

    const response = await callClaude(prompt, {
        max_tokens: 250,
        temperature: 0.7,
    });

    return response.trim();
}

/**
 * Generate SVG artwork based on description
 */
async function generateSVG(description, fact) {
    const prompt = `Create an SVG image (800x600) that illustrates this concept:

Description: "${description}"

Science fact: "${fact}"

Requirements:
- Create a complete, valid SVG with width="800" height="600" viewBox="0 0 800 600"
- Use creative visual elements, gradients, and colors
- Make it visually interesting and scientifically themed
- Include relevant shapes, icons, or abstract representations
- Use a color palette that fits the theme
- No text/labels needed (the fact will be displayed separately)
- Make sure to include xmlns="http://www.w3.org/2000/svg"

Return ONLY the complete SVG code starting with <svg and ending with </svg>. No explanation or markdown.`;

    const response = await callClaude(prompt, {
        max_tokens: 4000, // Increased to ensure SVGs don't get cut off
        temperature: 0.8, // Higher creativity for artwork
    });

    // Extract SVG code (in case Claude adds any preamble)
    let svgMatch = response.match(/<svg[\s\S]*?<\/svg>/i);
    let svg = svgMatch ? svgMatch[0] : response.trim();

    // Validate SVG is complete
    if (!svg.includes('</svg>')) {
        throw new Error('SVG generation incomplete - missing closing tag. Try increasing max_tokens or regenerating.');
    }

    // Ensure SVG has proper width/height attributes (not just viewBox)
    if (!svg.includes('width=')) {
        svg = svg.replace('<svg', '<svg width="800" height="600"');
    }

    return svg;
}

/**
 * Generate a single complete fact entry
 */
async function generateFactEntry(id) {
    console.log(`\n🔬 Generating fact ${id}...`);

    // Step 1: Generate fact
    console.log('  1️⃣  Generating weird science fact...');
    const fact = await generateFact();
    console.log(`  ✅ Generated: "${fact.substring(0, 80)}..."`);

    // Small delay to avoid rate limiting
    await sleep(1000);

    // Step 2: Verify fact
    console.log('  2️⃣  Fact-checking...');
    const verification = await verifyFact(fact);
    console.log(`  ✅ Verdict: ${verification.isTrue ? 'TRUE' : 'FALSE'} (${verification.confidence} confidence)`);

    // Only generate image description if fact is verified
    if (!verification.isTrue) {
        console.log(`  ⚠️  Skipping (failed fact-check): ${verification.reason}`);
        return null;
    }

    // Small delay
    await sleep(1000);

    // Step 3: Generate image description
    console.log('  3️⃣  Generating image description...');
    const imageDescription = await generateImageDescription(fact);
    console.log(`  ✅ Image description generated`);

    // Small delay
    await sleep(1000);

    // Step 4: Generate SVG artwork
    console.log('  4️⃣  Generating SVG artwork...');
    const svgCode = await generateSVG(imageDescription, fact);
    console.log(`  ✅ SVG artwork generated (${svgCode.length} characters)`);

    return {
        id,
        text: fact,
        verified: verification.isTrue,
        confidence: verification.confidence,
        verification_note: verification.reason,
        image_description: imageDescription,
        image_svg: svgCode,
        generated_at: new Date().toISOString(),
    };
}

/**
 * Main function
 */
async function main() {
    console.log('🧪 Weird Science Fact Generator');
    console.log('================================\n');
    console.log(`📊 Target: ${CONFIG.FACT_COUNT} verified facts`);
    console.log(`🤖 Model: ${CONFIG.MODEL}`);
    console.log(`💾 Output: ${CONFIG.OUTPUT_FILE}\n`);

    const facts = [];
    let attempts = 0;
    let consecutiveFailures = 0;
    const maxAttempts = CONFIG.FACT_COUNT * 2; // Allow for some failures

    while (facts.length < CONFIG.FACT_COUNT && attempts < maxAttempts) {
        attempts++;

        try {
            const factEntry = await generateFactEntry(facts.length + 1);

            if (factEntry) {
                facts.push(factEntry);
                consecutiveFailures = 0; // Reset on success
                console.log(`✅ Progress: ${facts.length}/${CONFIG.FACT_COUNT} facts generated\n`);
            } else {
                consecutiveFailures++;
                console.log(`⚠️  Fact rejected (${consecutiveFailures} consecutive failures), retrying...\n`);
            }

            // Rate limiting: small delay between facts
            if (facts.length < CONFIG.FACT_COUNT) {
                await sleep(2000);
            }

        } catch (error) {
            consecutiveFailures++;
            console.error(`❌ Error generating fact:`, error.message);

            // Check if error is a model/API issue (not a transient failure)
            if (error.message.includes('not_found_error') || error.message.includes('404')) {
                console.error(`\n💥 FATAL: Model not found or API key doesn't have access to ${CONFIG.MODEL}`);
                console.error(`Please check:`);
                console.error(`  1. Your API key is valid and has credits`);
                console.error(`  2. You have access to the model: ${CONFIG.MODEL}`);
                console.error(`  3. Try using a different model (e.g., claude-3-haiku-20240307)\n`);
                process.exit(1);
            }

            console.log(`⚠️  Continuing with next fact (${consecutiveFailures} consecutive failures)...\n`);
            await sleep(3000);
        }

        // Stop if too many consecutive failures
        if (consecutiveFailures >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
            console.error(`\n💥 STOPPING: ${consecutiveFailures} consecutive failures detected`);
            console.error(`This likely indicates a persistent API or configuration issue.`);
            console.error(`Generated ${facts.length} facts before stopping.\n`);
            break;
        }
    }

    if (facts.length < CONFIG.FACT_COUNT) {
        console.warn(`\n⚠️  Warning: Only generated ${facts.length}/${CONFIG.FACT_COUNT} facts after ${attempts} attempts`);
    }

    // Don't save empty cache
    if (facts.length === 0) {
        console.error('\n💥 FATAL: No facts were generated successfully');
        console.error('The workflow will not update the cache to avoid breaking the site.\n');
        process.exit(1);
    }

    // Create output data
    const output = {
        facts,
        metadata: {
            total_facts: facts.length,
            last_updated: new Date().toISOString(),
            version: '1.0',
            generator: 'Claude API',
            model: CONFIG.MODEL,
        },
    };

    // Write to file
    console.log(`\n💾 Writing to ${CONFIG.OUTPUT_FILE}...`);
    await fs.writeFile(
        CONFIG.OUTPUT_FILE,
        JSON.stringify(output, null, 2),
        'utf-8'
    );

    console.log('\n✅ Done!');
    console.log(`📊 Total facts generated: ${facts.length}`);
    console.log(`📁 Output file: ${CONFIG.OUTPUT_FILE}`);
    console.log(`💰 Estimated API calls: ${attempts * 3} (${attempts} facts × 3 calls each)`);
}

// Run main function
main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});

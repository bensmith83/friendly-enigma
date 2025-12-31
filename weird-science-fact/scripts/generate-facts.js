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
 *   CLAUDE_API_KEY=your_key FACT_COUNT=50 node generate-facts.js
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    FACT_COUNT: parseInt(process.env.FACT_COUNT || '50', 10),
    MODEL: 'claude-3-5-sonnet-20241022',
    OUTPUT_FILE: path.join(__dirname, '../data/facts.json'),
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
};

// Validate configuration
if (!CONFIG.CLAUDE_API_KEY) {
    console.error('❌ Error: CLAUDE_API_KEY environment variable is required');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: CONFIG.CLAUDE_API_KEY,
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

    return {
        id,
        text: fact,
        verified: verification.isTrue,
        confidence: verification.confidence,
        verification_note: verification.reason,
        image_description: imageDescription,
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
    const maxAttempts = CONFIG.FACT_COUNT * 2; // Allow for some failures

    while (facts.length < CONFIG.FACT_COUNT && attempts < maxAttempts) {
        attempts++;

        try {
            const factEntry = await generateFactEntry(facts.length + 1);

            if (factEntry) {
                facts.push(factEntry);
                console.log(`✅ Progress: ${facts.length}/${CONFIG.FACT_COUNT} facts generated\n`);
            } else {
                console.log(`⚠️  Fact rejected, retrying...\n`);
            }

            // Rate limiting: small delay between facts
            if (facts.length < CONFIG.FACT_COUNT) {
                await sleep(2000);
            }

        } catch (error) {
            console.error(`❌ Error generating fact:`, error.message);
            console.log(`⚠️  Continuing with next fact...\n`);
            await sleep(3000);
        }
    }

    if (facts.length < CONFIG.FACT_COUNT) {
        console.warn(`\n⚠️  Warning: Only generated ${facts.length}/${CONFIG.FACT_COUNT} facts after ${attempts} attempts`);
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

#!/usr/bin/env node

/**
 * Fix SVG Dimensions Script
 *
 * Adds width="800" height="600" attributes to all SVGs in facts.json
 * that are missing them.
 */

const fs = require('fs').promises;
const path = require('path');

const FACTS_FILE = path.join(__dirname, '../data/facts.json');

async function fixSVGDimensions() {
    console.log('🔧 Fixing SVG dimensions in facts.json...\n');

    // Read current facts
    const fileContent = await fs.readFile(FACTS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);

    let fixedCount = 0;
    let totalSVGs = 0;

    // Process each fact
    data.facts.forEach((fact, index) => {
        if (!fact.image_svg) return;

        totalSVGs++;
        const originalSVG = fact.image_svg;

        // Check if width/height are already present in the <svg> tag
        const svgTagMatch = originalSVG.match(/<svg[^>]*>/i);
        if (!svgTagMatch) {
            console.log(`⚠️  Fact #${fact.id} has invalid SVG`);
            return;
        }

        const svgTag = svgTagMatch[0];
        const hasWidth = /width\s*=/.test(svgTag);
        const hasHeight = /height\s*=/.test(svgTag);

        if (!hasWidth || !hasHeight) {
            // Add width and height attributes after <svg
            let fixedSVG = originalSVG.replace(
                /<svg/i,
                '<svg width="800" height="600"'
            );

            fact.image_svg = fixedSVG;
            fixedCount++;
            console.log(`✅ Fixed fact #${fact.id} (index ${index})`);
        } else {
            console.log(`⏭️  Fact #${fact.id} already has dimensions`);
        }
    });

    // Write back to file
    await fs.writeFile(
        FACTS_FILE,
        JSON.stringify(data, null, 2),
        'utf-8'
    );

    console.log(`\n✅ Done!`);
    console.log(`📊 Total SVGs: ${totalSVGs}`);
    console.log(`🔧 Fixed: ${fixedCount}`);
    console.log(`⏭️  Already correct: ${totalSVGs - fixedCount}`);
    console.log(`💾 Updated: ${FACTS_FILE}`);
}

// Run
fixSVGDimensions().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});

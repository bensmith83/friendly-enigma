// Main script for tab navigation and utilities

document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    checkWebAssemblySupport();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function checkWebAssemblySupport() {
    if (typeof WebAssembly !== 'object') {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff4444;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 9999;
            font-weight: bold;
        `;
        warning.textContent = '⚠️ WebAssembly is not supported in your browser. Please use a modern browser.';
        document.body.prepend(warning);
    }
}

// Utility functions for demos

function formatTime(ms) {
    if (ms < 1) {
        return `${(ms * 1000).toFixed(2)} μs`;
    } else if (ms < 1000) {
        return `${ms.toFixed(2)} ms`;
    } else {
        return `${(ms / 1000).toFixed(2)} s`;
    }
}

function calculateSpeedup(jsTime, wasmTime) {
    if (wasmTime === 0) return '∞';
    const speedup = jsTime / wasmTime;
    return `${speedup.toFixed(2)}x`;
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<span class="loading"></span>';
    }
}

function showError(message) {
    console.error(message);
    alert(`Error: ${message}`);
}

// Performance measurement wrapper
function measurePerformance(fn, name = 'Operation') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;
    console.log(`${name} took ${formatTime(duration)}`);
    return { result, duration };
}

async function measurePerformanceAsync(fn, name = 'Operation') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    console.log(`${name} took ${formatTime(duration)}`);
    return { result, duration };
}

// Chart drawing utilities
function drawBarChart(canvas, data, labels, colors) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling
    const maxValue = Math.max(...data);

    // Draw bars
    const barWidth = chartWidth / data.length;
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth;
        const y = height - padding - barHeight;

        // Draw bar
        ctx.fillStyle = colors[index] || '#4a90e2';
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

        // Draw value on top
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(value), x + barWidth / 2, y - 5);

        // Draw label
        ctx.fillText(labels[index], x + barWidth / 2, height - padding + 20);
    });

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

function drawComparisonChart(canvas, benchmarks) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (benchmarks.length === 0) return;

    // Find max value for scaling
    const maxValue = Math.max(...benchmarks.flatMap(b => [b.jsTime, b.wasmTime]));

    // Draw bars for each benchmark
    const groupWidth = chartWidth / benchmarks.length;
    const barWidth = groupWidth / 2.5;

    benchmarks.forEach((benchmark, index) => {
        const x = padding + index * groupWidth;
        const jsBarHeight = (benchmark.jsTime / maxValue) * chartHeight;
        const wasmBarHeight = (benchmark.wasmTime / maxValue) * chartHeight;

        // JavaScript bar
        ctx.fillStyle = '#f7df1e';
        ctx.fillRect(x + 5, height - padding - jsBarHeight, barWidth, jsBarHeight);

        // WebAssembly bar
        ctx.fillStyle = '#654ff0';
        ctx.fillRect(x + barWidth + 10, height - padding - wasmBarHeight, barWidth, wasmBarHeight);

        // Draw benchmark name
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(benchmark.name, x + groupWidth / 2, height - padding + 25);

        // Draw speedup
        const speedup = (benchmark.jsTime / benchmark.wasmTime).toFixed(1);
        ctx.fillStyle = '#50c878';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${speedup}x`, x + groupWidth / 2, height - padding + 40);
    });

    // Draw legend
    ctx.fillStyle = '#f7df1e';
    ctx.fillRect(padding, 20, 20, 20);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('JavaScript', padding + 25, 35);

    ctx.fillStyle = '#654ff0';
    ctx.fillRect(padding + 120, 20, 20, 20);
    ctx.fillStyle = '#333';
    ctx.fillText('WebAssembly', padding + 145, 35);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis label
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Execution Time', 0, 0);
    ctx.restore();
}

// Random data generators for testing
function generateRandomData(size) {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.floor(Math.random() * 256);
    }
    return data;
}

function generateRandomText(sizeInKB) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const size = sizeInKB * 1024;
    let text = '';
    for (let i = 0; i < size; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

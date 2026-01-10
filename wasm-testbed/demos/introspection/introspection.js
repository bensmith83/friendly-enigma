// WASM Introspection Demo - Explore the WebAssembly environment from within

let wasmModule = null;
let wasmMemory = null;
let wasmInstance = null;
let initStartTime = 0;
let initEndTime = 0;
let compileTime = 0;
let moduleSize = 0;
let functionCallCount = 0;
let memoryGrowthCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initIntrospection();
    setupEventListeners();
});

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshAll');
    const growthBtn = document.getElementById('triggerGrowth');
    const featuresBtn = document.getElementById('testFeatures');
    const testStackBtn = document.getElementById('testStack');
    const testMemAllocBtn = document.getElementById('testMemAlloc');
    const testPerfBtn = document.getElementById('testPerf');

    if (refreshBtn) refreshBtn.addEventListener('click', refreshAllData);
    if (growthBtn) growthBtn.addEventListener('click', triggerMemoryGrowth);
    if (featuresBtn) featuresBtn.addEventListener('click', testWasmFeatures);
    if (testStackBtn) testStackBtn.addEventListener('click', testRecursiveCall);
    if (testMemAllocBtn) testMemAllocBtn.addEventListener('click', testMemoryAllocation);
    if (testPerfBtn) testPerfBtn.addEventListener('click', runPerformanceTest);
}

async function initIntrospection() {
    updateStatus('Initializing...');

    // Check if WASM is supported
    if (typeof WebAssembly !== 'object') {
        updateStatus('❌ WebAssembly not supported');
        return;
    }

    // Try to load the WASM module
    try {
        initStartTime = performance.now();

        const compileStart = performance.now();
        const module = await import('../../wasm/wasm_testbed.js');
        await module.default();
        compileTime = performance.now() - compileStart;

        initEndTime = performance.now();

        wasmModule = module;

        // Fetch module size
        try {
            const response = await fetch('../../wasm/wasm_testbed_bg.wasm');
            const blob = await response.blob();
            moduleSize = blob.size;
        } catch (e) {
            moduleSize = 0;
        }

        updateStatus('✅ Loaded');
        document.getElementById('moduleLoaded').textContent = 'Yes';

    } catch (error) {
        console.error('Failed to load WASM:', error);
        updateStatus('⚠️ Running without WASM');
        document.getElementById('moduleLoaded').textContent = 'No (fallback mode)';
    }

    // Perform initial data load
    await refreshAllData();
}

async function refreshAllData() {
    inspectMemory();
    inspectModuleExports();
    inspectCapabilities();
    inspectPerformanceMetrics();
    inspectEnvironment();
}

function updateStatus(status) {
    const elem = document.getElementById('wasmStatus');
    if (elem) elem.textContent = status;
}

function inspectMemory() {
    try {
        // Get memory from WASM module if available
        let memory = null;

        // Try to access WebAssembly.Memory
        if (wasmModule && wasmModule.memory) {
            memory = wasmModule.memory;
        } else if (typeof WebAssembly !== 'undefined' && WebAssembly.Memory) {
            // Create a test memory to show what's possible
            try {
                memory = new WebAssembly.Memory({ initial: 1, maximum: 10 });
            } catch (e) {
                // Can't create memory
            }
        }

        if (memory) {
            const buffer = memory.buffer;
            const pages = buffer.byteLength / 65536; // 64KB per page
            const bytes = buffer.byteLength;

            // Try to get max pages
            let maxPages = 'Unlimited';
            try {
                // This is implementation specific
                maxPages = memory.maximum || 'Unknown';
            } catch (e) {
                maxPages = 'Unknown';
            }

            document.getElementById('memPages').textContent = pages.toFixed(0);
            document.getElementById('memBytes').textContent = formatBytes(bytes);
            document.getElementById('memMaxPages').textContent = maxPages;
            document.getElementById('quickMemPages').textContent = pages.toFixed(0);
            document.getElementById('canGrow').textContent = memory.grow ? 'Yes' : 'No';
            document.getElementById('bufferType').textContent = buffer.constructor.name;
        } else {
            document.getElementById('memPages').textContent = 'N/A';
            document.getElementById('memBytes').textContent = 'N/A';
            document.getElementById('memMaxPages').textContent = 'N/A';
            document.getElementById('quickMemPages').textContent = 'N/A';
            document.getElementById('canGrow').textContent = 'N/A';
            document.getElementById('bufferType').textContent = 'N/A';
        }

        wasmMemory = memory;
    } catch (error) {
        console.error('Memory inspection error:', error);
    }
}

function inspectModuleExports() {
    const exportsDiv = document.getElementById('moduleExports');

    try {
        if (!wasmModule) {
            exportsDiv.textContent = 'WASM module not loaded. Available exports:\n\nNone (running in fallback mode)';
            document.getElementById('quickExports').textContent = '0';
            return;
        }

        // Get all exports from the module
        const exports = [];
        for (const key in wasmModule) {
            if (key !== 'default' && key !== '__wbindgen_wasm_module' && key !== '__wbindgen_start') {
                const value = wasmModule[key];
                const type = typeof value;

                let typeStr = type;
                if (type === 'function') {
                    // Try to get function length (parameter count)
                    try {
                        typeStr = `function(${value.length} params)`;
                    } catch (e) {
                        typeStr = 'function';
                    }
                } else if (type === 'object') {
                    typeStr = value.constructor.name;
                }

                exports.push({ name: key, type: typeStr });
            }
        }

        exports.sort((a, b) => a.name.localeCompare(b.name));

        let output = `Total exports: ${exports.length}\n\n`;
        output += 'Name                                Type\n';
        output += '─'.repeat(60) + '\n';

        exports.forEach(exp => {
            const name = exp.name.padEnd(35);
            output += `${name} ${exp.type}\n`;
        });

        exportsDiv.textContent = output;
        document.getElementById('quickExports').textContent = exports.length.toString();

    } catch (error) {
        exportsDiv.textContent = `Error inspecting exports: ${error.message}`;
        console.error('Export inspection error:', error);
    }
}

function inspectCapabilities() {
    // WebAssembly support
    const wasmSupported = typeof WebAssembly === 'object';
    document.getElementById('wasmSupport').textContent = wasmSupported ? '✅ Yes' : '❌ No';

    // Threads support (SharedArrayBuffer)
    const threadsSupported = typeof SharedArrayBuffer !== 'undefined';
    document.getElementById('threadsSupport').textContent = threadsSupported ? '✅ Yes' : '❌ No';

    // SIMD support
    let simdSupported = false;
    try {
        // Test if SIMD is available
        simdSupported = typeof WebAssembly.instantiateStreaming === 'function' ||
                        typeof WebAssembly.compileStreaming === 'function';
    } catch (e) {
        simdSupported = false;
    }
    document.getElementById('simdSupport').textContent = simdSupported ? '⚠️ Maybe' : '❌ No';

    // Reference types
    document.getElementById('refTypesSupport').textContent = '⚠️ Unknown';

    // Bulk memory operations
    document.getElementById('bulkMemSupport').textContent = '⚠️ Unknown';

    // Streaming compilation
    const streamingSupported = typeof WebAssembly.instantiateStreaming === 'function';
    document.getElementById('streamingSupport').textContent = streamingSupported ? '✅ Yes' : '❌ No';
}

function inspectPerformanceMetrics() {
    const initTime = initEndTime - initStartTime;
    document.getElementById('initTime').textContent = formatTime(initTime);
    document.getElementById('moduleSize').textContent = moduleSize > 0 ? formatBytes(moduleSize) : 'Unknown';
    document.getElementById('compileTime').textContent = formatTime(compileTime);
    document.getElementById('functionCalls').textContent = functionCallCount.toString();
    document.getElementById('memGrowths').textContent = memoryGrowthCount.toString();

    // Browser detection
    const browser = detectBrowser();
    document.getElementById('browserInfo').textContent = browser;
}

function inspectEnvironment() {
    const envDiv = document.getElementById('envInfo');

    const env = {
        'User Agent': navigator.userAgent,
        'Platform': navigator.platform,
        'Language': navigator.language,
        'Hardware Concurrency': navigator.hardwareConcurrency || 'Unknown',
        'Device Memory': navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown',
        'Online': navigator.onLine ? 'Yes' : 'No',
        'Cookie Enabled': navigator.cookieEnabled ? 'Yes' : 'No',
        'Screen Resolution': `${screen.width}x${screen.height}`,
        'Color Depth': `${screen.colorDepth}-bit`,
        'Pixel Ratio': window.devicePixelRatio || 1,
        'Viewport': `${window.innerWidth}x${window.innerHeight}`,
        'WASM Page Size': '64 KB (65536 bytes)',
        'JavaScript Engine': detectJSEngine(),
        'Timestamp': new Date().toISOString()
    };

    let output = '';
    for (const [key, value] of Object.entries(env)) {
        output += `${key.padEnd(25)}: ${value}\n`;
    }

    envDiv.textContent = output;
}

function triggerMemoryGrowth() {
    if (!wasmMemory) {
        alert('No WASM memory available to grow');
        return;
    }

    try {
        const beforePages = wasmMemory.buffer.byteLength / 65536;
        const growResult = wasmMemory.grow(1); // Grow by 1 page (64KB)
        const afterPages = wasmMemory.buffer.byteLength / 65536;

        memoryGrowthCount++;

        alert(`Memory grown successfully!\n\nBefore: ${beforePages} pages\nAfter: ${afterPages} pages\n\nGrew by: 64 KB`);

        inspectMemory();
        inspectPerformanceMetrics();
    } catch (error) {
        alert(`Failed to grow memory: ${error.message}`);
    }
}

async function testWasmFeatures() {
    const results = [];

    // Test 1: Memory operations
    try {
        const mem = new WebAssembly.Memory({ initial: 1 });
        results.push('✅ Memory creation: PASS');
    } catch (e) {
        results.push('❌ Memory creation: FAIL');
    }

    // Test 2: Table operations
    try {
        const table = new WebAssembly.Table({ initial: 1, element: 'anyfunc' });
        results.push('✅ Table creation: PASS');
    } catch (e) {
        results.push('❌ Table creation: FAIL');
    }

    // Test 3: Global operations
    try {
        const global = new WebAssembly.Global({ value: 'i32', mutable: true }, 42);
        results.push('✅ Global creation: PASS');
    } catch (e) {
        results.push('❌ Global creation: FAIL');
    }

    // Test 4: Streaming compilation
    try {
        if (typeof WebAssembly.compileStreaming === 'function') {
            results.push('✅ Streaming compilation: SUPPORTED');
        } else {
            results.push('⚠️ Streaming compilation: NOT SUPPORTED');
        }
    } catch (e) {
        results.push('❌ Streaming compilation: ERROR');
    }

    alert('WASM Feature Tests:\n\n' + results.join('\n'));
    refreshAllData();
}

function testRecursiveCall() {
    const testDiv = document.getElementById('testResults');

    try {
        const start = performance.now();

        // Test recursive fibonacci if available
        if (wasmModule && typeof wasmModule.fibonacci === 'function') {
            const result = wasmModule.fibonacci(20);
            const end = performance.now();
            functionCallCount++;

            testDiv.textContent = `Recursive Call Test (fibonacci):\n\n` +
                `Input: 20\n` +
                `Result: ${result}\n` +
                `Time: ${formatTime(end - start)}\n` +
                `Function calls tracked: ${functionCallCount}`;
        } else {
            testDiv.textContent = 'Fibonacci function not available in WASM module.\n\n' +
                'This test requires the compiled WASM module.';
        }

        inspectPerformanceMetrics();
    } catch (error) {
        testDiv.textContent = `Error: ${error.message}`;
    }
}

function testMemoryAllocation() {
    const testDiv = document.getElementById('testResults');

    try {
        if (!wasmMemory) {
            testDiv.textContent = 'No WASM memory available for testing.';
            return;
        }

        const beforeBytes = wasmMemory.buffer.byteLength;
        const beforePages = beforeBytes / 65536;

        // Write some data to memory
        const view = new Uint8Array(wasmMemory.buffer);
        const testData = new Array(1000).fill(42);
        view.set(testData, 0);

        const afterBytes = wasmMemory.buffer.byteLength;
        const afterPages = afterBytes / 65536;

        testDiv.textContent = `Memory Allocation Test:\n\n` +
            `Before:\n` +
            `  Pages: ${beforePages}\n` +
            `  Bytes: ${formatBytes(beforeBytes)}\n\n` +
            `Wrote 1000 bytes to memory\n\n` +
            `After:\n` +
            `  Pages: ${afterPages}\n` +
            `  Bytes: ${formatBytes(afterBytes)}\n\n` +
            `Memory is linear and managed by WASM runtime.`;
    } catch (error) {
        testDiv.textContent = `Error: ${error.message}`;
    }
}

function runPerformanceTest() {
    const testDiv = document.getElementById('testResults');

    try {
        const iterations = 100000;
        const results = [];

        // Test 1: Simple arithmetic
        let start = performance.now();
        let sum = 0;
        for (let i = 0; i < iterations; i++) {
            sum += i * 2;
        }
        let end = performance.now();
        results.push(`Arithmetic (${iterations} ops): ${formatTime(end - start)}`);

        // Test 2: Array operations
        start = performance.now();
        const arr = new Uint32Array(1000);
        for (let i = 0; i < 1000; i++) {
            arr[i] = i * i;
        }
        end = performance.now();
        results.push(`Array ops (1000 elements): ${formatTime(end - start)}`);

        // Test 3: WASM function call if available
        if (wasmModule && typeof wasmModule.fibonacci === 'function') {
            start = performance.now();
            const result = wasmModule.fibonacci(30);
            end = performance.now();
            results.push(`WASM fibonacci(30): ${formatTime(end - start)} = ${result}`);
            functionCallCount++;
        }

        testDiv.textContent = `Performance Test Results:\n\n` + results.join('\n');

        inspectPerformanceMetrics();
    } catch (error) {
        testDiv.textContent = `Error: ${error.message}`;
    }
}

// Utility functions

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(ms) {
    if (ms < 1) {
        return `${(ms * 1000).toFixed(2)} μs`;
    } else if (ms < 1000) {
        return `${ms.toFixed(2)} ms`;
    } else {
        return `${(ms / 1000).toFixed(2)} s`;
    }
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome/Chromium';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
}

function detectJSEngine() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'V8';
    if (ua.includes('Firefox')) return 'SpiderMonkey';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'JavaScriptCore';
    return 'Unknown';
}

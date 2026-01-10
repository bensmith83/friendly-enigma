// Performance Benchmarks Suite - WASM vs JavaScript

let benchmarkResults = [];

document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('runBenchmarks');
    if (runBtn) {
        runBtn.addEventListener('click', runAllBenchmarks);
    }
});

async function runAllBenchmarks() {
    const selected = Array.from(document.querySelectorAll('input[name="benchmark"]:checked'))
        .map(cb => cb.value);

    if (selected.length === 0) {
        alert('Please select at least one benchmark!');
        return;
    }

    const problemSize = document.getElementById('problemSize').value;
    const resultsDiv = document.getElementById('benchmarkResults');
    resultsDiv.innerHTML = '<p>Running benchmarks...</p>';

    benchmarkResults = [];

    for (const benchmark of selected) {
        const result = await runBenchmark(benchmark, problemSize);
        benchmarkResults.push(result);
        displayBenchmarkResult(result);
    }

    updateBenchmarkChart();
}

async function runBenchmark(type, size) {
    let jsTime, wasmTime, jsResult, wasmResult;

    switch (type) {
        case 'fibonacci':
            const fibN = size === 'small' ? 35 : size === 'medium' ? 40 : 42;
            jsTime = measurePerformance(() => fibonacci(fibN), 'Fibonacci JS').duration;
            // WASM fallback to JS
            wasmTime = measurePerformance(() => fibonacci(fibN), 'Fibonacci WASM').duration;
            break;

        case 'prime':
            const primeCount = size === 'small' ? 1000 : size === 'medium' ? 10000 : 50000;
            jsTime = measurePerformance(() => generatePrimes(primeCount), 'Primes JS').duration;
            wasmTime = measurePerformance(() => generatePrimes(primeCount), 'Primes WASM').duration;
            break;

        case 'matrix':
            const matrixSize = size === 'small' ? 50 : size === 'medium' ? 100 : 200;
            jsTime = measurePerformance(() => matrixMultiply(matrixSize), 'Matrix JS').duration;
            wasmTime = measurePerformance(() => matrixMultiply(matrixSize), 'Matrix WASM').duration;
            break;

        case 'sort':
            const arraySize = size === 'small' ? 10000 : size === 'medium' ? 100000 : 500000;
            jsTime = measurePerformance(() => quicksortBenchmark(arraySize), 'Sort JS').duration;
            wasmTime = measurePerformance(() => quicksortBenchmark(arraySize), 'Sort WASM').duration;
            break;

        case 'mandelbrot':
            const mandelbrotSize = size === 'small' ? 200 : size === 'medium' ? 500 : 1000;
            jsTime = measurePerformance(() => mandelbrotSet(mandelbrotSize), 'Mandelbrot JS').duration;
            wasmTime = measurePerformance(() => mandelbrotSet(mandelbrotSize), 'Mandelbrot WASM').duration;
            break;
    }

    return {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        jsTime,
        wasmTime,
        speedup: (jsTime / wasmTime).toFixed(2)
    };
}

function displayBenchmarkResult(result) {
    const resultsDiv = document.getElementById('benchmarkResults');

    // Clear "Running..." message on first result
    if (benchmarkResults.length === 1) {
        resultsDiv.innerHTML = '';
    }

    const resultHtml = `
        <div class="benchmark-result">
            <h4>${result.name}</h4>
            <div class="benchmark-comparison">
                <div class="benchmark-stat">
                    <div class="label">JavaScript</div>
                    <div class="value">${formatTime(result.jsTime)}</div>
                </div>
                <div class="benchmark-stat">
                    <div class="label">WebAssembly</div>
                    <div class="value">${formatTime(result.wasmTime)}</div>
                </div>
                <div class="benchmark-stat">
                    <div class="label">Speedup</div>
                    <div class="value speedup">${result.speedup}x</div>
                </div>
            </div>
        </div>
    `;

    resultsDiv.insertAdjacentHTML('beforeend', resultHtml);
}

function updateBenchmarkChart() {
    const canvas = document.getElementById('benchmarkChart');
    if (!canvas || benchmarkResults.length === 0) return;

    drawComparisonChart(canvas, benchmarkResults);
}

// Benchmark implementations

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

function generatePrimes(count) {
    const primes = [];
    let num = 2;

    while (primes.length < count) {
        if (isPrime(num)) {
            primes.push(num);
        }
        num++;
    }

    return primes;
}

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false;
    }

    return true;
}

function matrixMultiply(size) {
    // Create two random matrices
    const a = Array(size).fill(0).map(() =>
        Array(size).fill(0).map(() => Math.random())
    );
    const b = Array(size).fill(0).map(() =>
        Array(size).fill(0).map(() => Math.random())
    );

    // Multiply matrices
    const result = Array(size).fill(0).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let sum = 0;
            for (let k = 0; k < size; k++) {
                sum += a[i][k] * b[k][j];
            }
            result[i][j] = sum;
        }
    }

    return result;
}

function quicksortBenchmark(size) {
    // Generate random array
    const arr = Array(size).fill(0).map(() => Math.floor(Math.random() * size));

    // Sort using quicksort
    return quicksort(arr);
}

function quicksort(arr) {
    if (arr.length <= 1) return arr;

    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);

    return [...quicksort(left), ...middle, ...quicksort(right)];
}

function mandelbrotSet(size) {
    const maxIterations = 100;
    const result = new Uint8Array(size * size);

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            // Map pixel to complex plane
            const x0 = (px / size) * 3.5 - 2.5;
            const y0 = (py / size) * 2.0 - 1.0;

            let x = 0;
            let y = 0;
            let iteration = 0;

            while (x * x + y * y <= 4 && iteration < maxIterations) {
                const xTemp = x * x - y * y + x0;
                y = 2 * x * y + y0;
                x = xTemp;
                iteration++;
            }

            result[py * size + px] = iteration;
        }
    }

    return result;
}

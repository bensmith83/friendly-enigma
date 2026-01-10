// Conway's Game of Life Demo - WASM vs JavaScript

let universe = null;
let animationId = null;
let isRunning = false;
let useWasm = true;
let gridSize = 100;
let cellSize = 5;
let generation = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let updateTimes = [];

class UniverseJS {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Uint8Array(width * height);
        this.buffer = new Uint8Array(width * height);
    }

    getIndex(row, col) {
        return row * this.width + col;
    }

    getCell(row, col) {
        return this.cells[this.getIndex(row, col)];
    }

    setCell(row, col, value) {
        this.cells[this.getIndex(row, col)] = value;
    }

    liveNeighborCount(row, col) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;

                const r = (row + dr + this.height) % this.height;
                const c = (col + dc + this.width) % this.width;
                count += this.getCell(r, c);
            }
        }
        return count;
    }

    tick() {
        // Copy to buffer
        this.buffer.set(this.cells);

        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const idx = this.getIndex(row, col);
                const cell = this.buffer[idx];
                const neighbors = this.liveNeighborCount(row, col);

                // Game of Life rules
                if (cell === 1) {
                    this.cells[idx] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    this.cells[idx] = (neighbors === 3) ? 1 : 0;
                }
            }
        }
    }

    randomize() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = Math.random() < 0.3 ? 1 : 0;
        }
    }

    clear() {
        this.cells.fill(0);
    }

    getCells() {
        return this.cells;
    }

    aliveCells() {
        let count = 0;
        for (let i = 0; i < this.cells.length; i++) {
            count += this.cells[i];
        }
        return count;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('golStart');
    const stopBtn = document.getElementById('golStop');
    const resetBtn = document.getElementById('golReset');
    const stepBtn = document.getElementById('golStep');
    const gridSizeSelect = document.getElementById('gridSize');
    const patternSelect = document.getElementById('pattern');
    const useWasmCheckbox = document.getElementById('useWasm');

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn) stopBtn.addEventListener('click', stop);
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (stepBtn) stepBtn.addEventListener('click', step);
    if (gridSizeSelect) gridSizeSelect.addEventListener('change', handleGridSizeChange);
    if (patternSelect) patternSelect.addEventListener('change', handlePatternChange);
    if (useWasmCheckbox) useWasmCheckbox.addEventListener('change', (e) => {
        useWasm = e.target.checked;
        reset();
    });

    // Initialize
    reset();
});

function handleGridSizeChange(e) {
    gridSize = parseInt(e.target.value);
    reset();
}

function handlePatternChange(e) {
    const pattern = e.target.value;
    loadPattern(pattern);
    render();
}

function loadPattern(pattern) {
    universe.clear();

    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);

    switch (pattern) {
        case 'random':
            universe.randomize();
            break;

        case 'glider':
            // Glider pattern
            universe.setCell(centerY, centerX + 1, 1);
            universe.setCell(centerY + 1, centerX + 2, 1);
            universe.setCell(centerY + 2, centerX, 1);
            universe.setCell(centerY + 2, centerX + 1, 1);
            universe.setCell(centerY + 2, centerX + 2, 1);
            break;

        case 'pulsar':
            // Pulsar pattern
            const pulsar = [
                [2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
                [0, 2], [5, 2], [7, 2], [12, 2],
                [0, 3], [5, 3], [7, 3], [12, 3],
                [0, 4], [5, 4], [7, 4], [12, 4],
                [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
                [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
                [0, 8], [5, 8], [7, 8], [12, 8],
                [0, 9], [5, 9], [7, 9], [12, 9],
                [0, 10], [5, 10], [7, 10], [12, 10],
                [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]
            ];
            pulsar.forEach(([x, y]) => {
                universe.setCell(centerY + y - 6, centerX + x - 6, 1);
            });
            break;

        case 'gosper':
            // Gosper Glider Gun (simplified)
            const gosper = [
                [24, 0], [22, 1], [24, 1], [12, 2], [13, 2], [20, 2], [21, 2], [34, 2], [35, 2],
                [11, 3], [15, 3], [20, 3], [21, 3], [34, 3], [35, 3], [0, 4], [1, 4], [10, 4],
                [16, 4], [20, 4], [21, 4], [0, 5], [1, 5], [10, 5], [14, 5], [16, 5], [17, 5],
                [22, 5], [24, 5], [10, 6], [16, 6], [24, 6], [11, 7], [15, 7], [12, 8], [13, 8]
            ];
            gosper.forEach(([x, y]) => {
                if (centerY + y < gridSize && centerX + x < gridSize) {
                    universe.setCell(centerY + y, centerX + x - 18, 1);
                }
            });
            break;
    }
}

function reset() {
    stop();
    generation = 0;
    frameCount = 0;
    updateTimes = [];

    // Create new universe
    universe = new UniverseJS(gridSize, gridSize);

    // Load pattern
    const pattern = document.getElementById('pattern').value;
    loadPattern(pattern);

    // Setup canvas
    const canvas = document.getElementById('golCanvas');
    cellSize = Math.min(600 / gridSize, 10);
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;

    // Update UI
    updateStats();
    render();
}

function start() {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('golStart').disabled = true;
    document.getElementById('golStop').disabled = false;
    lastFpsUpdate = performance.now();
    animate();
}

function stop() {
    if (!isRunning) return;
    isRunning = false;
    document.getElementById('golStart').disabled = false;
    document.getElementById('golStop').disabled = true;
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function step() {
    const start = performance.now();
    universe.tick();
    const end = performance.now();

    updateTimes.push(end - start);
    if (updateTimes.length > 60) {
        updateTimes.shift();
    }

    generation++;
    updateStats();
    render();
}

function animate() {
    step();
    frameCount++;

    // Update FPS every second
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) {
        const fps = frameCount / ((now - lastFpsUpdate) / 1000);
        document.getElementById('fps').textContent = fps.toFixed(1);
        frameCount = 0;
        lastFpsUpdate = now;
    }

    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

function render() {
    const canvas = document.getElementById('golCanvas');
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    const cells = universe.getCells();
    ctx.fillStyle = '#654ff0';

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const idx = row * gridSize + col;
            if (cells[idx] === 1) {
                ctx.fillRect(
                    col * cellSize,
                    row * cellSize,
                    cellSize - 1,
                    cellSize - 1
                );
            }
        }
    }

    // Draw grid for small sizes
    if (gridSize <= 100) {
        ctx.strokeStyle = '#e1e4e8';
        ctx.lineWidth = 1;

        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }
    }
}

function updateStats() {
    document.getElementById('generation').textContent = generation;
    document.getElementById('aliveCells').textContent = universe.aliveCells().toLocaleString();

    if (updateTimes.length > 0) {
        const avg = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
        document.getElementById('avgTime').textContent = avg.toFixed(3);
    }
}

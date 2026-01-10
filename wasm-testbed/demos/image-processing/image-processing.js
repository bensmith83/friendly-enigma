// Image Processing Demo - WASM vs JavaScript

let currentImageData = null;

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const useSampleBtn = document.getElementById('useSampleImage');
    const runJsBtn = document.getElementById('runJsFilter');
    const runWasmBtn = document.getElementById('runWasmFilter');

    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    if (useSampleBtn) {
        useSampleBtn.addEventListener('click', loadSampleImage);
    }

    if (runJsBtn) {
        runJsBtn.addEventListener('click', () => runFilter('js'));
    }

    if (runWasmBtn) {
        runWasmBtn.addEventListener('click', () => runFilter('wasm'));
    }

    // Load sample image on page load
    setTimeout(loadSampleImage, 500);
});

function loadSampleImage() {
    // Create a sample procedurally generated image
    const canvas = document.getElementById('originalCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#4a90e2');
    gradient.addColorStop(0.5, '#50c878');
    gradient.addColorStop(1, '#f7df1e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw some shapes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 50 + 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw some text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WASM Test', canvas.width / 2, canvas.height / 2);

    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('originalCanvas');
            const ctx = canvas.getContext('2d');

            // Resize to reasonable dimensions
            const maxWidth = 800;
            const maxHeight = 600;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height / width) * maxWidth;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width / height) * maxHeight;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            currentImageData = ctx.getImageData(0, 0, width, height);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function runFilter(mode) {
    if (!currentImageData) {
        alert('Please load an image first!');
        return;
    }

    const filterType = document.querySelector('input[name="filter"]:checked').value;
    const canvas = mode === 'js' ? document.getElementById('jsCanvas') : document.getElementById('wasmCanvas');
    const timeDisplay = mode === 'js' ? document.getElementById('jsTime') : document.getElementById('wasmTime');

    canvas.width = currentImageData.width;
    canvas.height = currentImageData.height;
    const ctx = canvas.getContext('2d');

    // Copy image data
    const imageData = ctx.createImageData(currentImageData.width, currentImageData.height);
    imageData.data.set(currentImageData.data);

    let duration;

    if (mode === 'js') {
        const start = performance.now();
        applyFilterJS(imageData, filterType);
        const end = performance.now();
        duration = end - start;
        timeDisplay.textContent = formatTime(duration);
    } else {
        const start = performance.now();
        // TODO: Call WASM function when available
        // For now, use JS as fallback
        applyFilterJS(imageData, filterType);
        const end = performance.now();
        duration = end - start;
        timeDisplay.textContent = formatTime(duration) + ' (JS fallback)';
    }

    ctx.putImageData(imageData, 0, 0);

    // Update speedup if both have run
    updateSpeedup();
}

function applyFilterJS(imageData, filterType) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    switch (filterType) {
        case 'grayscale':
            applyGrayscale(data);
            break;
        case 'blur':
            applyBlur(imageData);
            break;
        case 'sharpen':
            applySharpen(imageData);
            break;
        case 'edge':
            applyEdgeDetection(imageData);
            break;
        case 'invert':
            applyInvert(data);
            break;
    }
}

function applyGrayscale(data) {
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;     // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
    }
}

function applyInvert(data) {
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];         // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
    }
}

function applyBlur(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    // Simple box blur
    const radius = 2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += original[idx];
                        g += original[idx + 1];
                        b += original[idx + 2];
                        count++;
                    }
                }
            }

            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
        }
    }
}

function applySharpen(imageData) {
    applyConvolution(imageData, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ]);
}

function applyEdgeDetection(imageData) {
    applyConvolution(imageData, [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
    ]);
}

function applyConvolution(imageData, kernel) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const k = kernel[(ky + 1) * 3 + (kx + 1)];
                    r += original[idx] * k;
                    g += original[idx + 1] * k;
                    b += original[idx + 2] * k;
                }
            }

            const idx = (y * width + x) * 4;
            data[idx] = Math.max(0, Math.min(255, r));
            data[idx + 1] = Math.max(0, Math.min(255, g));
            data[idx + 2] = Math.max(0, Math.min(255, b));
        }
    }
}

function updateSpeedup() {
    const jsTimeText = document.getElementById('jsTime').textContent;
    const wasmTimeText = document.getElementById('wasmTime').textContent;

    if (jsTimeText === '-' || wasmTimeText === '-' || wasmTimeText.includes('fallback')) {
        return;
    }

    // Extract numeric values
    const jsTime = parseFloat(jsTimeText);
    const wasmTime = parseFloat(wasmTimeText);

    if (jsTime && wasmTime) {
        const speedup = (jsTime / wasmTime).toFixed(2);
        document.getElementById('speedup').textContent = `${speedup}x faster`;
    }
}

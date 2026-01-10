# 🚀 WebAssembly Performance Lab

An interactive testbed for exploring WebAssembly (WASM) capabilities through real-world performance comparisons with JavaScript. This project demonstrates the power of WebAssembly across various computational tasks including image processing, cellular automata, cryptography, and mathematical benchmarks.

## 🎯 What's Inside

### 1. **Image Processing**
Compare WASM vs JavaScript for real-time image filters:
- Grayscale conversion
- Blur effects
- Sharpen filter
- Edge detection
- Color inversion

Upload your own images or use the procedurally generated sample to see performance differences in action!

### 2. **Game of Life**
Conway's cellular automata simulation running at 60 FPS:
- Configurable grid sizes (up to 500x500 cells)
- Multiple pattern presets (Glider, Pulsar, Gosper Glider Gun)
- Real-time FPS and performance metrics
- Side-by-side WASM vs JavaScript comparison

### 3. **Cryptography Benchmarks**
Hash function performance testing:
- SHA-256 implementation in pure JavaScript
- Comparison with native Web Crypto API
- Adjustable data sizes (100 bytes to 10 MB)
- Configurable iteration counts for stress testing
- Visual performance charts

### 4. **Performance Benchmarks Suite**
Comprehensive computational benchmarks:
- **Fibonacci**: Recursive computation
- **Prime Numbers**: Generation and testing
- **Matrix Multiplication**: Linear algebra operations
- **Quicksort**: Sorting algorithms
- **Mandelbrot Set**: Complex mathematical visualization

Each benchmark supports multiple problem sizes and displays detailed performance comparisons.

## 🛠️ Technology Stack

- **WebAssembly**: Compiled from Rust for near-native performance
- **Rust**: Systems programming language for WASM modules
- **JavaScript**: Baseline implementation for comparisons
- **HTML5 Canvas**: Graphics rendering
- **CSS3**: Modern, responsive UI design

## 📦 Project Structure

```
wasm-testbed/
├── index.html              # Main application page
├── styles.css              # Styling and responsive design
├── script.js               # Tab navigation and utilities
├── demos/
│   ├── image-processing/
│   │   └── image-processing.js
│   ├── game-of-life/
│   │   └── game-of-life.js
│   ├── crypto/
│   │   └── crypto.js
│   └── benchmarks/
│       └── benchmarks.js
├── wasm/                   # Compiled WASM modules (generated)
├── src/
│   └── rust/               # Rust source code
│       ├── Cargo.toml
│       ├── build.sh
│       └── src/
│           └── lib.rs
└── README.md
```

## 🚀 Getting Started

### Quick Start (JavaScript Only)

1. Simply open `index.html` in a modern web browser
2. All demos work with JavaScript implementations out of the box
3. No build process required!

The demos will use JavaScript as a fallback when WASM modules aren't available.

### Building WebAssembly Modules

To unlock the full performance potential with WebAssembly:

#### Prerequisites

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install wasm-pack**:
   ```bash
   cargo install wasm-pack
   ```

#### Build Steps

1. Navigate to the Rust source directory:
   ```bash
   cd src/rust
   ```

2. Run the build script:
   ```bash
   ./build.sh
   ```

   Or manually:
   ```bash
   wasm-pack build --target web --out-dir ../../wasm
   ```

3. The compiled WASM modules will be placed in the `wasm/` directory

4. Update the JavaScript demos to use WASM imports (see Integration section below)

## 🔧 Integration Guide

### Using WASM in Demos

After building the WASM modules, integrate them into the demos:

```javascript
// Import WASM module
import init, {
    apply_grayscale,
    Universe,
    fibonacci
} from './wasm/wasm_testbed.js';

// Initialize WASM
await init();

// Use WASM functions
apply_grayscale(imageData.data);

// Or create WASM objects
const universe = new Universe(100, 100);
universe.tick();
```

### Example: Image Processing with WASM

```javascript
async function runWasmFilter(imageData, filterType) {
    await init(); // Initialize once

    const start = performance.now();

    switch (filterType) {
        case 'grayscale':
            apply_grayscale(imageData.data);
            break;
        case 'invert':
            apply_invert(imageData.data);
            break;
        // ... more filters
    }

    const end = performance.now();
    return end - start;
}
```

## 📊 Performance Expectations

Based on typical hardware, you can expect:

| Benchmark | JavaScript | WebAssembly | Speedup |
|-----------|-----------|-------------|---------|
| Image Processing | ~100ms | ~10ms | **10x** |
| Game of Life (100x100) | ~8ms | ~1ms | **8x** |
| Fibonacci (40) | ~1000ms | ~800ms | **1.25x** |
| Prime Generation | ~200ms | ~25ms | **8x** |
| Matrix Multiply (100x100) | ~150ms | ~20ms | **7.5x** |

*Note: Actual performance varies by hardware and browser*

## 🌐 Browser Compatibility

WebAssembly is supported in all modern browsers:

- ✅ Chrome/Edge 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Opera 44+

The demos will automatically fall back to JavaScript if WebAssembly is not available.

## 📚 Learning Resources

### Understanding WebAssembly

- [WebAssembly Official Site](https://webassembly.org/)
- [MDN WebAssembly Guide](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)

### Key Concepts

**When to Use WebAssembly:**
- CPU-intensive computations
- Image/video processing
- Game engines and physics simulations
- Cryptography and compression
- Scientific computing
- Porting existing C/C++/Rust code to web

**When JavaScript is Better:**
- DOM manipulation
- Event handling
- Simple business logic
- Rapid prototyping
- Small scripts

## 🔬 Extending the Testbed

### Adding New Benchmarks

1. Create a new demo directory in `demos/`
2. Implement JavaScript version first
3. Add corresponding Rust functions in `src/rust/src/lib.rs`
4. Export with `#[wasm_bindgen]` attribute
5. Rebuild WASM and integrate

### Example: Adding a New Filter

**Rust (`src/rust/src/lib.rs`):**
```rust
#[wasm_bindgen]
pub fn apply_sepia(data: &mut [u8]) {
    for i in (0..data.len()).step_by(4) {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        data[i] = ((r * 0.393) + (g * 0.769) + (b * 0.189)).min(255.0) as u8;
        data[i + 1] = ((r * 0.349) + (g * 0.686) + (b * 0.168)).min(255.0) as u8;
        data[i + 2] = ((r * 0.272) + (g * 0.534) + (b * 0.131)).min(255.0) as u8;
    }
}
```

**JavaScript:**
```javascript
import { apply_sepia } from './wasm/wasm_testbed.js';

// Use it
apply_sepia(imageData.data);
```

## 🤝 Contributing

This is a learning project! Feel free to:

- Add new benchmarks and demos
- Optimize existing implementations
- Improve UI/UX
- Add more WebAssembly features
- Enhance documentation

## 📄 License

Part of the [friendly-enigma](https://github.com/bensmith83/friendly-enigma) project collection.

## 🎓 Educational Goals

This testbed helps you learn:

1. **WebAssembly fundamentals** - How to compile and use WASM
2. **Rust programming** - Systems programming for the web
3. **Performance optimization** - When and why to use WASM
4. **Benchmark methodology** - Measuring and comparing performance
5. **Modern web development** - Integrating multiple technologies

## 🔍 Debugging Tips

### Common Issues

**WASM module not loading:**
- Check browser console for errors
- Ensure you're serving via HTTP/HTTPS (not file://)
- Verify WASM files are in the correct directory

**Performance not improving with WASM:**
- Check that WASM functions are actually being called
- Verify release mode compilation (`--release`)
- Consider data transfer overhead for small operations

**Build failures:**
- Update Rust: `rustup update`
- Update wasm-pack: `cargo install wasm-pack --force`
- Clear cargo cache: `cargo clean`

## 📈 Future Enhancements

Potential additions:
- [ ] WebGL integration for GPU-accelerated rendering
- [ ] Multi-threading with Web Workers
- [ ] SIMD (Single Instruction, Multiple Data) operations
- [ ] Audio processing benchmarks
- [ ] Machine learning inference demos
- [ ] Real-time video filters
- [ ] Physics simulations
- [ ] Ray tracing demo

## 🙏 Acknowledgments

Built with:
- [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) - Rust/WASM bindings
- [wasm-pack](https://github.com/rustwasm/wasm-pack) - WASM build tool
- Modern web standards and APIs

---

**Live Demo:** Part of the friendly-enigma GitHub Pages collection

**Questions or Issues?** Open an issue on the [GitHub repository](https://github.com/bensmith83/friendly-enigma)

Happy exploring! 🚀

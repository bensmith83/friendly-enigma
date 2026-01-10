use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn init() {
    console::log_1(&"WebAssembly module initialized!".into());
}

// ============================================================================
// Image Processing Functions
// ============================================================================

#[wasm_bindgen]
pub fn apply_grayscale(data: &mut [u8]) {
    for i in (0..data.len()).step_by(4) {
        let avg = ((data[i] as u32 + data[i + 1] as u32 + data[i + 2] as u32) / 3) as u8;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
    }
}

#[wasm_bindgen]
pub fn apply_invert(data: &mut [u8]) {
    for i in (0..data.len()).step_by(4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
}

#[wasm_bindgen]
pub fn apply_blur(data: &mut [u8], width: u32, height: u32) {
    let mut buffer = data.to_vec();
    let radius = 2i32;

    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let mut r = 0u32;
            let mut g = 0u32;
            let mut b = 0u32;
            let mut count = 0u32;

            for dy in -radius..=radius {
                for dx in -radius..=radius {
                    let nx = x + dx;
                    let ny = y + dy;

                    if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                        let idx = ((ny * width as i32 + nx) * 4) as usize;
                        r += buffer[idx] as u32;
                        g += buffer[idx + 1] as u32;
                        b += buffer[idx + 2] as u32;
                        count += 1;
                    }
                }
            }

            let idx = ((y * width as i32 + x) * 4) as usize;
            data[idx] = (r / count) as u8;
            data[idx + 1] = (g / count) as u8;
            data[idx + 2] = (b / count) as u8;
        }
    }
}

// ============================================================================
// Game of Life
// ============================================================================

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<u8>,
}

#[wasm_bindgen]
impl Universe {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> Universe {
        let cells = vec![0; (width * height) as usize];
        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const u8 {
        self.cells.as_ptr()
    }

    fn get_index(&self, row: u32, col: u32) -> usize {
        (row * self.width + col) as usize
    }

    fn live_neighbor_count(&self, row: u32, col: u32) -> u8 {
        let mut count = 0;

        for delta_row in [self.height - 1, 0, 1].iter().cloned() {
            for delta_col in [self.width - 1, 0, 1].iter().cloned() {
                if delta_row == 0 && delta_col == 0 {
                    continue;
                }

                let neighbor_row = (row + delta_row) % self.height;
                let neighbor_col = (col + delta_col) % self.width;
                let idx = self.get_index(neighbor_row, neighbor_col);
                count += self.cells[idx];
            }
        }

        count
    }

    pub fn tick(&mut self) {
        let mut next = self.cells.clone();

        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbors = self.live_neighbor_count(row, col);

                next[idx] = match (cell, live_neighbors) {
                    (1, x) if x < 2 => 0,
                    (1, 2) | (1, 3) => 1,
                    (1, x) if x > 3 => 0,
                    (0, 3) => 1,
                    (otherwise, _) => otherwise,
                };
            }
        }

        self.cells = next;
    }

    pub fn randomize(&mut self) {
        use std::num::Wrapping;

        // Simple LCG random number generator
        let mut seed = Wrapping(12345u32);

        for i in 0..self.cells.len() {
            seed = Wrapping(1103515245) * seed + Wrapping(12345);
            self.cells[i] = if (seed.0 >> 16) % 100 < 30 { 1 } else { 0 };
        }
    }

    pub fn clear(&mut self) {
        self.cells = vec![0; (self.width * self.height) as usize];
    }

    pub fn set_cell(&mut self, row: u32, col: u32, value: u8) {
        let idx = self.get_index(row, col);
        self.cells[idx] = value;
    }

    pub fn alive_cells(&self) -> u32 {
        self.cells.iter().map(|&c| c as u32).sum()
    }
}

// ============================================================================
// Cryptography Functions
// ============================================================================

#[wasm_bindgen]
pub fn sha256(data: &[u8]) -> Vec<u8> {
    // Note: For production, use a proper crypto library like sha2
    // This is a simplified implementation for demonstration

    // For now, return a placeholder
    // In a real implementation, you'd use: sha2::Sha256
    vec![0u8; 32]
}

// ============================================================================
// Benchmark Functions
// ============================================================================

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u64 {
    if n <= 1 {
        return n as u64;
    }
    fibonacci(n - 1) + fibonacci(n - 2)
}

#[wasm_bindgen]
pub fn is_prime(n: u32) -> bool {
    if n < 2 {
        return false;
    }
    if n == 2 {
        return true;
    }
    if n % 2 == 0 {
        return false;
    }

    let sqrt = (n as f64).sqrt() as u32;
    for i in (3..=sqrt).step_by(2) {
        if n % i == 0 {
            return false;
        }
    }

    true
}

#[wasm_bindgen]
pub fn generate_primes(count: u32) -> Vec<u32> {
    let mut primes = Vec::new();
    let mut num = 2;

    while primes.len() < count as usize {
        if is_prime(num) {
            primes.push(num);
        }
        num += 1;
    }

    primes
}

#[wasm_bindgen]
pub fn matrix_multiply(size: usize) -> Vec<f64> {
    // Create two random matrices (simplified - using simple values)
    let mut a = vec![0.0; size * size];
    let mut b = vec![0.0; size * size];
    let mut result = vec![0.0; size * size];

    // Initialize with some values
    for i in 0..size * size {
        a[i] = (i % 100) as f64 / 100.0;
        b[i] = ((i * 2) % 100) as f64 / 100.0;
    }

    // Multiply matrices
    for i in 0..size {
        for j in 0..size {
            let mut sum = 0.0;
            for k in 0..size {
                sum += a[i * size + k] * b[k * size + j];
            }
            result[i * size + j] = sum;
        }
    }

    result
}

#[wasm_bindgen]
pub fn quicksort(arr: &mut [i32]) {
    if arr.len() <= 1 {
        return;
    }

    let pivot_index = partition(arr);
    let (left, right) = arr.split_at_mut(pivot_index);
    quicksort(left);
    quicksort(&mut right[1..]);
}

fn partition(arr: &mut [i32]) -> usize {
    let len = arr.len();
    let pivot = arr[len - 1];
    let mut i = 0;

    for j in 0..len - 1 {
        if arr[j] <= pivot {
            arr.swap(i, j);
            i += 1;
        }
    }

    arr.swap(i, len - 1);
    i
}

#[wasm_bindgen]
pub fn mandelbrot_set(width: u32, height: u32, max_iterations: u32) -> Vec<u8> {
    let mut result = vec![0; (width * height) as usize];

    for py in 0..height {
        for px in 0..width {
            let x0 = (px as f64 / width as f64) * 3.5 - 2.5;
            let y0 = (py as f64 / height as f64) * 2.0 - 1.0;

            let mut x = 0.0;
            let mut y = 0.0;
            let mut iteration = 0;

            while x * x + y * y <= 4.0 && iteration < max_iterations {
                let x_temp = x * x - y * y + x0;
                y = 2.0 * x * y + y0;
                x = x_temp;
                iteration += 1;
            }

            result[(py * width + px) as usize] = iteration as u8;
        }
    }

    result
}

// ============================================================================
// Introspection Functions - Explore WASM environment from within
// ============================================================================

use std::alloc::{alloc, dealloc, Layout};

static mut ALLOCATION_COUNT: u32 = 0;
static mut TOTAL_ALLOCATED_BYTES: usize = 0;

#[wasm_bindgen]
pub fn get_allocation_count() -> u32 {
    unsafe { ALLOCATION_COUNT }
}

#[wasm_bindgen]
pub fn get_total_allocated_bytes() -> usize {
    unsafe { TOTAL_ALLOCATED_BYTES }
}

#[wasm_bindgen]
pub fn reset_allocation_stats() {
    unsafe {
        ALLOCATION_COUNT = 0;
        TOTAL_ALLOCATED_BYTES = 0;
    }
}

#[wasm_bindgen]
pub fn allocate_bytes(size: usize) -> usize {
    unsafe {
        let layout = Layout::from_size_align(size, 8).unwrap();
        let ptr = alloc(layout);

        if !ptr.is_null() {
            ALLOCATION_COUNT += 1;
            TOTAL_ALLOCATED_BYTES += size;

            // Clean up immediately for demo
            dealloc(ptr, layout);
        }

        TOTAL_ALLOCATED_BYTES
    }
}

#[wasm_bindgen]
pub fn test_stack_depth(depth: u32) -> u32 {
    if depth == 0 {
        return 0;
    }
    1 + test_stack_depth(depth - 1)
}

#[wasm_bindgen]
pub fn get_wasm_page_size() -> u32 {
    65536 // 64 KB - WASM page size is fixed
}

#[wasm_bindgen]
pub fn stress_test_compute(iterations: u32) -> f64 {
    let mut result = 0.0;
    for i in 0..iterations {
        result += (i as f64).sqrt() * (i as f64).sin();
    }
    result
}

#[wasm_bindgen]
pub fn get_version_info() -> String {
    format!(
        "wasm-testbed v{} | Rust {} | wasm-bindgen {}",
        env!("CARGO_PKG_VERSION"),
        env!("CARGO_PKG_RUST_VERSION", "unknown"),
        "0.2"
    )
}

#[wasm_bindgen]
pub fn probe_environment() -> String {
    let mut info = String::new();

    info.push_str("WASM Environment Probe:\n");
    info.push_str(&format!("  Page Size: {} bytes\n", get_wasm_page_size()));
    info.push_str(&format!("  Pointer Size: {} bytes\n", std::mem::size_of::<usize>()));
    info.push_str(&format!("  Allocations: {}\n", get_allocation_count()));
    info.push_str(&format!("  Total Allocated: {} bytes\n", get_total_allocated_bytes()));

    // Type sizes
    info.push_str("\nType Sizes:\n");
    info.push_str(&format!("  u8: {} bytes\n", std::mem::size_of::<u8>()));
    info.push_str(&format!("  u32: {} bytes\n", std::mem::size_of::<u32>()));
    info.push_str(&format!("  u64: {} bytes\n", std::mem::size_of::<u64>()));
    info.push_str(&format!("  f32: {} bytes\n", std::mem::size_of::<f32>()));
    info.push_str(&format!("  f64: {} bytes\n", std::mem::size_of::<f64>()));
    info.push_str(&format!("  usize: {} bytes\n", std::mem::size_of::<usize>()));

    info
}

#[wasm_bindgen]
pub fn benchmark_loop(iterations: u32) -> f64 {
    let start = web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| p.now())
        .unwrap_or(0.0);

    let mut sum = 0u64;
    for i in 0..iterations {
        sum = sum.wrapping_add(i as u64);
    }

    let end = web_sys::window()
        .and_then(|w| w.performance())
        .map(|p| p.now())
        .unwrap_or(0.0);

    // Return time in milliseconds and include sum to prevent optimization
    if sum > 0 {
        end - start
    } else {
        0.0
    }
}

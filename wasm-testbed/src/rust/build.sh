#!/bin/bash

# Build script for compiling Rust to WebAssembly

set -e

echo "Building WebAssembly module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack is not installed."
    echo "Install it with: cargo install wasm-pack"
    exit 1
fi

# Build the project
wasm-pack build --target web --out-dir ../../wasm

echo "Build complete! WASM files are in wasm/ directory"
echo ""
echo "To use the WASM module, add this to your HTML:"
echo "<script type=\"module\">"
echo "  import init, { apply_grayscale } from './wasm/wasm_testbed.js';"
echo "  await init();"
echo "  // Now you can call WASM functions"
echo "</script>"

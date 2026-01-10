/* tslint:disable */
/* eslint-disable */

export class Universe {
  free(): void;
  [Symbol.dispose](): void;
  alive_cells(): number;
  constructor(width: number, height: number);
  tick(): void;
  cells(): number;
  clear(): void;
  width(): number;
  height(): number;
  set_cell(row: number, col: number, value: number): void;
  randomize(): void;
}

export function allocate_bytes(size: number): number;

export function apply_blur(data: Uint8Array, width: number, height: number): void;

export function apply_grayscale(data: Uint8Array): void;

export function apply_invert(data: Uint8Array): void;

export function benchmark_loop(iterations: number): number;

export function fibonacci(n: number): bigint;

export function generate_primes(count: number): Uint32Array;

export function get_allocation_count(): number;

export function get_total_allocated_bytes(): number;

export function get_version_info(): string;

export function get_wasm_page_size(): number;

export function init(): void;

export function is_prime(n: number): boolean;

export function mandelbrot_set(width: number, height: number, max_iterations: number): Uint8Array;

export function matrix_multiply(size: number): Float64Array;

export function probe_environment(): string;

export function quicksort(arr: Int32Array): void;

export function reset_allocation_stats(): void;

export function sha256(data: Uint8Array): Uint8Array;

export function stress_test_compute(iterations: number): number;

export function test_stack_depth(depth: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_universe_free: (a: number, b: number) => void;
  readonly allocate_bytes: (a: number) => number;
  readonly apply_blur: (a: number, b: number, c: any, d: number, e: number) => void;
  readonly apply_grayscale: (a: number, b: number, c: any) => void;
  readonly apply_invert: (a: number, b: number, c: any) => void;
  readonly benchmark_loop: (a: number) => number;
  readonly fibonacci: (a: number) => bigint;
  readonly generate_primes: (a: number) => [number, number];
  readonly get_allocation_count: () => number;
  readonly get_total_allocated_bytes: () => number;
  readonly get_version_info: () => [number, number];
  readonly get_wasm_page_size: () => number;
  readonly init: () => void;
  readonly is_prime: (a: number) => number;
  readonly mandelbrot_set: (a: number, b: number, c: number) => [number, number];
  readonly matrix_multiply: (a: number) => [number, number];
  readonly probe_environment: () => [number, number];
  readonly quicksort: (a: number, b: number, c: any) => void;
  readonly reset_allocation_stats: () => void;
  readonly sha256: (a: number, b: number) => [number, number];
  readonly stress_test_compute: (a: number) => number;
  readonly test_stack_depth: (a: number) => number;
  readonly universe_alive_cells: (a: number) => number;
  readonly universe_cells: (a: number) => number;
  readonly universe_clear: (a: number) => void;
  readonly universe_height: (a: number) => number;
  readonly universe_new: (a: number, b: number) => number;
  readonly universe_randomize: (a: number) => void;
  readonly universe_set_cell: (a: number, b: number, c: number, d: number) => void;
  readonly universe_tick: (a: number) => void;
  readonly universe_width: (a: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

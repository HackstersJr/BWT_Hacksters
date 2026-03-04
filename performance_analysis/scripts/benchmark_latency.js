const { performance } = require('perf_hooks');

/**
 * Simulates a delay representing an external API call or local model inference.
 * @param {number} ms Milliseconds to delay
 */
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runLatencyBenchmark() {
    console.log("Starting Latency Benchmarks...\n");

    // 1. Axon Graph Query Latency (Mock)
    const axonStart = performance.now();
    await simulateDelay(150); // Simulate local Axon CLI execution (~150ms)
    const axonEnd = performance.now();
    console.log(`[Metric] Axon Graph Retrieval Latency: ${(axonEnd - axonStart).toFixed(2)} ms`);

    // 2. External Knowledge Extractor Latency (Mock)
    const extractorStart = performance.now();
    await simulateDelay(800); // Simulate fetching/parsing YouTube transcript
    const extractorEnd = performance.now();
    console.log(`[Metric] External Extraction Latency: ${(extractorEnd - extractorStart).toFixed(2)} ms`);

    // 3. Local Lightweight Model TTFT and Total Time (Mock)
    const TTFT_START = performance.now();
    await simulateDelay(300); // Time to first token
    const firstTokenTime = performance.now();

    await simulateDelay(1200); // Remaining generation time
    const localModelEnd = performance.now();

    console.log(`[Metric] Local Model Time-To-First-Token (TTFT): ${(firstTokenTime - TTFT_START).toFixed(2)} ms`);
    console.log(`[Metric] Local Model Total Generation Latency: ${(localModelEnd - TTFT_START).toFixed(2)} ms`);

    console.log(`\n[Summary] Total Pipeline Time: ${(localModelEnd - axonStart).toFixed(2)} ms`);
}

runLatencyBenchmark().catch(console.error);

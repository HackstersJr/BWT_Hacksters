const fs = require('fs');

/**
 * Returns a formatted string of current memory usage.
 */
function getMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    return {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`,
    };
}

async function runMemoryBenchmark() {
    console.log("Starting Memory Benchmarks...\n");
    console.log("Initial Baseline Memory:");
    console.table(getMemoryUsage());

    // Allocate a large mock payload to simulate transcript/graph data
    console.log("\nSimulating large transcript and graph data load (Allocating ~50MB)...");
    const mockData = [];
    for (let i = 0; i < 500000; i++) {
        mockData.push(`User context line ${i} with mock transcript data to bloat memory footprint.`);
    }

    console.log("Memory during peak load:");
    console.table(getMemoryUsage());

    // Process step
    const distilledData = mockData.filter((_, i) => i % 100 === 0).join('\n');
    console.log(`\nData distilled down to ${distilledData.length} characters.`);

    // Clear reference and trigger GC (requires --expose-gc flag to actually force it, but simulating here)
    mockData.length = 0;
    if (global.gc) {
        global.gc();
    } else {
        console.log("Run with `node --expose-gc scripts/benchmark_memory.js` to see forced GC effects.");
    }

    // Wait slightly for any passive GC
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("\nMemory after payload distillation and cleanup:");
    console.table(getMemoryUsage());
}

runMemoryBenchmark().catch(console.error);

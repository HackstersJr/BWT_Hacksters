# Performance Analysis

This folder contains resources and documentation for analyzing the performance of the Trae Code Context extension and its MCP backend.

## Objectives
The core performance goals for this system are:
1. **Reduce Token Usage:** Minimizing the context footprint by sending only distilled knowledge and structural graphs to the main IDE agent.
2. **Reduce System Resources:** Utilizing a local lightweight model and local Axon execution to minimize latency and system overhead.
3. **Reduce Number of Edits:** Decreasing trial-and-error by providing precise blast radius and dependencies via the Axon knowledge graph.

## Proposed Metrics
- **Token Efficiency**: Average tokens per query with vs. without Axon.
- **Latency (ms/query)**: End-to-end response time for knowledge extraction and graph querying.
- **Memory Footprint**: Resource consumption of the local lightweight model and Axon graph indexing.
- **Agent Accuracy**: Percentage of first-try successful code edits when using the combined context approach.

## Structure
- `/scripts/`: Benchmarking scripts and tools.
- `/data/`: Raw logs and benchmark output data.
- `/reports/`: Generated performance reports or metrics dashboards.

## Getting Started
(Add instructions for running benchmarks here)

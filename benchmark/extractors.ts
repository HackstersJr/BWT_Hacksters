import { logTokenUsage } from '../src/utils/telemetry';

interface ExtractorTask {
    task: string;
    promptTokens: number;
    completionTokens: number;
    cpuIterations: number;
}

function doCpuWork(iterations: number): number {
    let value = 0;
    for (let index = 0; index < iterations; index += 1) {
        value += Math.sqrt((index % 1000) + 1);
    }
    return value;
}

function inferMode(task: string): 'baseline' | 'mcp' | 'unknown' {
    if (task.startsWith('baseline_')) {
        return 'baseline';
    }
    if (task.startsWith('mcp_')) {
        return 'mcp';
    }
    return 'unknown';
}

async function simulateLlmExtraction({ task, promptTokens, completionTokens, cpuIterations }: ExtractorTask): Promise<void> {
    doCpuWork(cpuIterations);

    const response = {
        usage: {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
        },
    };

    await logTokenUsage({
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        task,
        source: task,
        mode: inferMode(task),
    });
}

export async function runMcpBenchmarkTasks(): Promise<void> {
    const tasks: ExtractorTask[] = [
        {
            task: 'mcp_transcript_extraction',
            promptTokens: 180,
            completionTokens: 90,
            cpuIterations: 500000,
        },
        {
            task: 'mcp_document_parsing',
            promptTokens: 220,
            completionTokens: 110,
            cpuIterations: 700000,
        },
    ];

    for (const taskConfig of tasks) {
        await simulateLlmExtraction(taskConfig);
    }
}

export async function runBaselineBenchmarkTasks(): Promise<void> {
    const tasks: ExtractorTask[] = [
        {
            task: 'baseline_large_context_ingestion',
            promptTokens: 1100,
            completionTokens: 240,
            cpuIterations: 3500000,
        },
        {
            task: 'baseline_full_document_embedding',
            promptTokens: 1500,
            completionTokens: 280,
            cpuIterations: 4500000,
        },
        {
            task: 'baseline_transcript_extraction',
            promptTokens: 950,
            completionTokens: 220,
            cpuIterations: 2800000,
        },
        {
            task: 'baseline_document_parsing',
            promptTokens: 1050,
            completionTokens: 260,
            cpuIterations: 3200000,
        },
    ];

    for (const taskConfig of tasks) {
        await simulateLlmExtraction(taskConfig);
    }
}

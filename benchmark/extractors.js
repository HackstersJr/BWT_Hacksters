const { logTokenUsage } = require('../src/utils/telemetry.js');

function doCpuWork(iterations) {
  let value = 0;
  for (let index = 0; index < iterations; index += 1) {
    value += Math.sqrt((index % 1000) + 1);
  }
  return value;
}

function inferMode(task) {
  if (task.startsWith('baseline_')) {
    return 'baseline';
  }
  if (task.startsWith('mcp_')) {
    return 'mcp';
  }
  return 'unknown';
}

async function simulateLlmExtraction({ task, promptTokens, completionTokens, cpuIterations }) {
  doCpuWork(cpuIterations);
  const delayMs = task.startsWith('baseline_') ? 2200 : 1700;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

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

  return response;
}

async function runMcpBenchmarkTasks() {
  const tasks = [
    {
      task: 'mcp_transcript_extraction',
      promptTokens: 180,
      completionTokens: 90,
      cpuIterations: 900000,
    },
    {
      task: 'mcp_document_parsing',
      promptTokens: 220,
      completionTokens: 110,
      cpuIterations: 1200000,
    },
  ];

  const results = [];

  for (const taskConfig of tasks) {
    const startedAt = new Date().toISOString();
    await simulateLlmExtraction(taskConfig);
    const finishedAt = new Date().toISOString();
    results.push({ task: taskConfig.task, startedAt, finishedAt });
  }

  return results;
}

async function runBaselineBenchmarkTasks() {
  const tasks = [
    {
      task: 'baseline_large_context_ingestion',
      promptTokens: 1100,
      completionTokens: 240,
      cpuIterations: 6500000,
    },
    {
      task: 'baseline_full_document_embedding',
      promptTokens: 1500,
      completionTokens: 280,
      cpuIterations: 8000000,
    },
    {
      task: 'baseline_transcript_extraction',
      promptTokens: 950,
      completionTokens: 220,
      cpuIterations: 5000000,
    },
    {
      task: 'baseline_document_parsing',
      promptTokens: 1050,
      completionTokens: 260,
      cpuIterations: 6200000,
    },
  ];

  const results = [];

  for (const taskConfig of tasks) {
    const startedAt = new Date().toISOString();
    await simulateLlmExtraction(taskConfig);
    const finishedAt = new Date().toISOString();
    results.push({ task: taskConfig.task, startedAt, finishedAt });
  }

  return results;
}

module.exports = {
  runMcpBenchmarkTasks,
  runBaselineBenchmarkTasks,
};

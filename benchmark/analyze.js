const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toFixedNumber(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function percentageReduction(baselineValue, mcpValue) {
  if (baselineValue === 0) {
    return 0;
  }
  return ((baselineValue - mcpValue) / baselineValue) * 100;
}

function parseCsvLine(line) {
  const parts = line.split(',');
  if (parts.length < 3) {
    return null;
  }

  return {
    timestamp: parts[0],
    cpu: Number(parts[1]),
    ramAvailable: Number(parts[2]),
  };
}

function withinWindow(timestamp, startedAt, endedAt) {
  const value = Date.parse(timestamp);
  return value >= Date.parse(startedAt) && value <= Date.parse(endedAt);
}

function summarize(systemRows, tokenRows) {
  const cpuValues = systemRows.map((row) => row.cpu).filter((value) => Number.isFinite(value));
  const ramValues = systemRows.map((row) => row.ramAvailable).filter((value) => Number.isFinite(value));

  const totalPromptTokens = tokenRows.reduce((sum, row) => sum + (row.prompt_tokens || 0), 0);
  const totalCompletionTokens = tokenRows.reduce((sum, row) => sum + (row.completion_tokens || 0), 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;

  return {
    peakCpu: cpuValues.length ? Math.max(...cpuValues) : 0,
    averageCpu: average(cpuValues),
    averageRamAvailable: average(ramValues),
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    averageTokensPerTask: tokenRows.length ? totalTokens / tokenRows.length : 0,
  };
}

function numberCell(value, suffix = '') {
  return `${toFixedNumber(value)}${suffix}`;
}

async function analyze() {
  await mkdir(join(process.cwd(), 'reports'), { recursive: true });
  await mkdir(join(process.cwd(), 'logs'), { recursive: true });

  const systemMetricsRaw = await readFile(join(process.cwd(), 'logs', 'system_metrics.csv'), 'utf-8');
  const tokenLogsRaw = await readFile(join(process.cwd(), 'logs', 'token_logs.json'), 'utf-8');
  const phasesRaw = await readFile(join(process.cwd(), 'logs', 'benchmark_phases.json'), 'utf-8');

  const systemRows = systemMetricsRaw
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .filter(Boolean);

  const tokenRows = JSON.parse(tokenLogsRaw);
  const phases = JSON.parse(phasesRaw);

  const baselineSystemRows = systemRows.filter((row) => withinWindow(row.timestamp, phases.baseline.startedAt, phases.baseline.endedAt));
  const mcpSystemRows = systemRows.filter((row) => withinWindow(row.timestamp, phases.mcp.startedAt, phases.mcp.endedAt));

  const baselineTokenRows = tokenRows.filter((row) => row.mode === 'baseline' || String(row.task).startsWith('baseline_'));
  const mcpTokenRows = tokenRows.filter((row) => row.mode === 'mcp' || String(row.task).startsWith('mcp_'));

  const baseline = summarize(baselineSystemRows, baselineTokenRows);
  const mcp = summarize(mcpSystemRows, mcpTokenRows);
  const overall = summarize(systemRows, tokenRows);

  const cpuReduction = percentageReduction(baseline.peakCpu, mcp.peakCpu);
  const tokenReduction = percentageReduction(baseline.totalTokens, mcp.totalTokens);

  const tokenByTask = tokenRows.reduce((acc, row) => {
    const taskName = row.task || row.source || 'unknown_task';
    const total = (row.prompt_tokens || 0) + (row.completion_tokens || 0);
    acc[taskName] = (acc[taskName] || 0) + total;
    return acc;
  }, {});

  const summary = {
    generatedAt: new Date().toISOString(),
    overall,
    baseline,
    mcp,
    comparison: {
      cpuReduction,
      tokenReduction,
    },
    cpuSeries: systemRows.map((row) => ({ timestamp: row.timestamp, cpu: row.cpu })),
    tokenByTask,
  };

  const markdown = [
    '# Benchmark Report',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    '## System Metrics',
    '',
    `Peak CPU: ${numberCell(overall.peakCpu, '%')}`,
    `Average CPU: ${numberCell(overall.averageCpu, '%')}`,
    `Average RAM Available: ${numberCell(overall.averageRamAvailable)} MB`,
    '',
    '## Token Metrics',
    '',
    `Total Prompt Tokens: ${toFixedNumber(overall.totalPromptTokens, 0)}`,
    `Total Completion Tokens: ${toFixedNumber(overall.totalCompletionTokens, 0)}`,
    `Total Tokens: ${toFixedNumber(overall.totalTokens, 0)}`,
    `Average Tokens per Task: ${numberCell(overall.averageTokensPerTask)}`,
    '',
    '## Performance Benchmark',
    '',
    'Traditional AI Indexing',
    `CPU Peak: ${numberCell(baseline.peakCpu, '%')}`,
    `Tokens: ${toFixedNumber(baseline.totalTokens, 0)}`,
    '',
    'MCP Constrained Context',
    `CPU Peak: ${numberCell(mcp.peakCpu, '%')}`,
    `Tokens: ${toFixedNumber(mcp.totalTokens, 0)}`,
    '',
    'Improvement',
    `CPU Reduction: ${numberCell(cpuReduction, '%')}`,
    `Token Reduction: ${numberCell(tokenReduction, '%')}`,
    '',
  ].join('\n');

  await writeFile(join(process.cwd(), 'reports', 'benchmark_report.md'), markdown, 'utf-8');
  await writeFile(join(process.cwd(), 'logs', 'analysis_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
}

analyze().catch((error) => {
  console.error('Analysis failed:', error.message);
  process.exitCode = 1;
});

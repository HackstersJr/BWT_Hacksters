const { mkdir, writeFile } = require('node:fs/promises');
const { spawn, spawnSync } = require('node:child_process');
const { join } = require('node:path');

const { resetTokenLogs } = require('../src/utils/telemetry.js');
const { runMcpBenchmarkTasks, runBaselineBenchmarkTasks } = require('./extractors.js');

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Script failed: ${scriptPath}`);
  }
}

async function prepareWorkspace() {
  await mkdir(join(process.cwd(), 'benchmark'), { recursive: true });
  await mkdir(join(process.cwd(), 'logs'), { recursive: true });
  await mkdir(join(process.cwd(), 'reports'), { recursive: true });
  await mkdir(join(process.cwd(), 'charts'), { recursive: true });
  await writeFile(join(process.cwd(), 'logs', 'system_metrics.csv'), 'Timestamp,CPU %,Available RAM (MB)\n', 'utf-8');
  await resetTokenLogs();
}

function startSystemMonitor() {
  return spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', 'scripts/monitor.ps1', '-OutputFile', 'logs/system_metrics.csv', '-IntervalSeconds', '1'], {
    stdio: 'ignore',
  });
}

async function stopSystemMonitor(monitorProcess) {
  if (!monitorProcess || monitorProcess.killed) {
    return;
  }

  monitorProcess.kill('SIGINT');

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!monitorProcess.killed) {
        spawnSync('taskkill', ['/PID', String(monitorProcess.pid), '/T', '/F'], { stdio: 'ignore' });
      }
      resolve();
    }, 2000);

    monitorProcess.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function runBenchmark() {
  const benchmarkStartedAt = new Date().toISOString();
  const startedMs = Date.now();

  await prepareWorkspace();

  const monitorProcess = startSystemMonitor();
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const baselineStart = new Date().toISOString();
  const baselineTasks = await runBaselineBenchmarkTasks();
  const baselineEnd = new Date().toISOString();

  const mcpStart = new Date().toISOString();
  const mcpTasks = await runMcpBenchmarkTasks();
  const mcpEnd = new Date().toISOString();

  await new Promise((resolve) => setTimeout(resolve, 1200));

  await stopSystemMonitor(monitorProcess);

  const benchmarkEndedAt = new Date().toISOString();
  const durationMs = Date.now() - startedMs;

  const phases = {
    benchmarkStartedAt,
    benchmarkEndedAt,
    durationMs,
    baseline: {
      startedAt: baselineStart,
      endedAt: baselineEnd,
      tasks: baselineTasks,
    },
    mcp: {
      startedAt: mcpStart,
      endedAt: mcpEnd,
      tasks: mcpTasks,
    },
  };

  await writeFile(
    join(process.cwd(), 'logs', 'benchmark_phases.json'),
    JSON.stringify(phases, null, 2),
    'utf-8'
  );

  runNodeScript(join(process.cwd(), 'benchmark', 'analyze.js'));
  runNodeScript(join(process.cwd(), 'benchmark', 'charts.js'));

  if (durationMs > 60000) {
    throw new Error(`Benchmark exceeded 60 seconds: ${durationMs}ms`);
  }
}

runBenchmark()
  .then(() => {
    console.log('Benchmark completed. Report: reports/benchmark_report.md');
  })
  .catch((error) => {
    console.error('Benchmark failed:', error.message);
    process.exitCode = 1;
  });

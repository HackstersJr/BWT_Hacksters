const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

const LOG_FILE_PATH = join(process.cwd(), 'logs', 'token_logs.json');

async function resetTokenLogs() {
  await mkdir(join(process.cwd(), 'logs'), { recursive: true });
  await writeFile(LOG_FILE_PATH, '[]', 'utf-8');
}

async function logTokenUsage(usage, completionTokens, source) {
  const normalizedUsage = typeof usage === 'number'
    ? {
      prompt_tokens: usage,
      completion_tokens: completionTokens ?? 0,
      task: source ?? 'unknown_task',
      source: source ?? 'unknown_source',
      mode: 'unknown',
    }
    : usage;

  const record = {
    timestamp: normalizedUsage.timestamp ?? new Date().toISOString(),
    source: normalizedUsage.source ?? normalizedUsage.task,
    task: normalizedUsage.task,
    mode: normalizedUsage.mode ?? 'unknown',
    prompt_tokens: normalizedUsage.prompt_tokens,
    completion_tokens: normalizedUsage.completion_tokens,
    total_tokens: (normalizedUsage.prompt_tokens || 0) + (normalizedUsage.completion_tokens || 0),
  };

  try {
    await mkdir(join(process.cwd(), 'logs'), { recursive: true });
    let logs = [];
    try {
      const fileData = await readFile(LOG_FILE_PATH, 'utf-8');
      logs = JSON.parse(fileData);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`[Telemetry] Failed to read token logs: ${err.message}`);
      }
    }

    logs.push(record);
    await writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Telemetry] Error logging token usage:', error);
  }
}

module.exports = {
  logTokenUsage,
  resetTokenLogs,
};

// backend/src/middleware/tokenLogger.js
// Intercepts response payloads and logs LLM token usage to token_logs.json

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../token_logs.json');

/**
 * Read existing logs, defaulting to empty array if file is missing or corrupt.
 */
function readLogs() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const raw = fs.readFileSync(LOG_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (_) { }
    return [];
}

/**
 * Append a token record to token_logs.json synchronously.
 */
function writeLog(record) {
    const logs = readLogs();
    logs.push(record);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

/**
 * Express middleware: intercepts res.json() to extract token usage.
 * Attach to any route where you want LLM token tracking.
 */
function tokenLogger(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
        // Check if the response payload has standard LLM token usage
        if (body && body.usage) {
            const { prompt_tokens, completion_tokens } = body.usage;
            if (typeof prompt_tokens === 'number' || typeof completion_tokens === 'number') {
                const record = {
                    timestamp: new Date().toISOString(),
                    endpoint: req.originalUrl,
                    method: req.method,
                    prompt_tokens: prompt_tokens || 0,
                    completion_tokens: completion_tokens || 0,
                    total_tokens: (prompt_tokens || 0) + (completion_tokens || 0),
                };
                try {
                    writeLog(record);
                } catch (err) {
                    console.error('[TokenLogger] Failed to write log:', err.message);
                }
            }
        }
        return originalJson(body);
    };

    next();
}

module.exports = tokenLogger;

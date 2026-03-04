import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Assume project root since this is in src/utils
const LOG_FILE_PATH = join(process.cwd(), 'token_logs.json');

export interface TokenRecord {
    timestamp: string;
    source: string;
    prompt_tokens: number;
    completion_tokens: number;
}

/**
 * Appends LLM token usage to a local JSON tracking file.
 * Creates the array file if it doesn't already exist.
 *
 * @param promptTokens - Number of tokens used in the prompt
 * @param completionTokens - Number of tokens generated
 * @param source - Identifier for the endpoint or tool generating the traffic
 */
export async function logTokenUsage(
    promptTokens: number,
    completionTokens: number,
    source: string
): Promise<void> {
    const record: TokenRecord = {
        timestamp: new Date().toISOString(),
        source,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
    };

    try {
        let logs: TokenRecord[] = [];
        try {
            // Try reading existing logs
            const fileData = await readFile(LOG_FILE_PATH, 'utf-8');
            logs = JSON.parse(fileData);
        } catch (err: any) {
            // If file doesn't exist, ignore and start fresh array
            if (err.code !== 'ENOENT') {
                console.warn(`[Telemetry] Failed to read token logs: ${err.message}`);
            }
        }

        logs.push(record);

        // Write back entire array
        // Note: for extreme scale, a newline-delimited JSON (NDJSON) string append is faster
        // but the spec required a JSON file/array handled gracefully without heavy dependencies.
        await writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (error) {
        console.error('[Telemetry] Error logging token usage:', error);
    }
}

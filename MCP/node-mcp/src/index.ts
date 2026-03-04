import { spawn } from "node:child_process";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

type DelegateInput = {
  user_prompt: string;
  highlighted_code: string;
  highlighted_symbol?: string;
  max_iterations?: number;
};

type JsonRecord = Record<string, unknown>;

const MCP_TOOL_NAME = "delegate_to_local_subagent";
const AXON_INTERNAL_TOOLS = new Set([
  "axon_query",
  "axon_context",
  "axon_impact",
  "axon_dead_code",
  "axon_detect_changes",
  "axon_cypher",
]);

const SUBPROCESS_TIMEOUT_MS = 20_000;
const SUBPROCESS_OUTPUT_CAP = 64_000;
const CYPHER_MAX_LENGTH = 4_000;
const LLM_TIMEOUT_MS = 60_000;
const MAX_USER_PROMPT_LENGTH = 12_000;
const MAX_HIGHLIGHTED_CODE_LENGTH = 30_000;
const MAX_HIGHLIGHTED_SYMBOL_LENGTH = 512;

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.trunc(value);
  return Math.max(min, Math.min(max, rounded));
}

function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

function parseDelegateInput(args: unknown): DelegateInput {
  const obj = (args ?? {}) as JsonRecord;
  if (typeof obj.user_prompt !== "string" || typeof obj.highlighted_code !== "string") {
    throw new Error("Invalid input: user_prompt and highlighted_code must be strings.");
  }

  const parsed: DelegateInput = {
    user_prompt: obj.user_prompt,
    highlighted_code: obj.highlighted_code,
  };

  if (parsed.user_prompt.length === 0 || parsed.user_prompt.length > MAX_USER_PROMPT_LENGTH) {
    throw new Error(
      `Invalid input: user_prompt length must be between 1 and ${MAX_USER_PROMPT_LENGTH} characters.`,
    );
  }

  if (
    parsed.highlighted_code.length === 0 ||
    parsed.highlighted_code.length > MAX_HIGHLIGHTED_CODE_LENGTH
  ) {
    throw new Error(
      `Invalid input: highlighted_code length must be between 1 and ${MAX_HIGHLIGHTED_CODE_LENGTH} characters.`,
    );
  }

  if (typeof obj.highlighted_symbol === "string") {
    if (obj.highlighted_symbol.length > MAX_HIGHLIGHTED_SYMBOL_LENGTH) {
      throw new Error(
        `Invalid input: highlighted_symbol max length is ${MAX_HIGHLIGHTED_SYMBOL_LENGTH} characters.`,
      );
    }
    parsed.highlighted_symbol = obj.highlighted_symbol;
  }
  if (typeof obj.max_iterations === "number") {
    parsed.max_iterations = obj.max_iterations;
  }

  return parsed;
}

function safeJson(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return JSON.stringify({ error: "Failed to serialize JSON output." });
  }
}

function parseStrictBackendJson(stdout: string): JsonRecord | null {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as JsonRecord;
  } catch {
    return null;
  }
}

async function runAxonBackendTool(tool: string, args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  const pythonCmd = process.env.AXON_PYTHON_CMD || "python";

  return await new Promise<JsonRecord>((resolve) => {
    const child = spawn(pythonCmd, ["-m", "axon.subagent_backend", "run-tool", tool, "--stdin-args"], {
      cwd: repoRoot,
      shell: false,
      env: process.env,
    });

    let timedOut = false;
    let outputTruncated = false;
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, SUBPROCESS_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length >= SUBPROCESS_OUTPUT_CAP) {
        outputTruncated = true;
        return;
      }
      stdout += chunk.toString("utf8");
      if (stdout.length > SUBPROCESS_OUTPUT_CAP) {
        stdout = stdout.slice(0, SUBPROCESS_OUTPUT_CAP);
        outputTruncated = true;
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length >= SUBPROCESS_OUTPUT_CAP) {
        outputTruncated = true;
        return;
      }
      stderr += chunk.toString("utf8");
      if (stderr.length > SUBPROCESS_OUTPUT_CAP) {
        stderr = stderr.slice(0, SUBPROCESS_OUTPUT_CAP);
        outputTruncated = true;
      }
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        tool,
        error: {
          type: "spawn_error",
          message: asError(error).message,
        },
      });
    });

    const jsonArgs = JSON.stringify(args);
    child.stdin.write(jsonArgs, "utf8");
    child.stdin.end();

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          ok: false,
          tool,
          error: {
            type: timedOut ? "timeout" : "process_error",
            exit_code: code,
            signal,
            stderr,
            stdout,
            output_truncated: outputTruncated,
          },
        });
        return;
      }

      const parsed = parseStrictBackendJson(stdout);
      if (!parsed) {
        resolve({
          ok: false,
          tool,
          error: {
            type: "invalid_backend_json",
            message: "Backend returned non-JSON or invalid JSON output.",
            stdout,
            stderr,
            output_truncated: outputTruncated,
          },
        });
        return;
      }

      resolve({
        ...parsed,
        raw_stdout: stdout,
        raw_stderr: stderr,
        output_truncated: outputTruncated,
      });
    });
  });
}

async function executeInternalTool(name: string, args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  if (!AXON_INTERNAL_TOOLS.has(name)) {
    return {
      ok: false,
      error: {
        type: "disallowed_tool",
        message: `Internal tool '${name}' is not allowed.`,
      },
    };
  }

  switch (name) {
    case "axon_query": {
      const q = typeof args.query === "string" ? args.query : "";
      const limit = clampInteger(args.limit, 20, 1, 50);
      return await runAxonBackendTool("axon_query", { query: q, limit }, repoRoot);
    }
    case "axon_context": {
      const symbol = typeof args.symbol === "string" ? args.symbol : "";
      return await runAxonBackendTool("axon_context", { symbol }, repoRoot);
    }
    case "axon_impact": {
      const symbol = typeof args.symbol === "string" ? args.symbol : "";
      const depth = clampInteger(args.depth, 3, 1, 10);
      return await runAxonBackendTool("axon_impact", { symbol, depth }, repoRoot);
    }
    case "axon_dead_code": {
      return await runAxonBackendTool("axon_dead_code", {}, repoRoot);
    }
    case "axon_detect_changes": {
      const diff = typeof args.diff === "string" ? args.diff : "";
      return await runAxonBackendTool("axon_detect_changes", { diff }, repoRoot);
    }
    case "axon_cypher": {
      const query = typeof args.query === "string" ? args.query : "";
      if (query.length > CYPHER_MAX_LENGTH) {
        return {
          ok: false,
          error: {
            type: "validation_error",
            message: `Cypher query too long. Max length is ${CYPHER_MAX_LENGTH}.`,
          },
        };
      }
      return await runAxonBackendTool("axon_cypher", { query }, repoRoot);
    }
    default:
      return {
        ok: false,
        error: {
          type: "unknown_tool",
          message: `Unknown tool '${name}'.`,
        },
      };
  }
}

const internalFunctionTools = [
  {
    type: "function",
    function: {
      name: "axon_query",
      description: "Search the local project knowledge graph.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "axon_context",
      description: "Get context around a symbol.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "axon_impact",
      description: "Analyze blast radius of a symbol change.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          depth: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "axon_dead_code",
      description: "List dead code symbols.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "axon_detect_changes",
      description: "Map git diff output to affected symbols.",
      parameters: {
        type: "object",
        properties: {
          diff: { type: "string" },
        },
        required: ["diff"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "axon_cypher",
      description: "Run a read-only cypher query against the local graph.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
] as const satisfies ReadonlyArray<ChatCompletionTool>;

const mutableInternalFunctionTools: ChatCompletionTool[] = [...internalFunctionTools];

async function delegateToLocalSubagent(input: DelegateInput): Promise<JsonRecord> {
  const maxIterations = clampInteger(input.max_iterations, 6, 1, 10);
  const repoRoot = process.env.AXON_REPO_ROOT || process.cwd();
  const model = process.env.LOCAL_MODEL || "local-model";

  const client = new OpenAI({
    baseURL: "http://localhost:1234/v1",
    apiKey: process.env.OPENAI_API_KEY || "lm-studio",
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a local coding subagent. Use available tools when needed. Return concise, actionable final text.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          user_prompt: input.user_prompt,
          highlighted_code: input.highlighted_code,
          highlighted_symbol: input.highlighted_symbol ?? null,
          constraints: {
            max_iterations: maxIterations,
          },
        },
        null,
        2,
      ),
    },
  ];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), LLM_TIMEOUT_MS);

    let completion;
    try {
      completion = await client.chat.completions.create(
        {
          model,
          messages,
          tools: mutableInternalFunctionTools,
          tool_choice: "auto",
          temperature: 0.2,
        },
        { signal: abortController.signal },
      );
    } catch (error) {
      clearTimeout(timeout);
      return {
        ok: false,
        error: {
          type: "llm_timeout_or_error",
          message: asError(error).message,
          iteration,
        },
      };
    }
    clearTimeout(timeout);

    const message = completion.choices[0]?.message;
    if (!message) {
      return {
        ok: false,
        error: {
          type: "model_error",
          message: "Model returned no message.",
        },
      };
    }

    const toolCalls = message.tool_calls ?? [];
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    });

    if (toolCalls.length === 0) {
      const content = typeof message.content === "string" ? message.content : safeJson(message.content);
      return {
        ok: true,
        iterations_used: iteration,
        final_text: content,
      };
    }

    for (const call of toolCalls) {
      const toolName = call.function.name;
      let parsedArgs: JsonRecord = {};
      try {
        parsedArgs = call.function.arguments ? (JSON.parse(call.function.arguments) as JsonRecord) : {};
      } catch {
        parsedArgs = {};
      }

      const result = await executeInternalTool(toolName, parsedArgs, repoRoot);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: safeJson(result),
      });
    }
  }

  return {
    ok: true,
    iterations_used: maxIterations,
    final_text: "Iteration cap reached before model produced final text.",
  };
}

const server = new Server(
  {
    name: "delegate-node-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: MCP_TOOL_NAME,
        description: "Delegate request to a local LLM subagent with guarded internal tools.",
        inputSchema: {
          type: "object",
          properties: {
            user_prompt: { type: "string" },
            highlighted_code: { type: "string" },
            highlighted_symbol: { type: "string" },
            max_iterations: { type: "integer", minimum: 1, maximum: 10, default: 6 },
          },
          required: ["user_prompt", "highlighted_code"],
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== MCP_TOOL_NAME) {
    return {
      content: [{ type: "text", text: "Unknown tool." }],
      isError: true,
    };
  }

  try {
    const input = parseDelegateInput(request.params.arguments);
    const output = await delegateToLocalSubagent(input);
    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      isError: output.ok === false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              ok: false,
              error: {
                type: "validation_error",
                message: asError(error).message,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const err = asError(error);
  process.stderr.write(`Node MCP server failed: ${err.message}\n`);
  process.exit(1);
});

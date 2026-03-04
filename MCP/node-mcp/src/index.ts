import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import { URL } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { YoutubeTranscript } from "youtube-transcript";

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
  "rag_extract_resource",
  "rag_query_knowledge",
  "rag_store_note",
]);

const SUBPROCESS_TIMEOUT_MS = 20_000;
const SUBPROCESS_OUTPUT_CAP = 64_000;
const CYPHER_MAX_LENGTH = 4_000;
const LLM_TIMEOUT_MS = 60_000;
const MAX_USER_PROMPT_LENGTH = 12_000;
const MAX_HIGHLIGHTED_CODE_LENGTH = 30_000;
const MAX_HIGHLIGHTED_SYMBOL_LENGTH = 512;
const RAG_FETCH_TIMEOUT_MS = 20_000;
const RAG_MAX_RESOURCE_TEXT = 30_000;
const RAG_MAX_SNIPPET_CHARS = 8_000;
const RAG_MAX_RESULTS = 5;
const RAG_MAX_STORE_SUMMARY = 12_000;
const RAG_FETCH_MAX_BYTES = 1_500_000;
const RAG_MAX_KNOWLEDGE_SCAN_LINES = 5_000;

type KnowledgeRecord = {
  id: string;
  created_at: string;
  source_url: string;
  source_type: "youtube" | "web";
  title?: string;
  summary: string;
  linked_symbol?: string;
  tags?: string[];
};

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

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((v) => Number.parseInt(v, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 127) {
    return true;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  if (parts[0] === 169 && parts[1] === 254) {
    return true;
  }
  if (parts[0] === 0) {
    return true;
  }
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1" || normalized === "::") {
    return true;
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isPrivateIpv4(mapped);
  }
  return false;
}

function isBlockedIpAddress(address: string): boolean {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }
  return false;
}

async function validateExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    throw new Error("Only http/https URLs are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error("Localhost URLs are blocked.");
  }

  if (isBlockedIpAddress(hostname)) {
    throw new Error("Private/local IP URLs are blocked.");
  }

  if (net.isIP(hostname) === 0) {
    let resolved;
    try {
      resolved = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Failed to resolve external hostname.");
    }

    if (!resolved.length) {
      throw new Error("Resolved hostname has no addresses.");
    }

    if (resolved.some((entry) => isBlockedIpAddress(entry.address))) {
      throw new Error("Resolved URL points to local/private network address.");
    }
  }

  return parsed;
}

function isYoutubeUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host.includes("youtube.com") || host.includes("youtu.be");
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractWebResource(url: string): Promise<{ text: string; title?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RAG_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Trae-Subagent-Context-MCP/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const contentLengthRaw = response.headers.get("content-length");
    if (contentLengthRaw) {
      const contentLength = Number.parseInt(contentLengthRaw, 10);
      if (Number.isFinite(contentLength) && contentLength > RAG_FETCH_MAX_BYTES) {
        throw new Error(`Resource too large. Max allowed bytes: ${RAG_FETCH_MAX_BYTES}.`);
      }
    }

    if (!response.body) {
      throw new Error("Resource has no response body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let body = "";
    let bytesRead = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      bytesRead += value.byteLength;
      if (bytesRead > RAG_FETCH_MAX_BYTES) {
        throw new Error(`Resource exceeded max bytes: ${RAG_FETCH_MAX_BYTES}.`);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();

    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim();
    const text = htmlToText(body).slice(0, RAG_MAX_RESOURCE_TEXT);

    if (!text) {
      throw new Error("No extractable text found in resource.");
    }

    return { text, title };
  } finally {
    clearTimeout(timer);
  }
}

async function extractYoutubeTranscript(url: string): Promise<{ text: string; title?: string }> {
  const rows = await YoutubeTranscript.fetchTranscript(url);
  const text = rows
    .map((row) => row.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, RAG_MAX_RESOURCE_TEXT);

  if (!text) {
    throw new Error("No transcript extracted from YouTube resource.");
  }

  return { text };
}

function knowledgeDir(repoRoot: string): string {
  return path.join(repoRoot, ".axon", "knowledge_base");
}

async function appendKnowledgeRecord(repoRoot: string, record: KnowledgeRecord): Promise<void> {
  const dir = knowledgeDir(repoRoot);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "resources.jsonl");
  await fs.appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
}

async function ragExtractAndPersist(args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  const rawUrl = typeof args.url === "string" ? args.url.trim() : "";
  if (!rawUrl) {
    return {
      ok: false,
      error: { type: "validation_error", message: "'url' is required." },
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = await validateExternalUrl(rawUrl);
  } catch (error) {
    return {
      ok: false,
      error: { type: "validation_error", message: asError(error).message },
    };
  }

  let extracted: { text: string; title?: string };
  try {
    extracted = isYoutubeUrl(parsedUrl)
      ? await extractYoutubeTranscript(parsedUrl.toString())
      : await extractWebResource(parsedUrl.toString());
  } catch (error) {
    return {
      ok: false,
      error: { type: "extraction_error", message: asError(error).message },
    };
  }

  const sourceType: KnowledgeRecord["source_type"] = isYoutubeUrl(parsedUrl) ? "youtube" : "web";
  const linkedSymbol = typeof args.linked_symbol === "string" ? args.linked_symbol : undefined;
  const tags = Array.isArray(args.tags)
    ? args.tags.filter((t): t is string => typeof t === "string").slice(0, 10)
    : undefined;

  const snippet = extracted.text.slice(0, RAG_MAX_SNIPPET_CHARS);
  const id = createHash("sha256").update(`${parsedUrl.toString()}|${snippet}`).digest("hex").slice(0, 16);

  const record: KnowledgeRecord = {
    id,
    created_at: new Date().toISOString(),
    source_url: parsedUrl.toString(),
    source_type: sourceType,
    title: extracted.title,
    summary: snippet,
    linked_symbol: linkedSymbol,
    tags,
  };

  await appendKnowledgeRecord(repoRoot, record);

  return {
    ok: true,
    record_id: id,
    source_type: sourceType,
    source_url: parsedUrl.toString(),
    title: extracted.title ?? null,
    stored_path: path.join(".axon", "knowledge_base", "resources.jsonl"),
    snippet,
  };
}

async function ragStoreNote(args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  const sourceUrl = typeof args.source_url === "string" ? args.source_url.trim() : "";
  const summary = typeof args.summary === "string" ? args.summary.trim() : "";
  if (!sourceUrl || !summary) {
    return {
      ok: false,
      error: { type: "validation_error", message: "'source_url' and 'summary' are required." },
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = await validateExternalUrl(sourceUrl);
  } catch (error) {
    return {
      ok: false,
      error: { type: "validation_error", message: asError(error).message },
    };
  }

  const linkedSymbol = typeof args.linked_symbol === "string" ? args.linked_symbol : undefined;
  const tags = Array.isArray(args.tags)
    ? args.tags.filter((t): t is string => typeof t === "string").slice(0, 10)
    : undefined;

  const summaryClamped = summary.slice(0, RAG_MAX_STORE_SUMMARY);
  const id = createHash("sha256").update(`${parsedUrl.toString()}|${summaryClamped}`).digest("hex").slice(0, 16);

  const record: KnowledgeRecord = {
    id,
    created_at: new Date().toISOString(),
    source_url: parsedUrl.toString(),
    source_type: isYoutubeUrl(parsedUrl) ? "youtube" : "web",
    summary: summaryClamped,
    linked_symbol: linkedSymbol,
    tags,
  };

  await appendKnowledgeRecord(repoRoot, record);

  return {
    ok: true,
    record_id: id,
    stored_path: path.join(".axon", "knowledge_base", "resources.jsonl"),
  };
}

async function ragQueryKnowledge(args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  const query = typeof args.query === "string" ? args.query.toLowerCase().trim() : "";
  const limit = clampInteger(args.limit, 3, 1, RAG_MAX_RESULTS);
  const file = path.join(knowledgeDir(repoRoot), "resources.jsonl");

  const content = await fs.readFile(file, "utf8").catch(() => "");
  if (!content) {
    return { ok: true, results: [] };
  }

  const rows = content
    .split("\n")
    .slice(0, RAG_MAX_KNOWLEDGE_SCAN_LINES)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return JSON.parse(line) as KnowledgeRecord;
      } catch {
        return null;
      }
    })
    .filter((row): row is KnowledgeRecord => row !== null);

  const scored = rows
    .map((row) => {
      const haystack = `${row.summary} ${row.source_url} ${row.title ?? ""} ${(row.tags ?? []).join(" ")}`.toLowerCase();
      const score = query
        ? query
            .split(/\s+/)
            .filter((t) => t.length > 1)
            .reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0)
        : 1;
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.row.id,
      source_url: entry.row.source_url,
      source_type: entry.row.source_type,
      title: entry.row.title ?? null,
      linked_symbol: entry.row.linked_symbol ?? null,
      summary: entry.row.summary,
      created_at: entry.row.created_at,
      score: entry.score,
    }));

  return {
    ok: true,
    total_indexed: rows.length,
    results: scored,
  };
}

async function runAxonBackendTool(tool: string, args: JsonRecord, repoRoot: string): Promise<JsonRecord> {
  const pythonCmdRaw = process.env.AXON_PYTHON_CMD || "python";
  const pythonCmd =
    pythonCmdRaw.includes("/") && !path.isAbsolute(pythonCmdRaw)
      ? path.resolve(repoRoot, pythonCmdRaw)
      : pythonCmdRaw;
  const pythonPathRaw = process.env.PYTHONPATH || path.join(repoRoot, "MCP", "axon", "src");
  const pythonPath = path.isAbsolute(pythonPathRaw)
    ? pythonPathRaw
    : path.resolve(process.cwd(), pythonPathRaw);

  return await new Promise<JsonRecord>((resolve) => {
    const child = spawn(pythonCmd, ["-m", "axon.subagent_backend", "run-tool", tool, "--stdin-args"], {
      cwd: repoRoot,
      shell: false,
      env: {
        ...process.env,
        PYTHONPATH: pythonPath,
      },
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
    case "rag_extract_resource": {
      return await ragExtractAndPersist(args, repoRoot);
    }
    case "rag_query_knowledge": {
      return await ragQueryKnowledge(args, repoRoot);
    }
    case "rag_store_note": {
      return await ragStoreNote(args, repoRoot);
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
      name: "rag_extract_resource",
      description:
        "Extract a YouTube/web resource, return snippet context, and persist it to .axon/knowledge_base/resources.jsonl.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          linked_symbol: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rag_query_knowledge",
      description: "Query persisted knowledge snippets from .axon/knowledge_base/resources.jsonl.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rag_store_note",
      description:
        "Persist a distilled note (typically created by the local LLM) for future context retrieval.",
      parameters: {
        type: "object",
        properties: {
          source_url: { type: "string" },
          summary: { type: "string" },
          linked_symbol: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["source_url", "summary"],
      },
    },
  },
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
  const repoRoot = path.resolve(process.env.AXON_REPO_ROOT || process.cwd());
  const model = process.env.LOCAL_MODEL || "local-model";

  const client = new OpenAI({
    baseURL: "http://localhost:1234/v1",
    apiKey: process.env.OPENAI_API_KEY || "lm-studio",
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a local coding subagent. Use available tools when needed. For external docs/videos, first call rag_extract_resource, then produce distilled guidance and optionally persist it with rag_store_note. Return concise, actionable final text.",
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

import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import { promises as fs } from "node:fs";
import net from "node:net";
import path from "node:path";
import { URL } from "node:url";
import { YoutubeTranscript } from "youtube-transcript";

const RAG_MAX_RESOURCE_TEXT = 30000;
const RAG_FETCH_MAX_BYTES = 1500000;

function isYoutubeUrl(url) {
  const host = url.hostname.toLowerCase();
  return host.includes("youtube.com") || host.includes("youtu.be");
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map((v) => Number.parseInt(v, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
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

function isBlockedIpAddress(address) {
  const version = net.isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return false;
}

async function validateExternalUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error("Localhost URLs are blocked");
  }

  if (isBlockedIpAddress(hostname)) {
    throw new Error("Private/local IP URLs are blocked");
  }

  if (net.isIP(hostname) === 0) {
    const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
    if (resolved.some((entry) => isBlockedIpAddress(entry.address))) {
      throw new Error("Resolved URL points to local/private network address");
    }
  }

  return parsed;
}

function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractWeb(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Trae-Subagent-Context-MCP/0.1" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentLengthRaw = response.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLength = Number.parseInt(contentLengthRaw, 10);
    if (Number.isFinite(contentLength) && contentLength > RAG_FETCH_MAX_BYTES) {
      throw new Error(`Resource too large (>${RAG_FETCH_MAX_BYTES} bytes)`);
    }
  }
  if (!response.body) throw new Error("Missing response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > RAG_FETCH_MAX_BYTES) {
      throw new Error(`Resource exceeded max bytes (${RAG_FETCH_MAX_BYTES})`);
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  return htmlToText(body).slice(0, RAG_MAX_RESOURCE_TEXT);
}

async function extractYoutube(url) {
  const rows = await YoutubeTranscript.fetchTranscript(url);
  return rows
    .map((r) => r.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, RAG_MAX_RESOURCE_TEXT);
}

async function main() {
  const rawUrl = process.argv[2];
  if (!rawUrl) {
    throw new Error("Usage: node scripts/rag-direct-check.mjs <url>");
  }

  const url = await validateExternalUrl(rawUrl);
  const text = isYoutubeUrl(url) ? await extractYoutube(url.toString()) : await extractWeb(url.toString());
  if (!text) throw new Error("No text extracted");

  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const kbDir = path.join(repoRoot, ".axon", "knowledge_base");
  await fs.mkdir(kbDir, { recursive: true });

  const id = createHash("sha256").update(`${url.toString()}|${text.slice(0, 2000)}`).digest("hex").slice(0, 16);
  const record = {
    id,
    created_at: new Date().toISOString(),
    source_url: url.toString(),
    source_type: isYoutubeUrl(url) ? "youtube" : "web",
    summary: text.slice(0, 8000),
  };

  const outFile = path.join(kbDir, "resources.jsonl");
  await fs.appendFile(outFile, `${JSON.stringify(record)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        id,
        stored_path: path.relative(repoRoot, outFile),
        snippet: record.summary.slice(0, 200),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`rag-direct-check failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

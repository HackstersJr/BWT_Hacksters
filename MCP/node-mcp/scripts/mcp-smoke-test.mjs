import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
const nodeMcpRoot = path.resolve(__dirname, "..");
const axonRoot = path.resolve(workspaceRoot, "MCP", "axon");
const workspacePython = process.env.AXON_PYTHON || path.resolve(workspaceRoot, ".venv", "bin", "python");

function buildServerConfig(name) {
  if (name === "node") {
    return {
      command: "npm",
      args: ["run", "build-and-start"],
      cwd: nodeMcpRoot,
      env: process.env,
    };
  }

  if (name === "axon") {
    return {
      command: workspacePython,
      args: ["-m", "axon.mcp.server"],
      cwd: axonRoot,
      env: {
        ...process.env,
        PYTHONPATH: path.join(axonRoot, "src"),
      },
    };
  }

  throw new Error(`Unknown server target: ${name}`);
}

async function smokeNodeDelegate() {
  const transport = new StdioClientTransport(buildServerConfig("node"));
  const client = new Client({ name: "mcp-smoke-node", version: "0.1.0" });

  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  const hasDelegate = names.includes("delegate_to_local_subagent");

  await client.close();

  return {
    ok: hasDelegate,
    listedTools: names,
    check: "delegate_to_local_subagent present",
  };
}

async function smokeAxonListRepos() {
  const transport = new StdioClientTransport(buildServerConfig("axon"));
  const client = new Client({ name: "mcp-smoke-axon", version: "0.1.0" });

  await client.connect(transport);

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  const hasListRepos = names.includes("axon_list_repos");

  let callResult = null;
  let callError = null;

  if (hasListRepos) {
    try {
      callResult = await client.callTool({ name: "axon_list_repos", arguments: {} });
    } catch (error) {
      callError = error instanceof Error ? error.message : String(error);
    }
  }

  await client.close();

  return {
    ok: hasListRepos && !callError,
    listedTools: names,
    hasListRepos,
    callError,
    callResult,
  };
}

async function main() {
  const target = process.argv[2] ?? "all";
  const summary = { target, results: {} };

  if (target === "all" || target === "node") {
    summary.results.node = await smokeNodeDelegate();
  }

  if (target === "all" || target === "axon") {
    summary.results.axon = await smokeAxonListRepos();
  }

  const nodeOk = !summary.results.node || summary.results.node.ok;
  const axonOk = !summary.results.axon || summary.results.axon.ok;
  const ok = nodeOk && axonOk;

  process.stdout.write(`${JSON.stringify({ ok, ...summary }, null, 2)}\n`);

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`Smoke test failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

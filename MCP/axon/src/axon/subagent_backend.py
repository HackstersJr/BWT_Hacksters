"""JSON backend for local Node orchestration.

This module provides a minimal Typer CLI that executes a supported Axon
tool handler and emits strict JSON envelopes to stdout.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import typer

from axon.mcp import tools as mcp_tools

app = typer.Typer(no_args_is_help=True, add_completion=False)

_SUPPORTED_TOOLS = {
    "axon_query",
    "axon_context",
    "axon_impact",
    "axon_dead_code",
    "axon_detect_changes",
    "axon_cypher",
}

_CYPHER_MAX_LENGTH = 4000
_QUERY_MAX_LENGTH = 4000
_SYMBOL_MAX_LENGTH = 1024
_DIFF_MAX_LENGTH = 500000
_MAX_RESULT_LENGTH = 48_000
_MAX_STDIN_ARGS_LENGTH = 500_000


@app.callback()
def main() -> None:
    """Axon subagent backend entrypoint."""


def _emit(payload: dict[str, Any]) -> None:
    """Emit one strict JSON payload to stdout."""
    typer.echo(json.dumps(payload, ensure_ascii=False))


def _ok(tool: str, result: Any) -> dict[str, Any]:
    serialized_result = json.dumps(result, ensure_ascii=False)

    if isinstance(result, str) and len(result) > _MAX_RESULT_LENGTH:
        result = (
            result[:_MAX_RESULT_LENGTH]
            + "\n\n[truncated by subagent backend due to output size limit]"
        )
    elif len(serialized_result) > _MAX_RESULT_LENGTH:
        result = {
            "truncated": True,
            "preview": serialized_result[:_MAX_RESULT_LENGTH],
        }

    return {"ok": True, "tool": tool, "result": result}


def _err(tool: str, error_type: str, message: str) -> dict[str, Any]:
    return {
        "ok": False,
        "tool": tool,
        "error": {"type": error_type, "message": message},
    }


def _load_storage_from_cwd() -> "KuzuBackend":  # noqa: F821
    from axon.core.storage.kuzu_backend import KuzuBackend

    repo_root = Path.cwd().resolve()
    db_path = repo_root / ".axon" / "kuzu"
    if not db_path.exists():
        raise FileNotFoundError(
            f"No index found at {repo_root}. Expected database at {db_path}."
        )

    storage = KuzuBackend()
    storage.initialize(db_path, read_only=True)
    return storage


def _ensure_object_args(raw_args: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_args)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON args: {exc.msg}") from exc

    if not isinstance(parsed, dict):
        raise TypeError("json_args must decode to a JSON object.")

    return parsed


def _require_string(args: dict[str, Any], key: str, max_len: int) -> str:
    value = args.get(key)
    if not isinstance(value, str):
        raise TypeError(f"'{key}' must be a string.")
    if len(value) == 0:
        raise ValueError(f"'{key}' must not be empty.")
    if len(value) > max_len:
        raise ValueError(f"'{key}' exceeds max length of {max_len}.")
    return value


def _optional_int(args: dict[str, Any], key: str, default: int) -> int:
    value = args.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"'{key}' must be an integer.")
    return value


def _execute_tool(tool_name: str, args: dict[str, Any]) -> Any:
    storage = _load_storage_from_cwd()
    try:
        if tool_name == "axon_query":
            query = _require_string(args, "query", _QUERY_MAX_LENGTH)
            limit = _optional_int(args, "limit", 20)
            if limit < 1 or limit > 50:
                raise ValueError("'limit' must be between 1 and 50.")
            return mcp_tools.handle_query(storage, query, limit=limit)

        if tool_name == "axon_context":
            symbol = _require_string(args, "symbol", _SYMBOL_MAX_LENGTH)
            return mcp_tools.handle_context(storage, symbol)

        if tool_name == "axon_impact":
            symbol = _require_string(args, "symbol", _SYMBOL_MAX_LENGTH)
            depth = _optional_int(args, "depth", 3)
            if depth < 1 or depth > 10:
                raise ValueError("'depth' must be between 1 and 10.")
            return mcp_tools.handle_impact(storage, symbol, depth=depth)

        if tool_name == "axon_dead_code":
            return mcp_tools.handle_dead_code(storage)

        if tool_name == "axon_detect_changes":
            diff = _require_string(args, "diff", _DIFF_MAX_LENGTH)
            return mcp_tools.handle_detect_changes(storage, diff)

        if tool_name == "axon_cypher":
            query = _require_string(args, "query", _CYPHER_MAX_LENGTH)
            return mcp_tools.handle_cypher(storage, query)

        raise ValueError(f"Unsupported tool '{tool_name}'.")
    finally:
        storage.close()


@app.command("run-tool")
def run_tool(
    tool_name: str = typer.Argument(..., help="Tool name to execute."),
    json_args: str = typer.Argument("{}", help="JSON object string with tool arguments."),
    stdin_args: bool = typer.Option(
        False,
        "--stdin-args",
        help="Read JSON args from stdin instead of argv.",
    ),
) -> None:
    """Run an Axon MCP tool handler and return strict JSON to stdout."""
    if tool_name not in _SUPPORTED_TOOLS:
        _emit(_err(tool_name, "unsupported_tool", f"Unsupported tool '{tool_name}'."))
        raise typer.Exit(code=0)

    if stdin_args:
        raw_bytes = sys.stdin.buffer.read(_MAX_STDIN_ARGS_LENGTH + 1)
        if len(raw_bytes) > _MAX_STDIN_ARGS_LENGTH:
            _emit(
                _err(
                    tool_name,
                    "validation_error",
                    f"stdin args exceed max size of {_MAX_STDIN_ARGS_LENGTH} bytes.",
                )
            )
            raise typer.Exit(code=0)
        raw_args = raw_bytes.decode("utf-8", errors="strict")
    else:
        raw_args = json_args

    try:
        args = _ensure_object_args(raw_args)
    except (TypeError, ValueError) as exc:
        _emit(_err(tool_name, "validation_error", str(exc)))
        raise typer.Exit(code=0)

    try:
        result = _execute_tool(tool_name, args)
        _emit(_ok(tool_name, result))
    except (TypeError, ValueError) as exc:
        _emit(_err(tool_name, "validation_error", str(exc)))
    except FileNotFoundError as exc:
        _emit(_err(tool_name, "index_not_found", str(exc)))
    except Exception as exc:
        _emit(_err(tool_name, "execution_error", f"Internal tool execution failed: {type(exc).__name__}"))


if __name__ == "__main__":
    app()

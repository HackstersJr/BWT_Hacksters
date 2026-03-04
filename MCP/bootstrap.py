from __future__ import annotations

import argparse
import platform
import subprocess
import sys
import venv
from pathlib import Path


def run(cmd: list[str], cwd: Path) -> None:
    printable = " ".join(cmd)
    print(f"\n[run] ({cwd}) {printable}")
    subprocess.run(cmd, cwd=str(cwd), check=True)


def venv_python(venv_dir: Path) -> Path:
    if platform.system().lower().startswith("win"):
        return venv_dir / "Scripts" / "python.exe"
    return venv_dir / "bin" / "python"


def ensure_venv(venv_dir: Path) -> Path:
    py = venv_python(venv_dir)
    if py.exists():
        return py

    print(f"[setup] Creating virtual environment at {venv_dir}")
    builder = venv.EnvBuilder(with_pip=True)
    builder.create(venv_dir)

    py = venv_python(venv_dir)
    if not py.exists():
        raise RuntimeError(f"Virtual environment created but python not found at: {py}")
    return py


def validate_python_version() -> None:
    if sys.version_info < (3, 11):
        raise RuntimeError("Python 3.11+ is required for Axon.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Cross-platform bootstrap for Trae Subagent Context MCP server",
    )
    parser.add_argument(
        "--skip-node",
        action="store_true",
        help="Skip Node.js dependency install/build for MCP/node-mcp",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip npm build step",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip MCP smoke tests",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validate_python_version()

    repo_root = Path(__file__).resolve().parent.parent
    mcp_root = repo_root / "MCP"
    node_mcp_root = mcp_root / "node-mcp"
    requirements_file = mcp_root / "requirements.txt"
    venv_dir = repo_root / ".venv"

    if not requirements_file.exists():
        raise FileNotFoundError(f"Missing requirements file: {requirements_file}")

    print("[setup] Bootstrapping project")
    print(f"[setup] Repo root: {repo_root}")

    python_exec = ensure_venv(venv_dir)

    run([str(python_exec), "-m", "pip", "install", "--upgrade", "pip"], cwd=repo_root)
    run([str(python_exec), "-m", "pip", "install", "-r", str(requirements_file)], cwd=repo_root)

    if not args.skip_node:
        run(["npm", "install"], cwd=node_mcp_root)
        if not args.skip_build:
            run(["npm", "run", "build"], cwd=node_mcp_root)
        if not args.skip_smoke:
            run(["npm", "run", "smoke:mcp"], cwd=node_mcp_root)

    print("\n[done] Bootstrap complete.")
    print("[next] Configure LM Studio and run MCP client against .mcp.json for full delegate flow.")


if __name__ == "__main__":
    main()

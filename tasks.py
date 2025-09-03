"""Task automation for the Infrahub VSCode extension project.

This module contains invoke tasks for building documentation, running linters,
and formatting code.
"""

import sys
from pathlib import Path

from invoke import Context, task

CURRENT_DIRECTORY = Path(__file__).resolve()
DOCUMENTATION_DIRECTORY = CURRENT_DIRECTORY.parent / "docs"

MAIN_DIRECTORY_PATH = Path(__file__).parent


@task
def format(context: Context):
    """Run RUFF to format all Python files."""

    exec_cmds = ["ruff format .", "ruff check . --fix"]
    with context.cd(MAIN_DIRECTORY_PATH):
        for cmd in exec_cmds:
            context.run(cmd)


@task
def lint_yaml(context: Context):
    """Run Linter to check all Python files."""
    print(" - Check code with yamllint")
    exec_cmd = "yamllint ."
    with context.cd(MAIN_DIRECTORY_PATH):
        context.run(exec_cmd)


@task
def lint_mypy(context: Context):
    """Run Linter to check all Python files."""
    print(" - Check code with mypy")
    exec_cmd = "mypy --show-error-codes ."
    with context.cd(MAIN_DIRECTORY_PATH):
        context.run(exec_cmd)


@task
def lint_ruff(context: Context):
    """Run Linter to check all Python files."""
    print(" - Check code with ruff")
    exec_cmd = "ruff check ."
    with context.cd(MAIN_DIRECTORY_PATH):
        context.run(exec_cmd)


@task(name="lint")
def lint_all(context: Context):
    """Run all linters."""
    lint_yaml(context)
    lint_ruff(context)
    lint_mypy(context)


@task(name="docs")
def docs_build(context: Context) -> None:
    """Build documentation website."""
    exec_cmd = "npm run build"

    with context.cd(DOCUMENTATION_DIRECTORY):
        output = context.run(exec_cmd)

    if output and output.exited != 0:
        sys.exit(-1)

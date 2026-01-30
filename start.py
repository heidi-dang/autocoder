#!/usr/bin/env python3
"""
Simple CLI launcher for the Autonomous Coding Agent.
Provides an interactive menu to create new projects or continue existing ones.

Supports two paths for new projects:
1. Claude path: Use /create-spec to generate spec interactively
2. Manual path: Edit template files directly, then continue
"""

import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from auth import is_auth_error, print_auth_error_help

# Load environment variables from .env file if present
load_dotenv()

from prompts import (
    get_project_prompts_dir,
    has_project_prompts,
    scaffold_project_prompts,
)
from registry import (
    get_project_path,
    list_registered_projects,
    register_project,
)


def check_spec_exists(project_dir: Path) -> bool:
    """
    Check if valid spec files exist for a project.

    Checks in order:
    1. Project prompts directory: {project_dir}/prompts/app_spec.txt
    2. Project root (legacy): {project_dir}/app_spec.txt
    """
    # Check project prompts directory first
    project_prompts = get_project_prompts_dir(project_dir)
    spec_file = project_prompts / "app_spec.txt"
    if spec_file.exists():
        try:
            content = spec_file.read_text(encoding="utf-8")
            return "<project_specification>" in content
        except (OSError, PermissionError):
            return False

    # Check legacy location in project root
    legacy_spec = project_dir / "app_spec.txt"
    if legacy_spec.exists():
        try:
            content = legacy_spec.read_text(encoding="utf-8")
            return "<project_specification>" in content
        except (OSError, PermissionError):
            return False

    return False


def get_existing_projects() -> list[tuple[str, Path]]:
    """Get list of existing projects from registry.

    Returns:
        List of (name, path) tuples for registered projects that still exist.
    """
    registry = list_registered_projects()
    projects = []

    for name, info in registry.items():
        path = Path(info["path"])
        if path.exists():
            projects.append((name, path))

    return sorted(projects, key=lambda x: x[0])


def display_menu(projects: list[tuple[str, Path]]) -> None:
    """Display the main menu."""

    if projects:
        pass


def display_projects(projects: list[tuple[str, Path]]) -> None:
    """Display list of existing projects."""

    for i, (name, path) in enumerate(projects, 1):
        pass


def get_project_choice(projects: list[tuple[str, Path]]) -> tuple[str, Path] | None:
    """Get user's project selection.

    Returns:
        Tuple of (name, path) for the selected project, or None if cancelled.
    """
    while True:
        choice = input("Select project number: ").strip().lower()

        if choice == "b":
            return None

        try:
            idx = int(choice) - 1
            if 0 <= idx < len(projects):
                return projects[idx]
        except ValueError:
            pass


def get_new_project_info() -> tuple[str, Path] | None:
    """Get name and path for new project.

    Returns:
        Tuple of (name, path) for the new project, or None if cancelled.
    """

    name = input("Project name: ").strip()

    if not name:
        return None

    # Basic validation - OS-aware invalid characters
    # Windows has more restrictions than Unix
    if sys.platform == "win32":
        invalid_chars = '<>:"/\\|?*'
    else:
        # Unix only restricts / and null
        invalid_chars = "/"

    for char in invalid_chars:
        if char in name:
            return None

    # Check if name already registered
    existing = get_project_path(name)
    if existing:
        return None

    # Get project path

    path_str = input("Project path: ").strip()
    if not path_str:
        return None

    project_path = Path(path_str).resolve()

    return name, project_path


def ensure_project_scaffolded(project_name: str, project_dir: Path) -> Path:
    """
    Ensure project directory exists with prompt templates and is registered.

    Creates the project directory, copies template files, and registers in registry.

    Args:
        project_name: Name of the project
        project_dir: Absolute path to the project directory

    Returns:
        The project directory path
    """
    # Create project directory if it doesn't exist
    project_dir.mkdir(parents=True, exist_ok=True)

    # Scaffold prompts (copies templates if they don't exist)
    scaffold_project_prompts(project_dir)

    # Register in registry
    register_project(project_name, project_dir)

    return project_dir


def run_spec_creation(project_dir: Path) -> bool:
    """
    Run Claude Code with /create-spec command to create project specification.

    The project path is passed as an argument so create-spec knows where to write files.
    Captures stderr to detect authentication errors and provide helpful guidance.
    """

    try:
        # Launch CLI with /create-spec command
        # Project path included in command string so it populates $ARGUMENTS
        # Capture stderr to detect auth errors while letting stdout flow to terminal
        result = subprocess.run(
            ["claude", f"/create-spec {project_dir}"],
            check=False,  # Don't raise on non-zero exit
            cwd=str(Path(__file__).parent),  # Run from project root
            stderr=subprocess.PIPE,
            text=True,
        )

        # Check for authentication errors in stderr
        stderr_output = result.stderr or ""
        if result.returncode != 0 and is_auth_error(stderr_output):
            print_auth_error_help()
            return False

        # If there was stderr output but not an auth error, show it
        if stderr_output.strip() and result.returncode != 0:
            pass

        # Check if spec was created in project prompts directory
        if check_spec_exists(project_dir):
            return True
        else:
            # If failed with non-zero exit and no spec, might be auth issue
            if result.returncode != 0:
                pass
            return False

    except FileNotFoundError:
        return False
    except KeyboardInterrupt:
        return False


def run_manual_spec_flow(project_dir: Path) -> bool:
    """
    Guide user through manual spec editing flow.

    Shows the paths to edit and waits for user to press Enter when ready.
    """
    get_project_prompts_dir(project_dir)

    try:
        input()
    except KeyboardInterrupt:
        return False

    # Validate that spec was edited
    if check_spec_exists(project_dir):
        return True
    else:
        confirm = input("Continue anyway? [y/N]: ").strip().lower()
        return confirm == "y"


def ask_spec_creation_choice() -> str | None:
    """Ask user whether to create spec with Claude or manually."""

    while True:
        choice = input("Select [1/2/b]: ").strip().lower()
        if choice in ["1", "2", "b"]:
            return choice


def create_new_project_flow() -> tuple[str, Path] | None:
    """
    Complete flow for creating a new project.

    1. Get project name and path
    2. Create project directory and scaffold prompts
    3. Ask: Claude or Manual?
    4. If Claude: Run /create-spec with project path
    5. If Manual: Show paths, wait for Enter
    6. Return (name, path) tuple if successful
    """
    project_info = get_new_project_info()
    if not project_info:
        return None

    project_name, project_path = project_info

    # Create project directory and scaffold prompts FIRST
    project_dir = ensure_project_scaffolded(project_name, project_path)

    # Ask user how they want to handle spec creation
    choice = ask_spec_creation_choice()

    if choice == "b":
        return None
    elif choice == "1":
        # Create spec with Claude
        success = run_spec_creation(project_dir)
        if not success:
            retry = input("Start agent anyway? [y/N]: ").strip().lower()
            if retry != "y":
                return None
    elif choice == "2":
        # Manual mode - guide user through editing
        success = run_manual_spec_flow(project_dir)
        if not success:
            return None

    return project_name, project_dir


def run_agent(project_name: str, project_dir: Path) -> None:
    """Run the autonomous agent with the given project.

    Captures stderr to detect authentication errors and provide helpful guidance.

    Args:
        project_name: Name of the project
        project_dir: Absolute path to the project directory
    """
    # Final validation before running
    if not has_project_prompts(project_dir):
        confirm = input("Continue anyway? [y/N]: ").strip().lower()
        if confirm != "y":
            return

    # Build the command - pass absolute path
    cmd = [sys.executable, "autonomous_agent_demo.py", "--project-dir", str(project_dir.resolve())]

    # Run the agent with stderr capture to detect auth errors
    # stdout goes directly to terminal for real-time output
    try:
        result = subprocess.run(cmd, check=False, stderr=subprocess.PIPE, text=True)

        # Check for authentication errors
        stderr_output = result.stderr or ""
        if result.returncode != 0:
            if is_auth_error(stderr_output):
                print_auth_error_help()
            elif stderr_output.strip():
                # Show any other errors
                # Still hint about auth if exit was unexpected
                if "error" in stderr_output.lower() or "exception" in stderr_output.lower():
                    pass

    except KeyboardInterrupt:
        pass


def main() -> None:
    """Main entry point."""
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)

    while True:
        projects = get_existing_projects()
        display_menu(projects)

        choice = input("Select option: ").strip().lower()

        if choice == "q":
            break

        elif choice == "1":
            result = create_new_project_flow()
            if result:
                project_name, project_dir = result
                run_agent(project_name, project_dir)

        elif choice == "2" and projects:
            display_projects(projects)
            selected = get_project_choice(projects)
            if selected:
                project_name, project_dir = selected
                run_agent(project_name, project_dir)

        else:
            pass


if __name__ == "__main__":
    main()

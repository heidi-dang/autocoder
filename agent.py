"""
Agent Session Logic
===================

Core agent interaction functions for running autonomous coding sessions.
"""

import asyncio
import io
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from claude_agent_sdk import ClaudeSDKClient

# Fix Windows console encoding for Unicode characters (emoji, etc.)
# Without this, print() crashes when Claude outputs emoji like ✅
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace", line_buffering=True)

from client import create_client
from progress import count_passing_tests, has_features, print_progress_summary, print_session_header
from prompts import (
    copy_spec_to_project,
    get_coding_prompt,
    get_initializer_prompt,
    get_single_feature_prompt,
    get_testing_prompt,
)

# Configuration
AUTO_CONTINUE_DELAY_SECONDS = 3


async def run_agent_session(
    client: ClaudeSDKClient,
    message: str,
    project_dir: Path,
) -> tuple[str, str]:
    """
    Run a single agent session using Claude Agent SDK.

    Args:
        client: Claude SDK client
        message: The prompt to send
        project_dir: Project directory path

    Returns:
        (status, response_text) where status is:
        - "continue" if agent should continue working
        - "error" if an error occurred
    """

    try:
        # Send the query
        await client.query(message)

        # Collect response text and show tool use
        response_text = ""
        async for msg in client.receive_response():
            msg_type = type(msg).__name__

            # Handle AssistantMessage (text and tool use)
            if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "TextBlock" and hasattr(block, "text"):
                        response_text += block.text
                    elif block_type == "ToolUseBlock" and hasattr(block, "name"):
                        if hasattr(block, "input"):
                            input_str = str(block.input)
                            if len(input_str) > 200:
                                pass
                            else:
                                pass

            # Handle UserMessage (tool results)
            elif msg_type == "UserMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    block_type = type(block).__name__

                    if block_type == "ToolResultBlock":
                        result_content = getattr(block, "content", "")
                        is_error = getattr(block, "is_error", False)

                        # Check if command was blocked by security hook
                        if "blocked" in str(result_content).lower():
                            pass
                        elif is_error:
                            # Show errors (truncated)
                            str(result_content)[:500]
                        else:
                            # Tool succeeded - just show brief confirmation
                            pass

        return "continue", response_text

    except Exception as e:
        return "error", str(e)


async def run_autonomous_agent(
    project_dir: Path,
    model: str,
    max_iterations: int | None = None,
    yolo_mode: bool = False,
    feature_id: int | None = None,
    agent_type: str | None = None,
    testing_feature_id: int | None = None,
) -> None:
    """
    Run the autonomous agent loop.

    Args:
        project_dir: Directory for the project
        model: Claude model to use
        max_iterations: Maximum number of iterations (None for unlimited)
        yolo_mode: If True, skip browser testing in coding agent prompts
        feature_id: If set, work only on this specific feature (used by orchestrator for coding agents)
        agent_type: Type of agent: "initializer", "coding", "testing", or None (auto-detect)
        testing_feature_id: For testing agents, the pre-claimed feature ID to test
    """
    if agent_type:
        pass
    if yolo_mode:
        pass
    if feature_id:
        pass
    if max_iterations:
        pass
    else:
        pass

    # Create project directory
    project_dir.mkdir(parents=True, exist_ok=True)

    # Determine agent type if not explicitly set
    if agent_type is None:
        # Auto-detect based on whether we have features
        # (This path is for legacy compatibility - orchestrator should always set agent_type)
        is_first_run = not has_features(project_dir)
        if is_first_run:
            agent_type = "initializer"
        else:
            agent_type = "coding"

    is_initializer = agent_type == "initializer"

    if is_initializer:
        # Copy the app spec into the project directory for the agent to read
        copy_spec_to_project(project_dir)
    elif agent_type == "testing":
        print_progress_summary(project_dir)
    else:
        print_progress_summary(project_dir)

    # Main loop
    iteration = 0

    while True:
        iteration += 1

        # Check if all features are already complete (before starting a new session)
        # Skip this check if running as initializer (needs to create features first)
        if not is_initializer and iteration == 1:
            passing, in_progress, total = count_passing_tests(project_dir)
            if total > 0 and passing == total:
                break

        # Check max iterations
        if max_iterations and iteration > max_iterations:
            break

        # Print session header
        print_session_header(iteration, is_initializer)

        # Create client (fresh context)
        # Pass agent_id for browser isolation in multi-agent scenarios
        import os

        if agent_type == "testing":
            agent_id = f"testing-{os.getpid()}"  # Unique ID for testing agents
        elif feature_id:
            agent_id = f"feature-{feature_id}"
        else:
            agent_id = None
        client = create_client(project_dir, model, yolo_mode=yolo_mode, agent_id=agent_id)

        # Choose prompt based on agent type
        if agent_type == "initializer":
            prompt = get_initializer_prompt(project_dir)
        elif agent_type == "testing":
            prompt = get_testing_prompt(project_dir, testing_feature_id)
        elif feature_id:
            # Single-feature mode (used by orchestrator for coding agents)
            prompt = get_single_feature_prompt(feature_id, project_dir, yolo_mode)
        else:
            # General coding prompt (legacy path)
            prompt = get_coding_prompt(project_dir)

        # Run session with async context manager
        # Wrap in try/except to handle MCP server startup failures gracefully
        try:
            async with client:
                status, response = await run_agent_session(client, prompt, project_dir)
        except Exception as e:
            # Don't crash - return error status so the loop can retry
            status, response = "error", str(e)

        # Check for project completion - EXIT when all features pass
        if "all features are passing" in response.lower() or "no more work to do" in response.lower():
            print_progress_summary(project_dir)
            break

        # Handle status
        if status == "continue":
            delay_seconds = AUTO_CONTINUE_DELAY_SECONDS
            target_time_str = None

            if "limit reached" in response.lower():
                # Try to parse reset time from response
                match = re.search(
                    r"(?i)\bresets(?:\s+at)?\s+(\d+)(?::(\d+))?\s*(am|pm)\s*\(([^)]+)\)",
                    response,
                )
                if match:
                    hour = int(match.group(1))
                    minute = int(match.group(2)) if match.group(2) else 0
                    period = match.group(3).lower()
                    tz_name = match.group(4).strip()

                    # Convert to 24-hour format
                    if period == "pm" and hour != 12:
                        hour += 12
                    elif period == "am" and hour == 12:
                        hour = 0

                    try:
                        tz = ZoneInfo(tz_name)
                        now = datetime.now(tz)
                        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

                        # If target time has already passed today, wait until tomorrow
                        if target <= now:
                            target += timedelta(days=1)

                        delta = target - now
                        delay_seconds = min(delta.total_seconds(), 24 * 60 * 60)  # Clamp to 24 hours max
                        target_time_str = target.strftime("%B %d, %Y at %I:%M %p %Z")

                    except Exception:
                        pass

            if target_time_str:
                pass
            else:
                pass

            sys.stdout.flush()  # this should allow the pause to be displayed before sleeping
            print_progress_summary(project_dir)

            # Check if all features are complete - exit gracefully if done
            passing, in_progress, total = count_passing_tests(project_dir)
            if total > 0 and passing == total:
                break

            # Single-feature mode OR testing agent: exit after one session
            if feature_id is not None or agent_type == "testing":
                if agent_type == "testing":
                    pass
                else:
                    pass
                break

            await asyncio.sleep(delay_seconds)

        elif status == "error":
            await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)

        # Small delay between sessions
        if max_iterations is None or iteration < max_iterations:
            await asyncio.sleep(1)

    # Final summary
    print_progress_summary(project_dir)

    # Print instructions for running the generated application

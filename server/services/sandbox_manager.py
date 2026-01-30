"""
Sandbox Manager Service
========================

Manages isolated Docker containers for agent workspaces.
Each sandbox provides:
- Isolated filesystem
- Full development environment
- Resource limits
- Lifecycle management
"""

import asyncio
import logging
import subprocess
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class SandboxInfo:
    """Information about a sandbox container."""

    sandbox_id: str
    container_id: str
    project_name: str
    status: str  # creating, running, stopped, error
    created_at: datetime
    workspace_path: str
    ports: dict[str, int]  # port mapping
    resource_limits: dict[str, str]


class SandboxManager:
    """Manages sandbox containers for agent workspaces."""

    def __init__(self):
        self.sandboxes: dict[str, SandboxInfo] = {}
        self._lock = asyncio.Lock()

    async def create_sandbox(
        self,
        project_name: str,
        memory_limit: str = "2g",
        cpu_limit: str = "2.0",
        ports: dict[str, int] | None = None,
    ) -> SandboxInfo:
        """
        Create a new isolated sandbox container.

        Args:
            project_name: Name of the project (for labeling)
            memory_limit: Memory limit (e.g., "2g", "512m")
            cpu_limit: CPU limit (e.g., "2.0" for 2 cores)
            ports: Port mappings {container_port: host_port}

        Returns:
            SandboxInfo with container details
        """
        async with self._lock:
            sandbox_id = f"sandbox-{uuid.uuid4().hex[:8]}"
            container_name = f"autocoder-sandbox-{project_name}-{sandbox_id}"

            # Create volume for workspace persistence
            volume_name = f"{container_name}-workspace"

            logger.info(f"Creating sandbox {sandbox_id} for project {project_name}")

            # Create Docker volume
            try:
                await self._run_command(["docker", "volume", "create", volume_name])
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to create volume: {e}")
                raise RuntimeError(f"Failed to create volume: {e}")

            # Build docker run command
            cmd = [
                "docker",
                "run",
                "-d",  # Detached
                "--name",
                container_name,
                "--label",
                "autocoder.sandbox=true",
                "--label",
                f"autocoder.project={project_name}",
                "--label",
                f"autocoder.sandbox_id={sandbox_id}",
                "--memory",
                memory_limit,
                "--cpus",
                cpu_limit,
                "--network",
                "autocoder_default",  # Connect to autocoder network
                "-v",
                f"{volume_name}:/workspace",
            ]

            # Add port mappings
            port_map = ports or {}
            for container_port, host_port in port_map.items():
                cmd.extend(["-p", f"{host_port}:{container_port}"])

            # Add image
            cmd.append("autocoder-sandbox:latest")

            # Create info object
            info = SandboxInfo(
                sandbox_id=sandbox_id,
                container_id="",  # Will be set after creation
                project_name=project_name,
                status="creating",
                created_at=datetime.now(),
                workspace_path="/workspace",
                ports=port_map,
                resource_limits={
                    "memory": memory_limit,
                    "cpu": cpu_limit,
                },
            )

            try:
                # Run container
                output = await self._run_command(cmd)
                container_id = output.strip()
                info.container_id = container_id
                info.status = "running"

                self.sandboxes[sandbox_id] = info

                logger.info(f"Sandbox {sandbox_id} created with container {container_id}")
                return info

            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to create sandbox: {e}")
                info.status = "error"
                self.sandboxes[sandbox_id] = info
                raise RuntimeError(f"Failed to create sandbox: {e}")

    async def get_sandbox(self, sandbox_id: str) -> SandboxInfo | None:
        """Get information about a sandbox."""
        return self.sandboxes.get(sandbox_id)

    async def list_sandboxes(self, project_name: str | None = None) -> list[SandboxInfo]:
        """
        List all sandboxes, optionally filtered by project.

        Args:
            project_name: Filter by project name

        Returns:
            List of sandbox info
        """
        if project_name:
            return [s for s in self.sandboxes.values() if s.project_name == project_name]
        return list(self.sandboxes.values())

    async def stop_sandbox(self, sandbox_id: str) -> bool:
        """
        Stop a running sandbox.

        Args:
            sandbox_id: ID of the sandbox to stop

        Returns:
            True if successful
        """
        async with self._lock:
            info = self.sandboxes.get(sandbox_id)
            if not info:
                logger.warning(f"Sandbox {sandbox_id} not found")
                return False

            if info.status == "stopped":
                return True

            try:
                await self._run_command(["docker", "stop", info.container_id])
                info.status = "stopped"
                logger.info(f"Sandbox {sandbox_id} stopped")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to stop sandbox {sandbox_id}: {e}")
                return False

    async def start_sandbox(self, sandbox_id: str) -> bool:
        """
        Start a stopped sandbox.

        Args:
            sandbox_id: ID of the sandbox to start

        Returns:
            True if successful
        """
        async with self._lock:
            info = self.sandboxes.get(sandbox_id)
            if not info:
                logger.warning(f"Sandbox {sandbox_id} not found")
                return False

            if info.status == "running":
                return True

            try:
                await self._run_command(["docker", "start", info.container_id])
                info.status = "running"
                logger.info(f"Sandbox {sandbox_id} started")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to start sandbox {sandbox_id}: {e}")
                return False

    async def destroy_sandbox(self, sandbox_id: str, remove_volume: bool = True) -> bool:
        """
        Destroy a sandbox and optionally its volume.

        Args:
            sandbox_id: ID of the sandbox to destroy
            remove_volume: Whether to remove the workspace volume

        Returns:
            True if successful
        """
        async with self._lock:
            info = self.sandboxes.get(sandbox_id)
            if not info:
                logger.warning(f"Sandbox {sandbox_id} not found")
                return False

            try:
                # Stop and remove container
                await self._run_command(["docker", "rm", "-f", info.container_id])

                # Remove volume if requested
                if remove_volume:
                    volume_name = f"autocoder-sandbox-{info.project_name}-{sandbox_id}-workspace"
                    try:
                        await self._run_command(["docker", "volume", "rm", volume_name])
                    except subprocess.CalledProcessError:
                        logger.warning(f"Failed to remove volume {volume_name}")

                # Remove from tracking
                del self.sandboxes[sandbox_id]

                logger.info(f"Sandbox {sandbox_id} destroyed")
                return True

            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to destroy sandbox {sandbox_id}: {e}")
                return False

    async def execute_command(
        self,
        sandbox_id: str,
        command: list[str],
        workdir: str = "/workspace",
    ) -> tuple[int, str, str]:
        """
        Execute a command in a sandbox.

        Args:
            sandbox_id: ID of the sandbox
            command: Command to execute
            workdir: Working directory

        Returns:
            (exit_code, stdout, stderr)
        """
        info = self.sandboxes.get(sandbox_id)
        if not info:
            raise ValueError(f"Sandbox {sandbox_id} not found")

        if info.status != "running":
            raise RuntimeError(f"Sandbox {sandbox_id} is not running")

        cmd = ["docker", "exec", "-w", workdir, info.container_id] + command

        try:
            result = await self._run_command_with_output(cmd)
            return result.returncode, result.stdout, result.stderr
        except subprocess.CalledProcessError as e:
            return e.returncode, e.stdout, e.stderr

    async def copy_to_sandbox(
        self,
        sandbox_id: str,
        local_path: Path,
        sandbox_path: str,
    ) -> bool:
        """
        Copy files to a sandbox.

        Args:
            sandbox_id: ID of the sandbox
            local_path: Local file/directory path
            sandbox_path: Destination path in sandbox

        Returns:
            True if successful
        """
        info = self.sandboxes.get(sandbox_id)
        if not info:
            raise ValueError(f"Sandbox {sandbox_id} not found")

        try:
            await self._run_command(["docker", "cp", str(local_path), f"{info.container_id}:{sandbox_path}"])
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to copy to sandbox: {e}")
            return False

    async def copy_from_sandbox(
        self,
        sandbox_id: str,
        sandbox_path: str,
        local_path: Path,
    ) -> bool:
        """
        Copy files from a sandbox.

        Args:
            sandbox_id: ID of the sandbox
            sandbox_path: Source path in sandbox
            local_path: Local destination path

        Returns:
            True if successful
        """
        info = self.sandboxes.get(sandbox_id)
        if not info:
            raise ValueError(f"Sandbox {sandbox_id} not found")

        try:
            await self._run_command(["docker", "cp", f"{info.container_id}:{sandbox_path}", str(local_path)])
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to copy from sandbox: {e}")
            return False

    async def cleanup_stopped_sandboxes(self, older_than_hours: int = 24) -> int:
        """
        Clean up stopped sandboxes older than specified hours.

        Args:
            older_than_hours: Remove sandboxes stopped longer than this

        Returns:
            Number of sandboxes cleaned up
        """
        count = 0
        current_time = datetime.now()

        to_remove = []
        for sandbox_id, info in self.sandboxes.items():
            if info.status == "stopped":
                age_hours = (current_time - info.created_at).total_seconds() / 3600
                if age_hours > older_than_hours:
                    to_remove.append(sandbox_id)

        for sandbox_id in to_remove:
            if await self.destroy_sandbox(sandbox_id):
                count += 1

        return count

    @staticmethod
    async def _run_command(cmd: list[str]) -> str:
        """Run a command and return stdout."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd, stdout, stderr)

        return stdout.decode()

    @staticmethod
    async def _run_command_with_output(cmd: list[str]):
        """Run a command and return full result."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()

        class Result:
            def __init__(self, returncode, stdout, stderr):
                self.returncode = returncode
                self.stdout = stdout.decode()
                self.stderr = stderr.decode()

        return Result(process.returncode, stdout, stderr)


# Global singleton instance
_sandbox_manager: SandboxManager | None = None


def get_sandbox_manager() -> SandboxManager:
    """Get the global sandbox manager instance."""
    global _sandbox_manager
    if _sandbox_manager is None:
        _sandbox_manager = SandboxManager()
    return _sandbox_manager

"""
Sandbox Router
==============

API endpoints for managing isolated sandbox environments for agent workspaces.
"""

import logging

from fastapi import APIRouter, HTTPException
from fastapi import Path as PathParam
from pydantic import BaseModel

from ..services.sandbox_manager import get_sandbox_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sandboxes", tags=["sandboxes"])


# ============================================================================
# Request/Response Models
# ============================================================================


class CreateSandboxRequest(BaseModel):
    project_name: str
    memory_limit: str = "2g"
    cpu_limit: str = "2.0"
    ports: dict[str, int] | None = None


class SandboxResponse(BaseModel):
    sandbox_id: str
    container_id: str
    project_name: str
    status: str
    created_at: str
    workspace_path: str
    ports: dict[str, int]
    resource_limits: dict[str, str]


class ExecuteCommandRequest(BaseModel):
    command: list[str]
    workdir: str = "/workspace"


class ExecuteCommandResponse(BaseModel):
    exit_code: int
    stdout: str
    stderr: str


class CopyFileRequest(BaseModel):
    source_path: str
    dest_path: str


class ActionResponse(BaseModel):
    success: bool
    message: str


# ============================================================================
# API Endpoints
# ============================================================================


@router.post("/", response_model=SandboxResponse)
async def create_sandbox(request: CreateSandboxRequest):
    """
    Create a new isolated sandbox container for a project.

    The sandbox provides:
    - Isolated filesystem with dedicated volume
    - Full development environment (Node.js, Python, build tools)
    - Resource limits (CPU, memory)
    - Network isolation
    """
    manager = get_sandbox_manager()

    try:
        info = await manager.create_sandbox(
            project_name=request.project_name,
            memory_limit=request.memory_limit,
            cpu_limit=request.cpu_limit,
            ports=request.ports,
        )

        return SandboxResponse(
            sandbox_id=info.sandbox_id,
            container_id=info.container_id,
            project_name=info.project_name,
            status=info.status,
            created_at=info.created_at.isoformat(),
            workspace_path=info.workspace_path,
            ports=info.ports,
            resource_limits=info.resource_limits,
        )
    except Exception as e:
        logger.error(f"Failed to create sandbox: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[SandboxResponse])
async def list_sandboxes(project_name: str | None = None):
    """
    List all sandboxes, optionally filtered by project name.
    """
    manager = get_sandbox_manager()

    sandboxes = await manager.list_sandboxes(project_name)

    return [
        SandboxResponse(
            sandbox_id=info.sandbox_id,
            container_id=info.container_id,
            project_name=info.project_name,
            status=info.status,
            created_at=info.created_at.isoformat(),
            workspace_path=info.workspace_path,
            ports=info.ports,
            resource_limits=info.resource_limits,
        )
        for info in sandboxes
    ]


@router.get("/{sandbox_id}", response_model=SandboxResponse)
async def get_sandbox(sandbox_id: str = PathParam(..., description="Sandbox ID")):
    """
    Get information about a specific sandbox.
    """
    manager = get_sandbox_manager()

    info = await manager.get_sandbox(sandbox_id)
    if not info:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    return SandboxResponse(
        sandbox_id=info.sandbox_id,
        container_id=info.container_id,
        project_name=info.project_name,
        status=info.status,
        created_at=info.created_at.isoformat(),
        workspace_path=info.workspace_path,
        ports=info.ports,
        resource_limits=info.resource_limits,
    )


@router.post("/{sandbox_id}/start", response_model=ActionResponse)
async def start_sandbox(sandbox_id: str = PathParam(..., description="Sandbox ID")):
    """
    Start a stopped sandbox.
    """
    manager = get_sandbox_manager()

    success = await manager.start_sandbox(sandbox_id)

    if success:
        return ActionResponse(success=True, message=f"Sandbox {sandbox_id} started successfully")
    else:
        raise HTTPException(status_code=500, detail="Failed to start sandbox")


@router.post("/{sandbox_id}/stop", response_model=ActionResponse)
async def stop_sandbox(sandbox_id: str = PathParam(..., description="Sandbox ID")):
    """
    Stop a running sandbox.
    """
    manager = get_sandbox_manager()

    success = await manager.stop_sandbox(sandbox_id)

    if success:
        return ActionResponse(success=True, message=f"Sandbox {sandbox_id} stopped successfully")
    else:
        raise HTTPException(status_code=500, detail="Failed to stop sandbox")


@router.delete("/{sandbox_id}", response_model=ActionResponse)
async def destroy_sandbox(
    sandbox_id: str = PathParam(..., description="Sandbox ID"),
    remove_volume: bool = True,
):
    """
    Destroy a sandbox and optionally remove its workspace volume.
    """
    manager = get_sandbox_manager()

    success = await manager.destroy_sandbox(sandbox_id, remove_volume)

    if success:
        return ActionResponse(success=True, message=f"Sandbox {sandbox_id} destroyed successfully")
    else:
        raise HTTPException(status_code=500, detail="Failed to destroy sandbox")


@router.post("/{sandbox_id}/execute", response_model=ExecuteCommandResponse)
async def execute_command(
    request: ExecuteCommandRequest,
    sandbox_id: str = PathParam(..., description="Sandbox ID"),
):
    """
    Execute a command in the sandbox.

    Example commands:
    - ["npm", "install"]
    - ["npm", "run", "dev"]
    - ["npm", "test"]
    - ["git", "status"]
    """
    manager = get_sandbox_manager()

    try:
        exit_code, stdout, stderr = await manager.execute_command(
            sandbox_id,
            request.command,
            request.workdir,
        )

        return ExecuteCommandResponse(
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to execute command: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sandbox_id}/cleanup", response_model=ActionResponse)
async def cleanup_stopped_sandboxes(hours: int = 24):
    """
    Clean up stopped sandboxes older than the specified hours.
    """
    manager = get_sandbox_manager()

    count = await manager.cleanup_stopped_sandboxes(hours)

    return ActionResponse(success=True, message=f"Cleaned up {count} stopped sandbox(es)")

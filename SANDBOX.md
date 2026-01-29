# Sandbox Environment

## Overview

The AutoCoder sandbox environment provides isolated, ephemeral Docker containers for agent workspaces. Each sandbox includes:

- **Isolated filesystem** with dedicated Docker volume
- **Full development environment**: Node.js 20, Python 3, build tools
- **Resource limits**: Configurable CPU and memory constraints
- **Network isolation**: Sandboxes run in the autocoder network
- **Non-root user**: Runs as `sandbox` user for security

## API Endpoints

### Create Sandbox

```http
POST /api/sandboxes
Content-Type: application/json

{
  "project_name": "my-project",
  "memory_limit": "2g",
  "cpu_limit": "2.0",
  "ports": {
    "3000": 3000,
    "8080": 8080
  }
}
```

**Response:**
```json
{
  "sandbox_id": "sandbox-abc123",
  "container_id": "docker-container-id",
  "project_name": "my-project",
  "status": "running",
  "created_at": "2026-01-30T12:00:00Z",
  "workspace_path": "/workspace",
  "ports": {"3000": 3000},
  "resource_limits": {
    "memory": "2g",
    "cpu": "2.0"
  }
}
```

### List Sandboxes

```http
GET /api/sandboxes?project_name=my-project
```

### Get Sandbox Info

```http
GET /api/sandboxes/{sandbox_id}
```

### Execute Command

```http
POST /api/sandboxes/{sandbox_id}/execute
Content-Type: application/json

{
  "command": ["npm", "install"],
  "workdir": "/workspace"
}
```

**Response:**
```json
{
  "exit_code": 0,
  "stdout": "added 150 packages...",
  "stderr": ""
}
```

### Control Sandbox

```http
POST /api/sandboxes/{sandbox_id}/start
POST /api/sandboxes/{sandbox_id}/stop
DELETE /api/sandboxes/{sandbox_id}?remove_volume=true
```

## Usage Examples

### Python Example

```python
import httpx

# Create sandbox
response = httpx.post("http://localhost:8888/api/sandboxes", json={
    "project_name": "test-project",
    "memory_limit": "1g",
    "cpu_limit": "1.0"
})
sandbox = response.json()
sandbox_id = sandbox["sandbox_id"]

# Execute commands
httpx.post(f"http://localhost:8888/api/sandboxes/{sandbox_id}/execute", json={
    "command": ["git", "clone", "https://github.com/user/repo.git"],
    "workdir": "/workspace"
})

httpx.post(f"http://localhost:8888/api/sandboxes/{sandbox_id}/execute", json={
    "command": ["npm", "install"],
    "workdir": "/workspace/repo"
})

httpx.post(f"http://localhost:8888/api/sandboxes/{sandbox_id}/execute", json={
    "command": ["npm", "test"],
    "workdir": "/workspace/repo"
})

# Cleanup
httpx.delete(f"http://localhost:8888/api/sandboxes/{sandbox_id}")
```

### Testing Agent Workflow

```python
# 1. Create isolated sandbox for testing
sandbox = create_sandbox("test-feature-123")

# 2. Copy project files to sandbox
copy_to_sandbox(sandbox_id, "./project", "/workspace/project")

# 3. Run tests in isolation
result = execute_command(sandbox_id, ["npm", "test"])

# 4. Verify results
if result["exit_code"] == 0:
    print("✓ Tests passed")
else:
    print(f"✗ Tests failed: {result['stderr']}")

# 5. Cleanup
destroy_sandbox(sandbox_id)
```

## Architecture

```
┌─────────────────────────────────────────────┐
│           AutoCoder API Server              │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │     Sandbox Manager Service          │  │
│  │                                      │  │
│  │  - Lifecycle management              │  │
│  │  - Docker API integration            │  │
│  │  - Resource tracking                 │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    │ Docker API
                    ▼
┌─────────────────────────────────────────────┐
│           Docker Host                        │
│                                             │
│  ┌──────────────┐  ┌──────────────┐       │
│  │  Sandbox 1   │  │  Sandbox 2   │       │
│  │              │  │              │       │
│  │  /workspace  │  │  /workspace  │       │
│  │  (volume)    │  │  (volume)    │       │
│  └──────────────┘  └──────────────┘       │
│                                             │
│  Network: autocoder_default                 │
└─────────────────────────────────────────────┘
```

## Resource Limits

Default limits:
- **Memory**: 2GB per sandbox
- **CPU**: 2.0 cores per sandbox
- **Storage**: Limited by Docker host disk space

## Security

- **User isolation**: Sandboxes run as non-root `sandbox` user
- **Filesystem isolation**: Each sandbox has dedicated Docker volume
- **Network isolation**: Sandboxes are in isolated Docker network
- **Resource limits**: CPU and memory constraints prevent resource exhaustion
- **No host access**: Sandboxes cannot access host filesystem

## Best Practices

1. **Always cleanup**: Destroy sandboxes after use to free resources
2. **Use specific limits**: Set appropriate memory/CPU for your workload
3. **Monitor resources**: Use `docker stats` to track resource usage
4. **Separate concerns**: One sandbox per test/feature
5. **Automate cleanup**: Use background jobs to clean old sandboxes

## Troubleshooting

### Sandbox creation fails

```bash
# Check Docker daemon
docker info

# Check available resources
docker system df

# View sandbox logs
docker logs <container_id>
```

### Command execution hangs

- Check if sandbox is running: `GET /api/sandboxes/{id}`
- Verify resource limits aren't exceeded
- Check Docker host resources

### Cleanup stuck sandboxes

```http
POST /api/sandboxes/{sandbox_id}/cleanup?hours=1
```

This removes stopped sandboxes older than 1 hour.

## Future Enhancements

- [ ] UI components for sandbox management
- [ ] Integration with agent execution flow
- [ ] Automatic sandbox provisioning for agents
- [ ] Snapshot/restore functionality
- [ ] Multi-container sandboxes (compose support)
- [ ] Resource usage monitoring and alerts

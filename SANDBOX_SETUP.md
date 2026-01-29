# Sandbox Environment Setup

## Quick Start

The sandbox environment has been implemented with the following components:

### ✅ Completed

1. **Dockerfile.sandbox** - Ubuntu 22.04 based sandbox image with:
   - Node.js 20, Python 3, build tools
   - Development utilities (git, vim, nano, htop, jq)
   - Non-root `sandbox` user
   - Isolated `/workspace` directory

2. **Sandbox Manager Service** (`server/services/sandbox_manager.py`):
   - Container lifecycle management (create, start, stop, destroy)
   - Command execution in sandboxes
   - File copy to/from sandboxes
   - Resource limits (CPU, memory)
   - Automatic cleanup of old sandboxes

3. **REST API** (`server/routers/sandbox.py`):
   - `POST /api/sandboxes/` - Create sandbox
   - `GET /api/sandboxes/` - List sandboxes
   - `GET /api/sandboxes/{id}` - Get sandbox info
   - `POST /api/sandboxes/{id}/execute` - Run commands
   - `POST /api/sandboxes/{id}/start` - Start sandbox
   - `POST /api/sandboxes/{id}/stop` - Stop sandbox
   - `DELETE /api/sandboxes/{id}` - Destroy sandbox

4. **Docker Image** - Built and ready (`autocoder-sandbox:latest`)

5. **Documentation** - Complete API docs in SANDBOX.md

### 🔧 Production Setup Required

For production use, you'll need to enable Docker-in-Docker access:

#### Method 1: Docker Socket Mount (Dev Mode)

Add to your `.env`:
```bash
# Enable Docker socket access for sandbox management
DOCKER_HOST=unix:///var/run/docker.sock
```

Ensure the API container has Docker socket access (already configured in docker-compose.dev.yml).

#### Method 2: Docker-in-Docker Container (Production)

For production, use a dedicated Docker-in-Docker (dind) service:

```yaml
services:
  docker-dind:
    image: docker:dind
    privileged: true
    environment:
      DOCKER_TLS_CERTDIR: /certs
    volumes:
      - docker-certs-ca:/certs/ca
      - docker-certs-client:/certs/client
    networks:
      - autocoder_default

  api:
    environment:
      DOCKER_HOST: tcp://docker-dind:2376
      DOCKER_TLS_VERIFY: 1
      DOCKER_CERT_PATH: /certs/client
    volumes:
      - docker-certs-client:/certs/client:ro
```

### Testing the Sandbox

Once Docker access is configured:

```bash
# Create a sandbox
curl -X POST http://localhost:8888/api/sandboxes/ \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "test",
    "memory_limit": "1g",
    "cpu_limit": "1.0"
  }'

# Execute commands
curl -X POST http://localhost:8888/api/sandboxes/{sandbox_id}/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": ["node", "--version"],
    "workdir": "/workspace"
  }'

# List sandboxes
curl http://localhost:8888/api/sandboxes/

# Cleanup
curl -X DELETE http://localhost:8888/api/sandboxes/{sandbox_id}
```

### Integration with Agents

To integrate sandboxes with agent execution:

1. **Auto-provision**: Create sandbox when agent starts
2. **Workspace mapping**: Map project directory to sandbox `/workspace`
3. **Command routing**: Route agent commands through sandbox
4. **Result capture**: Collect test results from sandbox
5. **Auto-cleanup**: Destroy sandbox when agent completes

Example integration in `agent.py`:

```python
# Create sandbox for agent
sandbox = await sandbox_manager.create_sandbox(
    project_name=project_name,
    memory_limit="2g",
    cpu_limit="2.0"
)

# Copy project files
await sandbox_manager.copy_to_sandbox(
    sandbox.sandbox_id,
    project_dir,
    "/workspace"
)

# Run agent with sandbox execution
# ... agent code executes in sandbox ...

# Cleanup
await sandbox_manager.destroy_sandbox(sandbox.sandbox_id)
```

### Next Steps

1. **Enable Docker Access**: Choose Method 1 or 2 above
2. **Test API**: Verify sandbox creation works
3. **Integrate with Agents**: Add sandbox support to agent workflow
4. **Add UI**: Create sandbox management interface
5. **Monitoring**: Add resource usage tracking

For more details, see [SANDBOX.md](SANDBOX.md).

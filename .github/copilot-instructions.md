# Copilot Instructions for AutoCoder

This document guides AI coding agents working on the AutoCoder autonomous agent platform.

## Project Overview

**AutoCoder** is a long-running autonomous coding agent system powered by Claude Agent SDK. It builds complete applications over multiple sessions using a two-agent pattern: an **Initializer Agent** (first session) creates features from specs, and **Coding Agents** (subsequent sessions) implement features one by one.

The system includes a React-based UI for real-time monitoring, Docker deployment support, and security controls for agent actions.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────┐
│         React UI (ui/) - Real-time dashboard    │
│  Kanban board, dependency graph, agent controls │
└────────────┬────────────────────────────────────┘
             │ WebSocket + REST API
┌────────────▼────────────────────────────────────┐
│      FastAPI Server (server/) - REST endpoints  │
│  Projects, features, filesystem, agent control  │
└────────────┬────────────────────────────────────┘
             │ Subprocess + MCP Protocol
┌────────────▼────────────────────────────────────┐
│   Claude Agent Session (agent.py)               │
│  - Reads app spec from prompts/app_spec.txt     │
│  - Uses MCP servers: features (database), etc.  │
│  - Bash security hooks (allowlist validation)   │
│  - Executes in isolated project directory       │
└─────────────────────────────────────────────────┘
```

## Critical Data Flow Patterns

### Feature Management (SQLAlchemy + SQLite)

Features live in `{project_dir}/features.db`. The agent interacts via **MCP tools** (not direct DB access):

- `feature_get_next` - Get highest-priority unblocked feature
- `feature_claim_next` - Atomically claim feature (parallel mode)
- `feature_mark_passing` - Mark complete after tests pass
- `feature_skip` - Requeue feature to end
- Dependencies use topological sorting (Kahn's algorithm) with cycle detection

**Key constraint:** Infrastructure features (indices 0-4) must pass first; they verify real database, not mock data.

### Security Model (Three Layers)

1. **OS-level sandbox** - Bash commands isolated per-project
2. **Filesystem restriction** - Read/write only within project dir (+ EXTRA_READ_PATHS for docs)
3. **Bash allowlist** - Command validation: Hardcoded blocklist → Org blocklist → Org allowlist → Global allowlist → Project allowlist

See `security.py` for validation logic; test with `test_security.py` (163 tests).

### Prompt Fallback Chain

1. Project-specific: `{project_dir}/prompts/{name}.md`
2. Base template: `.claude/templates/{name}.template.md`

Used for initializer, coding, and spec-creation prompts.

## Developer Workflows

### Local Development (Hot Reload)

```bash
# Backend: Auto-reload on code changes (docker-compose.dev.yml)
docker-compose -f docker-compose.dev.yml up

# Frontend: Vite dev server (port 5173) with proxy to API
cd ui && npm run dev
```

### Running Agents

```bash
# CLI launcher
python start.py

# Direct agent (project registered or absolute path)
python autonomous_agent_demo.py --project-dir my-app

# YOLO mode: skip testing for rapid prototyping
python autonomous_agent_demo.py --project-dir my-app --yolo

# Parallel: multiple agents (1-5), dependency-aware
python autonomous_agent_demo.py --project-dir my-app --parallel --max-concurrency 3
```

### Testing & Linting

```bash
# Python
ruff check .                          # Lint
mypy .                                # Type check (strict)
python test_security.py               # 163 unit tests
python test_security_integration.py   # 9 integration tests

# React UI
cd ui && npm run lint                 # ESLint
npm run build                         # Type check + build
npm run test:e2e                      # Playwright tests
```

## Project-Specific Patterns

### Code Organization

**Backend (Python):**
- `client.py` - Claude Agent SDK configuration + MCP server setup
- `agent.py` - Agent session loop (run feature → test → mark passing)
- `security.py` - Bash command validation
- `server/` - FastAPI routers (projects, features, agent control, filesystem)
- `server/services/` - Business logic (database, chat sessions, project config)
- `mcp_server/feature_mcp.py` - MCP tools for feature management

**Frontend (React 19 + TypeScript):**
- `src/App.tsx` - Main app with project selection, Kanban board, agent controls
- `src/components/DependencyGraph.tsx` - Interactive node graph (dagre layout, ReactFlow)
- `src/hooks/useWebSocket.ts` - Real-time WebSocket updates
- `src/lib/api.ts` - REST client (TanStack Query)

### Naming Conventions

- **Files:** snake_case (Python), camelCase (React)
- **Functions:** snake_case (Python), camelCase (React)
- **Classes:** PascalCase
- **Constants:** UPPER_SNAKE_CASE
- **Database models:** Feature, Project (SQLAlchemy ORM in `api/database.py`)

### Configuration

- `.env` - Runtime config (ANTHROPIC_API_KEY, GEMINI_API_KEY, etc.)
- `pyproject.toml` - Ruff/mypy config (line length 120, Python 3.11+)
- `ui/vite.config.ts` - Frontend build + chunk splitting (vendor-flow, vendor-xterm, vendor-ui)
- `ui/tsconfig.json` - TypeScript strict mode
- `examples/` - Sample security configs (project allowlist, org policy)

### Key Files to Study

| File | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Comprehensive agent guidance (architecture, workflows, MCP tools) |
| [agent.py](agent.py) | Agent session loop implementation |
| [client.py](client.py) | Claude Agent SDK client setup + MCP server config |
| [security.py](security.py) | Bash command allowlist validation logic |
| [api/dependency_resolver.py](api/dependency_resolver.py) | Topological sort + cycle detection |
| [server/routers/features.py](server/routers/features.py) | Feature CRUD + dependency graph API |
| [ui/src/components/DependencyGraph.tsx](ui/src/components/DependencyGraph.tsx) | Graph visualization (ReactFlow + dagre) |
| [.claude/templates/initializer_prompt.template.md](.claude/templates/initializer_prompt.template.md) | Feature spec structure + mandatory infrastructure tests |

## Common Implementation Patterns

### Adding a New API Endpoint

1. Create router in `server/routers/{domain}.py` (e.g., `server/routers/projects.py`)
2. Import in `server/main.py` and register with `app.include_router()`
3. Use FastAPI path parameters, query params, request body via Pydantic schemas
4. Return response model from `server/schemas.py`
5. Use security context to get project path via `_get_project_path(project_name)`

### Adding a Feature Management Tool

1. Add method to `mcp_server/feature_mcp.py` as a tool handler
2. Reference feature MCP tools in agent prompts
3. Test via `test_security_integration.py` or CLI with `feature_mark_passing`

### Adding a React Component

1. Use TypeScript with strict types from `src/lib/types.ts`
2. Import Radix UI components from `@radix-ui/react-*`
3. Style with Tailwind + neobrutalism design system (flat, raw aesthetic)
4. Use TanStack Query for data fetching via `useProjects()` or custom hooks
5. WebSocket updates via `useWebSocket()` for real-time UI sync

## Conventions & Anti-Patterns

### ✅ Do

- Validate all inputs (paths, commands, user data)
- Use type hints (mypy strict mode)
- Test data persistence across server restart
- Respect project filesystem boundary (security.py)
- Log with context (project name, feature ID, user action)

### ❌ Don't

- Use mock data or in-memory stores (breaks infrastructure tests)
- Catch all exceptions without logging
- Skip shell escaping in bash commands
- Assume absolute paths work cross-platform (use registry.db)
- Create features without dependency tracking

## External Integrations

- **Claude Code CLI** - `claude login` / `claude code` (required)
- **Anthropic API** - Pay-per-use or Claude Pro subscription
- **Gemini API** - Optional (assistant chat only; agents still use Claude)
- **Docker** - Container isolation for agent processes
- **Ollama** - Optional local model support (see CLAUDE.md)

## Debugging Tips

1. **Agent not starting?** Check `.agent.lock` (delete to retry); verify Claude CLI auth (`claude login`)
2. **Feature tests failing?** Look for in-memory stores; verify database queries in server logs
3. **WebSocket updates missing?** Check browser DevTools Network tab; verify `useWebSocket()` connection
4. **Bash commands blocked?** Check `security.py` hardcoded blocklist; add to project allowlist if needed
5. **Type errors?** Run `mypy .` (strict mode); check `server/schemas.py` Pydantic models

## Next Steps for Contributors

- Review [CLAUDE.md](CLAUDE.md) for deep architecture details
- Study [agent.py](agent.py) to understand session flow
- Check `.claude/agents/coder.md` for code quality standards
- Run `python test_security.py` to understand security model
- Try `python start.py` locally to experience the UI and agent workflow

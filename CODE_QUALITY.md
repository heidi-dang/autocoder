# Code Quality Standards

This document outlines the code quality standards and practices for the autocoder project.

## Overview

The project uses the following tools to maintain code quality:

- **Ruff**: Python linting and formatting (primary linter/formatter)
- **Pre-commit**: Automatic code quality checks on every commit
- **Pylance**: Python language server and type checking (VS Code)
- **Mypy**: Static type checker for Python (optional, in pyproject.toml)

## Ruff Configuration

### What is Ruff?

Ruff is an extremely fast Python linter and formatter, written in Rust. It's designed to be a drop-in replacement for multiple tools:
- **Linting**: Replaces Flake8, pylint, and other linters
- **Formatting**: Replaces Black for code formatting
- **Import organization**: Replaces isort for import sorting

### Configuration

Ruff is configured in `pyproject.toml` under `[tool.ruff]`:

```toml
[tool.ruff]
line-length = 120
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "W", "UP", "C", "BLE", "T20"]
ignore = [
    "E501",  # Line length handled separately
    "E402",  # Allow imports after load_dotenv()
    "E712",  # SQLAlchemy requires == True/False syntax
    "W293",  # Blank line contains whitespace (auto-fixed)
    "C901",  # Function is too complex
    "BLE001",  # Do not catch blind exception
]

[tool.ruff.lint.isort]
known-first-party = ["server", "api", "mcp_server"]
section-order = ["future", "standard-library", "third-party", "first-party", "local-folder"]
```

### Enabled Rule Categories

| Category | Name | Purpose |
|----------|------|---------|
| E | pycodestyle errors | PEP 8 compliance |
| F | Pyflakes | Common logical errors |
| I | isort | Import organization |
| W | pycodestyle warnings | PEP 8 compliance warnings |
| UP | pyupgrade | Modern Python syntax |
| C | mccabe | Code complexity |
| BLE | flake8-blind-except | Catch specific exceptions |
| T20 | flake8-print | Discourage print statements |

### Common Ruff Commands

```bash
# Check for linting issues
ruff check .

# Auto-fix fixable issues
ruff check --fix .

# Fix unsafe issues (breaking changes)
ruff check --fix --unsafe-fixes .

# Format code (like Black)
ruff format .

# Show detailed statistics
ruff check --statistics .
```

## Pre-commit Hooks

### What is Pre-commit?

Pre-commit is a framework for managing and maintaining multi-language pre-commit hooks. It runs automatically before each commit to catch issues early.

### Installed Hooks

The project uses the following pre-commit hooks:

1. **Ruff (lint)**: Lints Python code and auto-fixes issues
2. **Ruff (format)**: Formats Python code
3. **Detect private keys**: Prevents committing secrets
4. **Check for large files**: Prevents committing files > 1MB
5. **End of file fixer**: Ensures files end with a newline
6. **Trim trailing whitespace**: Removes trailing spaces
7. **Check YAML**: Validates YAML syntax
8. **Check JSON**: Validates JSON syntax (excludes tsconfig files)
9. **Check merge conflicts**: Detects unresolved merge conflicts
10. **Format YAML**: Auto-formats YAML files

### Using Pre-commit

Pre-commit hooks are installed in `.git/hooks/pre-commit` and run automatically before each commit.

```bash
# Run all pre-commit hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run ruff --all-files

# Skip hooks for a commit (not recommended)
git commit --no-verify
```

### Configuration

Pre-commit is configured in `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.14
    hooks:
      - id: ruff
        name: ruff (lint)
        args: [--fix, --unsafe-fixes]
        stages: [pre-commit]
      - id: ruff-format
        name: ruff (format)
        stages: [pre-commit]
  # ... additional hooks ...
```

## Makefile Targets

Convenient Make targets are available for code quality operations:

```bash
# Run all linting and checks
make check

# Run ruff linter
make lint

# Format code with ruff
make format

# Fix all code issues
make fix

# Run tests
make test

# Run E2E tests (UI)
make test-e2e
```

## IDE Integration

### VS Code with Pylance

1. Install the Pylance extension
2. Pylance will provide:
   - Real-time type checking
   - Quick fixes based on Ruff rules
   - Go to definition and references
   - Hover documentation

### Configuring VS Code

Add to `.vscode/settings.json`:

```json
{
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit"
    }
  },
  "pylance.analysis.typeCheckingMode": "basic",
  "python.linting.enabled": true
}
```

## Python Version

- **Target**: Python 3.11+
- **Compatibility**: Code is formatted for Python 3.11 syntax

## Type Hints

While type checking is configured in `pyproject.toml` via Mypy, not all files have strict type checking enabled. New code should:

1. Include type hints for function signatures
2. Use `Optional[T]` for potentially None values
3. Use descriptive return types

Example:

```python
from typing import Optional

def fetch_data(key: str) -> Optional[dict]:
    """Fetch data from the database."""
    # ...
    return data or None
```

## Common Ruff Fixes

### Unused imports

Ruff will remove unused imports automatically:

```python
# Before
import os  # unused
import sys
print(sys.version)

# After
import sys
print(sys.version)
```

### Import sorting

Ruff will organize imports:

```python
# Before
from server.utils import helper
import sys
import os
from typing import Optional
import requests

# After
import os
import sys
from typing import Optional

import requests

from server.utils import helper
```

### Unnecessary `pass` statements

```python
# Before
if condition:
    pass

# After
if condition:
    ...
```

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall hooks
pre-commit install

# Run manually to test
pre-commit run --all-files
```

### Ruff conflicts with editor formatter

Ensure VS Code is configured to use Ruff:

```json
{
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

### Large merge conflicts with formatting

```bash
# Run Ruff on all files before merging
ruff format .
ruff check --fix .
```

## Resources

- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [Pre-commit Documentation](https://pre-commit.com/)
- [Pylance Documentation](https://github.com/microsoft/pylance-release)
- [PEP 8 Style Guide](https://www.python.org/dev/peps/pep-0008/)

## Contributing

When contributing code:

1. Ensure all hooks pass before committing
2. Use `make fix` to auto-fix common issues
3. Use `make test` to run tests
4. Add type hints to new functions
5. Keep functions focused and reasonably complex (Ruff will warn if too complex)

## Next Steps

- [ ] Configure VS Code Pylance for real-time feedback
- [ ] Run `make fix` to auto-fix any remaining issues
- [ ] Commit code with passing pre-commit hooks
- [ ] Review pre-commit CI integration for GitHub (optional)

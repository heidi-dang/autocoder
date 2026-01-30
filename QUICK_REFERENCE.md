# Quick Reference: Code Quality

## 🚀 Quick Start

```bash
# Auto-fix all code issues
make fix

# Check for issues
make check

# Format code
make format

# Run tests
make test
```

## 📋 Common Commands

| Command | Purpose |
|---------|---------|
| `make lint` | Run Ruff linter |
| `make format` | Format Python code |
| `make fix` | Auto-fix all issues |
| `make check` | Run all checks |
| `make test` | Run pytest |
| `make test-e2e` | Run E2E tests |
| `ruff check .` | Full linting report |
| `ruff check --fix .` | Auto-fix fixable issues |
| `ruff format .` | Format all files |
| `pre-commit run --all-files` | Run all pre-commit hooks |

## 🔍 What Pre-commit Hooks Do

✅ **Automatic on every commit**:
- Fix linting issues
- Format code
- Remove trailing whitespace
- Fix end of files
- Validate YAML/JSON
- Detect secrets
- Check merge conflicts

## 🛠️ Configuration Files

- **pyproject.toml** - Ruff rules
- **.pre-commit-config.yaml** - Pre-commit hooks
- **Makefile** - Make targets
- **CODE_QUALITY.md** - Full documentation

## 📚 Learn More

See [CODE_QUALITY.md](./CODE_QUALITY.md) for complete documentation.

## 🆘 Issues?

```bash
# Reinstall pre-commit hooks
pre-commit install

# Verify configuration
pre-commit validate-config

# Run all hooks manually
pre-commit run --all-files
```

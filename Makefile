.PHONY: install lint lint-fix format format-fix test smoke ui-dev api-dev dev-up dev-down pre-commit-install pre-commit-run

install:
	pip install -r requirements.txt
	cd ui && npm install

# Linting targets
lint:
	@echo "🔍 Checking code with Ruff..."
	python3 -m ruff check .
	cd ui && npm run lint

lint-fix:
	@echo "🔧 Fixing linting issues with Ruff..."
	python3 -m ruff check . --fix --unsafe-fixes
	cd ui && npm run lint 2>&1 || true
	@echo "✅ Linting fixes applied"

format:
	@echo "🎨 Checking code formatting..."
	python3 -m ruff format . --check
	cd ui && npm run format

format-fix:
	@echo "🎨 Formatting code..."
	python3 -m ruff format .
	cd ui && npm run format 2>&1 || true
	@echo "✅ Code formatted"

# Combined formatting and linting
check: lint format
	@echo "✅ All checks passed"

fix: lint-fix format-fix
	@echo "✅ All fixes applied"

# Testing
test:
	pytest

smoke:
	cd ui && npm run test:smoke

# Development servers
ui-dev:
	cd ui && npm run dev -- --host --port 5173

api-dev:
	uvicorn server.main:app --host 0.0.0.0 --port 8888 --reload

# Docker development
dev-up:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

# Pre-commit hooks
pre-commit-install:
	python3 -m pre_commit install

pre-commit-run:
	@echo "🔍 Running pre-commit hooks..."
	python3 -m pre_commit run --all-files

pre-commit-bypass:
	@echo "⚠️  Committing with pre-commit bypass (not recommended)..."
	git commit --no-verify

pre-commit-install:
	pre-commit install

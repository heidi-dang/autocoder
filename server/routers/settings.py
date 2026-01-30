"""
Settings Router
===============

API endpoints for global settings management.
Settings are stored in the registry database and shared across all projects.
"""

import mimetypes
import os
import sys
from pathlib import Path

from fastapi import APIRouter

from .. import ollama_client
from ..schemas import ModelInfo, ModelsResponse, SettingsResponse, SettingsUpdate

# Mimetype fix for Windows - must run before StaticFiles is mounted
mimetypes.add_type("text/javascript", ".js", True)

# Add root to path for registry import
ROOT_DIR = Path(__file__).parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from registry import (
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    get_all_settings,
    set_setting,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _parse_yolo_mode(value: str | None) -> bool:
    """Parse YOLO mode string to boolean."""
    return (value or "false").lower() == "true"


def _is_glm_mode() -> bool:
    """Check if GLM API is configured via environment variables."""
    base_url = os.getenv("ANTHROPIC_BASE_URL", "")
    # GLM mode is when ANTHROPIC_BASE_URL is set but NOT pointing to Ollama
    return bool(base_url) and not _is_ollama_mode()


def _is_ollama_mode() -> bool:
    """Check if Ollama API is configured via environment variables."""
    base_url = os.getenv("ANTHROPIC_BASE_URL", "")
    return "localhost:11434" in base_url or "127.0.0.1:11434" in base_url


@router.get("/models", response_model=ModelsResponse)
async def get_available_models():
    """Get list of available models.

    Frontend should call this to get the current list of models
    instead of hardcoding them.
    """
    return ModelsResponse(
        models=[ModelInfo(id=m["id"], name=m["name"]) for m in AVAILABLE_MODELS],
        default=DEFAULT_MODEL,
    )


@router.get("/ollama-models")
async def get_ollama_models():
    """Get list of available models from Ollama instance."""
    models = await ollama_client.get_available_models()
    return {
        "models": [
            {
                "name": model.get("name", ""),
                "size": model.get("size", 0),
                "modified_at": model.get("modified_at", ""),
            }
            for model in models
        ]
    }


@router.post("/test-ollama")
async def test_ollama_connection():
    """Test connection to Ollama instance."""
    success, message = await ollama_client.test_connection()
    return {"success": success, "message": message}


def _parse_int(value: str | None, default: int) -> int:
    """Parse integer setting with default fallback."""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _parse_bool(value: str | None, default: bool = False) -> bool:
    """Parse boolean setting with default fallback."""
    if value is None:
        return default
    return value.lower() == "true"


@router.get("", response_model=SettingsResponse)
async def get_settings():
    """Get current global settings."""
    all_settings = get_all_settings()

    # Mask Gemini API key for security (show only last 4 chars)
    gemini_key = all_settings.get("gemini_api_key")
    masked_key = None
    if gemini_key and len(gemini_key) > 4:
        masked_key = "*" * (len(gemini_key) - 4) + gemini_key[-4:]
    elif gemini_key:
        masked_key = "****"

    return SettingsResponse(
        yolo_mode=_parse_yolo_mode(all_settings.get("yolo_mode")),
        model=all_settings.get("model", DEFAULT_MODEL),
        glm_mode=_is_glm_mode(),
        ollama_mode=_is_ollama_mode(),
        testing_agent_ratio=_parse_int(all_settings.get("testing_agent_ratio"), 1),
        ai_provider=all_settings.get("ai_provider", "cloud"),
        ollama_base_url=all_settings.get("ollama_base_url", "http://localhost:11434"),
        ollama_model=all_settings.get("ollama_model"),
        gemini_api_key=masked_key,
        # Sandbox settings
        use_sandbox=_parse_bool(all_settings.get("use_sandbox"), False),
        sandbox_image_size=all_settings.get("sandbox_image_size", "10gb"),
        sandbox_memory=all_settings.get("sandbox_memory", "4gb"),
        sandbox_timeout=all_settings.get("sandbox_timeout", "3600"),
        sandbox_auto_cleanup=_parse_bool(all_settings.get("sandbox_auto_cleanup"), True),
    )


@router.patch("", response_model=SettingsResponse)
async def update_settings(update: SettingsUpdate):
    """Update global settings."""
    if update.yolo_mode is not None:
        set_setting("yolo_mode", "true" if update.yolo_mode else "false")

    if update.model is not None:
        set_setting("model", update.model)

    if update.testing_agent_ratio is not None:
        set_setting("testing_agent_ratio", str(update.testing_agent_ratio))

    if update.ai_provider is not None:
        set_setting("ai_provider", update.ai_provider)

    if update.ollama_base_url is not None:
        set_setting("ollama_base_url", update.ollama_base_url)
        # Update environment variable for ollama_client
        import os

        os.environ["OLLAMA_BASE_URL"] = update.ollama_base_url

    if update.ollama_model is not None:
        set_setting("ollama_model", update.ollama_model)

    if update.gemini_api_key is not None:
        set_setting("gemini_api_key", update.gemini_api_key)
        # Update environment variable for gemini_client
        import os

        os.environ["GEMINI_API_KEY"] = update.gemini_api_key

    # Sandbox settings
    if update.use_sandbox is not None:
        set_setting("use_sandbox", "true" if update.use_sandbox else "false")
    
    if update.sandbox_image_size is not None:
        set_setting("sandbox_image_size", update.sandbox_image_size)
    
    if update.sandbox_memory is not None:
        set_setting("sandbox_memory", update.sandbox_memory)
    
    if update.sandbox_timeout is not None:
        set_setting("sandbox_timeout", update.sandbox_timeout)
    
    if update.sandbox_auto_cleanup is not None:
        set_setting("sandbox_auto_cleanup", "true" if update.sandbox_auto_cleanup else "false")

    # Return updated settings
    all_settings = get_all_settings()

    # Mask Gemini API key for security
    gemini_key = all_settings.get("gemini_api_key")
    masked_key = None
    if gemini_key and len(gemini_key) > 4:
        masked_key = "*" * (len(gemini_key) - 4) + gemini_key[-4:]
    elif gemini_key:
        masked_key = "****"

    return SettingsResponse(
        yolo_mode=_parse_yolo_mode(all_settings.get("yolo_mode")),
        model=all_settings.get("model", DEFAULT_MODEL),
        glm_mode=_is_glm_mode(),
        ollama_mode=_is_ollama_mode(),
        testing_agent_ratio=_parse_int(all_settings.get("testing_agent_ratio"), 1),
        ai_provider=all_settings.get("ai_provider", "cloud"),
        ollama_base_url=all_settings.get("ollama_base_url", "http://localhost:11434"),
        ollama_model=all_settings.get("ollama_model"),
        gemini_api_key=masked_key,
        # Sandbox settings
        use_sandbox=_parse_bool(all_settings.get("use_sandbox"), False),
        sandbox_image_size=all_settings.get("sandbox_image_size", "10gb"),
        sandbox_memory=all_settings.get("sandbox_memory", "4gb"),
        sandbox_timeout=all_settings.get("sandbox_timeout", "3600"),
        sandbox_auto_cleanup=_parse_bool(all_settings.get("sandbox_auto_cleanup"), True),
    )

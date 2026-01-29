"""
Ollama API Client
=================

Client for interacting with local Ollama instances.
Supports listing available models and streaming chat completions.

Environment variables:
- OLLAMA_BASE_URL (optional, default: http://localhost:11434)
"""

import os
from typing import AsyncGenerator, Iterable, Optional

import httpx

DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"


def get_ollama_base_url() -> str:
    """Get the Ollama base URL from settings or environment."""
    return os.getenv("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL)


def is_ollama_configured() -> bool:
    """Check if Ollama is configured."""
    # Check if OLLAMA_BASE_URL is set or if using default local instance
    base_url = get_ollama_base_url()
    return bool(base_url)


async def get_available_models() -> list[dict]:
    """
    Fetch available models from Ollama instance.
    
    Returns:
        List of model info dicts with 'name', 'modified_at', 'size', etc.
    """
    base_url = get_ollama_base_url()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            return data.get("models", [])
    except Exception as e:
        print(f"Error fetching Ollama models: {e}")
        return []


async def stream_chat(
    user_message: str,
    *,
    system_prompt: Optional[str] = None,
    model: str = "llama3.2",
    extra_messages: Optional[Iterable[dict]] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat completion from Ollama.
    
    Args:
        user_message: Primary user input
        system_prompt: Optional system prompt
        model: Model name (e.g., "llama3.2", "mistral", "codellama")
        extra_messages: Optional prior messages (list of {"role","content"})
        
    Yields:
        Text chunks as they arrive.
    """
    base_url = get_ollama_base_url()
    
    messages = []
    
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    if extra_messages:
        messages.extend(extra_messages)
    
    messages.append({"role": "user", "content": user_message})
    
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{base_url}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            import json
                            data = json.loads(line)
                            if "message" in data:
                                content = data["message"].get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        yield f"\n\n[Error connecting to Ollama: {e}]"


async def test_connection() -> tuple[bool, str]:
    """
    Test connection to Ollama instance.
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    base_url = get_ollama_base_url()
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])
            return True, f"Connected successfully. {len(models)} models available."
    except httpx.ConnectError:
        return False, f"Cannot connect to Ollama at {base_url}. Is Ollama running?"
    except Exception as e:
        return False, f"Connection error: {str(e)}"

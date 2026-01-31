"""
Ollama Instance Detection Utility
==================================

Automatically detects running Ollama instances by checking common ports
and returns the active instance URL.

This is useful when Ollama is auto-started by the system on different ports.
"""

import httpx
import os
import socket
from typing import Optional


# Common Ollama ports (default is 11434, but can run on others)
COMMON_OLLAMA_PORTS = [11434, 36199, 11435, 8000, 8080, 5000]


def detect_ollama_url() -> Optional[str]:
    """
    Automatically detect running Ollama instance.
    
    Returns:
        The URL of the running Ollama instance, or None if not found.
        Priority:
        1. OLLAMA_BASE_URL environment variable (if explicitly set and non-empty)
        2. Localhost ports in order: 11434, 36199, 11435, 8000, 8080, 5000
        3. OLLAMA_HOST environment variable (if set)
    """
    # First check if OLLAMA_BASE_URL is explicitly set and non-empty
    env_url = os.getenv("OLLAMA_BASE_URL", "").strip()
    if env_url and env_url != "http://localhost:11434":
        # Try the explicitly set URL
        if _test_ollama_connection(env_url):
            return env_url
    
    # Try checking OLLAMA_HOST env variable
    ollama_host = os.getenv("OLLAMA_HOST", "").strip()
    if ollama_host:
        url = _normalize_url(ollama_host)
        if _test_ollama_connection(url):
            return url
    
    # Try common ports
    for port in COMMON_OLLAMA_PORTS:
        url = f"http://localhost:{port}"
        if _test_ollama_connection(url):
            return url
    
    # No Ollama found
    return None


def _normalize_url(host: str) -> str:
    """Normalize Ollama host to full URL."""
    if host.startswith("http://") or host.startswith("https://"):
        return host
    if host.startswith("localhost:") or host.startswith("127.0.0.1:"):
        return f"http://{host}"
    return f"http://{host}:11434"


def _test_ollama_connection(url: str, timeout: float = 1.0) -> bool:
    """
    Test if Ollama is running at the given URL using sync httpx.
    
    Args:
        url: The URL to test
        timeout: Connection timeout in seconds
        
    Returns:
        True if Ollama is responding, False otherwise
    """
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(f"{url}/api/tags")
            return response.status_code == 200
    except Exception:
        return False


def get_ollama_url_sync() -> Optional[str]:
    """
    Synchronous Ollama detection.
    Use this in non-async contexts.
    """
    return detect_ollama_url()


def get_ollama_url() -> str:
    """
    Get Ollama URL with fallback to default.
    Always returns a URL (never None or empty).
    """
    detected_url = get_ollama_url_sync()
    if detected_url:
        return detected_url
    
    # Fallback to environment variable or default
    env_url = os.getenv("OLLAMA_BASE_URL", "").strip()
    if env_url:
        return env_url
    
    return "http://localhost:11434"

"""
Ollama Management Router
========================

Provides automated Ollama installation, detection, and setup.
"""

import asyncio
import logging
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from server.ollama_client import get_available_models, get_ollama_base_url

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ollama", tags=["ollama-manager"])


class OllamaStatus(BaseModel):
    installed: bool
    running: bool
    version: Optional[str] = None
    base_url: str
    models_count: int
    models: list[dict] = Field(default_factory=list)
    connection_url: str  # URL that should work from Docker
    issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)


class InstallRequest(BaseModel):
    auto_install: bool = True


class ModelDownloadRequest(BaseModel):
    model_name: str


def _check_ollama_installed() -> tuple[bool, Optional[str]]:
    """Check if Ollama is installed on the system."""
    ollama_path = shutil.which("ollama")
    if not ollama_path:
        return False, None
    
    try:
        result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            return True, version
    except Exception as e:
        logger.error(f"Error checking Ollama version: {e}")
    
    return True, "unknown"


def _check_ollama_service() -> bool:
    """Check if Ollama service is running."""
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "ollama"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        # Fallback: try to connect to the API
        return False


async def _check_ollama_api(base_url: str) -> bool:
    """Check if Ollama API is accessible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            return response.status_code == 200
    except Exception as e:
        logger.debug(f"Ollama API check failed: {e}")
        return False


def _get_system_info() -> dict:
    """Get system information for platform-specific setup."""
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "python_version": platform.python_version(),
    }


def _generate_install_script() -> str:
    """Generate installation script based on the OS."""
    system = platform.system()
    
    if system == "Linux":
        return """#!/bin/bash
# Ollama Installation Script for Linux

echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "Starting Ollama service..."
sudo systemctl start ollama
sudo systemctl enable ollama

echo "Ollama installed successfully!"
echo "Testing installation..."
ollama --version
"""
    elif system == "Darwin":  # macOS
        return """#!/bin/bash
# Ollama Installation Script for macOS

echo "Installing Ollama..."
brew install ollama

echo "Starting Ollama service..."
brew services start ollama

echo "Ollama installed successfully!"
echo "Testing installation..."
ollama --version
"""
    elif system == "Windows":
        return """@echo off
REM Ollama Installation Script for Windows

echo Installing Ollama...
echo Please download and run the installer from: https://ollama.com/download/windows

echo After installation, Ollama should start automatically.
echo You can verify by running: ollama --version

pause
"""
    else:
        return "# Unsupported operating system"


def _get_docker_connection_url() -> str:
    """Get the correct Ollama URL for Docker container to use."""
    system = platform.system()
    
    # For Linux, use host.docker.internal (requires extra_hosts in docker-compose)
    # For macOS/Windows, host.docker.internal works by default
    return "http://host.docker.internal:11434"


def _diagnose_connection_issues(status: OllamaStatus) -> list[str]:
    """Diagnose connection issues and provide recommendations."""
    recommendations = []
    
    if not status.installed:
        recommendations.append("Ollama is not installed. Click 'Install Ollama' to set it up.")
        return recommendations
    
    if not status.running:
        system = platform.system()
        if system == "Linux":
            recommendations.append("Start Ollama service: sudo systemctl start ollama")
        elif system == "Darwin":
            recommendations.append("Start Ollama service: brew services start ollama")
        else:
            recommendations.append("Start Ollama: Open the Ollama app from your applications")
        return recommendations
    
    if status.models_count == 0:
        recommendations.append("No models installed. Download a model first (e.g., 'ollama pull llama3.2')")
    
    # Check Docker connectivity
    if "host.docker.internal" in status.connection_url:
        system = platform.system()
        if system == "Linux":
            recommendations.append(
                "On Linux, ensure docker-compose.yml has 'extra_hosts: host.docker.internal:host-gateway'"
            )
    
    return recommendations


@router.get("/status", response_model=OllamaStatus)
async def get_ollama_status():
    """
    Check Ollama installation and running status.
    Provides comprehensive diagnostics and recommendations.
    """
    installed, version = _check_ollama_installed()
    base_url = get_ollama_base_url()
    connection_url = _get_docker_connection_url()
    
    # Check if API is accessible
    api_accessible = await _check_ollama_api(base_url)
    
    # Get models if accessible
    models = []
    if api_accessible:
        try:
            models = await get_available_models()
        except Exception as e:
            logger.error(f"Error fetching models: {e}")
    
    status = OllamaStatus(
        installed=installed,
        running=api_accessible,
        version=version,
        base_url=base_url,
        models_count=len(models),
        models=models,
        connection_url=connection_url,
        issues=[],
        recommendations=[]
    )
    
    # Add issues
    if not installed:
        status.issues.append("Ollama is not installed on this system")
    elif not api_accessible:
        status.issues.append("Ollama is installed but not running or not accessible")
    elif len(models) == 0:
        status.issues.append("No models installed")
    
    # Generate recommendations
    status.recommendations = _diagnose_connection_issues(status)
    
    return status


@router.get("/install-script")
async def get_install_script():
    """
    Generate platform-specific installation script.
    """
    system_info = _get_system_info()
    script = _generate_install_script()
    
    return {
        "system": system_info,
        "script": script,
        "instructions": _get_install_instructions(),
    }


def _get_install_instructions() -> list[str]:
    """Get step-by-step installation instructions."""
    system = platform.system()
    
    if system == "Linux":
        return [
            "Open a terminal",
            "Run: curl -fsSL https://ollama.com/install.sh | sh",
            "Start the service: sudo systemctl start ollama",
            "Enable on boot: sudo systemctl enable ollama",
            "Verify: ollama --version",
        ]
    elif system == "Darwin":
        return [
            "Install with Homebrew: brew install ollama",
            "Start the service: brew services start ollama",
            "Or download from: https://ollama.com/download/mac",
            "Verify: ollama --version",
        ]
    elif system == "Windows":
        return [
            "Download installer from: https://ollama.com/download/windows",
            "Run the installer",
            "Ollama will start automatically",
            "Open Command Prompt and verify: ollama --version",
        ]
    else:
        return ["Please visit https://ollama.com/download for installation instructions"]


@router.post("/install")
async def install_ollama(request: InstallRequest):
    """
    Attempt to install Ollama automatically (Linux only).
    For other platforms, provide instructions.
    """
    system = platform.system()
    
    if not request.auto_install:
        return {
            "success": False,
            "message": "Auto-install not requested",
            "script": _generate_install_script(),
            "instructions": _get_install_instructions(),
        }
    
    if system != "Linux":
        return {
            "success": False,
            "message": f"Auto-install not supported on {system}",
            "instructions": _get_install_instructions(),
            "download_url": "https://ollama.com/download",
        }
    
    # Auto-install on Linux
    try:
        # Download and run the install script
        result = subprocess.run(
            ["curl", "-fsSL", "https://ollama.com/install.sh"],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode != 0:
            raise Exception(f"Download failed: {result.stderr}")
        
        # Run the installer
        install_result = subprocess.run(
            ["sh"],
            input=result.stdout,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if install_result.returncode != 0:
            raise Exception(f"Installation failed: {install_result.stderr}")
        
        # Start the service
        subprocess.run(["sudo", "systemctl", "start", "ollama"], check=True)
        subprocess.run(["sudo", "systemctl", "enable", "ollama"], check=True)
        
        return {
            "success": True,
            "message": "Ollama installed successfully",
            "version": _check_ollama_installed()[1],
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "message": "Installation timed out. Please install manually.",
            "instructions": _get_install_instructions(),
        }
    except Exception as e:
        logger.error(f"Installation error: {e}")
        return {
            "success": False,
            "message": f"Installation failed: {str(e)}",
            "instructions": _get_install_instructions(),
        }


@router.post("/download-model")
async def download_model(request: ModelDownloadRequest):
    """
    Download an Ollama model.
    """
    installed, _ = _check_ollama_installed()
    
    if not installed:
        raise HTTPException(status_code=400, detail="Ollama is not installed")
    
    model_name = request.model_name
    
    try:
        # Start the download process
        process = await asyncio.create_subprocess_exec(
            "ollama", "pull", model_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            return {
                "success": True,
                "message": f"Model '{model_name}' downloaded successfully",
                "output": stdout.decode(),
            }
        else:
            return {
                "success": False,
                "message": f"Failed to download model '{model_name}'",
                "error": stderr.decode(),
            }
            
    except Exception as e:
        logger.error(f"Model download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start-service")
async def start_ollama_service():
    """
    Attempt to start Ollama service.
    """
    system = platform.system()
    
    try:
        if system == "Linux":
            result = subprocess.run(
                ["sudo", "systemctl", "start", "ollama"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return {"success": True, "message": "Ollama service started"}
            else:
                return {"success": False, "message": result.stderr}
                
        elif system == "Darwin":
            result = subprocess.run(
                ["brew", "services", "start", "ollama"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return {"success": True, "message": "Ollama service started"}
            else:
                return {"success": False, "message": result.stderr}
        else:
            return {
                "success": False,
                "message": "Please start Ollama manually from your applications"
            }
            
    except Exception as e:
        logger.error(f"Start service error: {e}")
        return {"success": False, "message": str(e)}


@router.get("/recommended-models")
async def get_recommended_models():
    """
    Get a list of recommended models for different use cases.
    """
    return {
        "recommended": [
            {
                "name": "llama3.2",
                "size": "2GB",
                "description": "Fast and capable general-purpose model",
                "use_case": "general",
            },
            {
                "name": "qwen2.5-coder:7b",
                "size": "4GB",
                "description": "Excellent for coding tasks",
                "use_case": "coding",
            },
            {
                "name": "mistral",
                "size": "4GB",
                "description": "High quality general-purpose model",
                "use_case": "general",
            },
            {
                "name": "codellama",
                "size": "4GB",
                "description": "Specialized for code generation",
                "use_case": "coding",
            },
            {
                "name": "llama3.2:1b",
                "size": "1GB",
                "description": "Very fast, lightweight model",
                "use_case": "quick",
            },
        ]
    }

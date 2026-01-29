"""
Lightweight Gemini API client using native Google Generative AI API.

Uses Google's native generateContent endpoint for better model support.

Environment variables:
- GEMINI_API_KEY   (required)
- GEMINI_MODEL     (optional, default: gemini-1.5-flash)
"""

import os
from typing import AsyncGenerator, Iterable, Optional

from google import genai
from google.genai import types

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def is_gemini_configured() -> bool:
    """Return True if a Gemini API key is available."""
    return bool(os.getenv("GEMINI_API_KEY"))


def _get_client() -> genai.Client:
    """Get configured Gemini client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    return genai.Client(api_key=api_key)


async def stream_chat(
    user_message: str,
    *,
    system_prompt: Optional[str] = None,
    model: Optional[str] = None,
    extra_messages: Optional[Iterable[dict]] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat completion from Gemini using native generateContent API.

    Args:
        user_message: Primary user input
        system_prompt: Optional system prompt (added to generation config)
        model: Optional model name; defaults to GEMINI_MODEL env or fallback constant
        extra_messages: Optional prior messages (list of {"role","content"})
    Yields:
        Text chunks as they arrive.
    """
    client = _get_client()
    model_name = model or DEFAULT_GEMINI_MODEL
    
    # Build contents list
    contents = []
    
    # Add system instruction as first user message if provided
    if system_prompt:
        contents.append(types.Content(
            role="user",
            parts=[types.Part(text=system_prompt)]
        ))
        contents.append(types.Content(
            role="model",
            parts=[types.Part(text="Understood. I'll follow these instructions.")]
        ))
    
    # Add message history
    if extra_messages:
        for msg in extra_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # Convert OpenAI-style roles to Gemini format
            if role == "assistant":
                role = "model"
            elif role == "system":
                continue  # Already handled above
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=content)]
            ))
    
    # Add user message
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=user_message)]
    ))
    
    try:
        # Stream the response using generateContent
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=0.7,
            )
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        yield f"\n\n[Error from Gemini: {e}]"

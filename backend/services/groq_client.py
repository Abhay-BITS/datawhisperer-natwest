"""
Groq LLM Client with Automatic API Key Rotation.

Reads a pool of Groq API keys from the GROQ_API_KEYS environment variable
(comma-separated). On rate-limit errors (HTTP 429), automatically rotates
to the next key and retries, ensuring uninterrupted service even when
individual free-tier keys hit their daily token limits.

Falls back to a single GROQ_API_KEY if the pool variable is not set.
"""

from groq import Groq, RateLimitError
import os
import json
import time
import logging
import threading
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

MODEL_RELIABILITY = "llama-3.1-8b-instant"  # High limits, for support agents
MODEL_ACCURACY = "llama-3.3-70b-versatile" # High logic, for coding/storytelling

MODEL = MODEL_ACCURACY # Backwards compatibility default


class GroqKeyPool:
    """Thread-safe pool of Groq API keys with automatic rotation.

    When a RateLimitError is encountered, the pool advances to the next key
    so that subsequent calls use a fresh quota. This is transparent to callers.
    """

    def __init__(self):
        keys_csv = os.getenv("GROQ_API_KEYS", "")
        if keys_csv:
            self._keys = [k.strip() for k in keys_csv.split(",") if k.strip()]
        else:
            single = os.getenv("GROQ_API_KEY", "")
            self._keys = [single] if single else []

        if not self._keys:
            raise RuntimeError(
                "No Groq API keys configured. "
                "Set GROQ_API_KEYS (comma-separated) or GROQ_API_KEY."
            )

        self._index = 0
        self._lock = threading.Lock()
        self._clients: dict[int, Groq] = {}
        logger.info("GroqKeyPool initialised with %d key(s).", len(self._keys))

    @property
    def current_client(self) -> Groq:
        """Return the Groq client for the current key index."""
        idx = self._index
        if idx not in self._clients:
            self._clients[idx] = Groq(api_key=self._keys[idx])
        return self._clients[idx]

    def rotate(self) -> bool:
        """Advance to the next API key. Returns False if all keys exhausted."""
        with self._lock:
            next_idx = (self._index + 1) % len(self._keys)
            if next_idx == 0:
                # We've cycled through all keys
                return False
            self._index = next_idx
            logger.warning(
                "Rotated to Groq API key %d/%d after rate limit.",
                self._index + 1,
                len(self._keys),
            )
            return True

    @property
    def total_keys(self) -> int:
        return len(self._keys)


# Module-level singleton
_pool = GroqKeyPool()


def call_groq(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 1500,
    expect_json: bool = True,
    model: str = None,
):
    """Call the Groq LLM with automatic key rotation on rate limits.

    Args:
        system_prompt: The system-role instruction.
        user_prompt: The user-role message.
        temperature: Sampling temperature (0.0–2.0).
        max_tokens: Maximum tokens in the response.
        expect_json: If True, parse the response as JSON.
        model: Optional model override (e.g. llama-3.1-8b-instant).

    Returns:
        Parsed JSON dict (if expect_json) or raw string.

    Raises:
        ValueError: If all API keys are rate-limited or the response is invalid.
    """
    selected_model = model or MODEL
    max_attempts = _pool.total_keys * 2
    original_user_prompt = user_prompt

    for attempt in range(max_attempts):
        try:
            resp = _pool.current_client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=30,
            )
            text = resp.choices[0].message.content.strip()

            if not expect_json:
                return text

            # Strip markdown code fences if present
            if "```" in text:
                parts = text.split("```")
                if len(parts) >= 2:
                    text = parts[1]
                    if text.startswith("json\n"):
                        text = text[5:]
                    elif text.startswith("json"):
                        text = text[4:]

            return json.loads(text.strip())

        except RateLimitError as e:
            logger.warning(
                "Rate limit hit on key %d/%d: %s",
                _pool._index + 1,
                _pool.total_keys,
                str(e)[:120],
            )
            rotated = _pool.rotate()
            if rotated:
                # Immediately retry with the next key
                continue
            else:
                # All keys exhausted — wait briefly and try one more cycle
                if attempt < max_attempts - 1:
                    time.sleep(3)
                    continue
                raise ValueError(
                    "All API keys have reached their rate limits. "
                    "Please wait a few minutes or add more keys to GROQ_API_KEYS."
                )

        except json.JSONDecodeError:
            if attempt < max_attempts - 1:
                user_prompt = (
                    original_user_prompt
                    + "\n\nReturn ONLY valid JSON. No preamble. No markdown."
                )
                continue
            raise ValueError("AI returned invalid format.")

        except Exception as e:
            raise ValueError(f"AI service error: {e}")

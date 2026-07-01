import os
import asyncio
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)


def _sanitize_log_text(value: object) -> str:
    text = str(value)
    text = re.sub(r"key=([^&\s\"']+)", "key=[REDACTED]", text)
    text = re.sub(r"AIza[0-9A-Za-z_-]{20,}", "AIza[REDACTED]", text)
    text = re.sub(r"AQ\.[0-9A-Za-z_.-]{20,}", "AQ.[REDACTED]", text)
    return text


def _is_quota_error(value: object, status_code: int | None = None) -> bool:
    text = str(value).lower()
    return (
        status_code == 429
        or "resource_exhausted" in text
        or "quota" in text
        or "exhausted" in text
    )


def _is_invalid_api_key_error(value: object, status_code: int | None = None) -> bool:
    text = str(value).lower()
    return (
        status_code in {400, 401, 403}
        and (
            "api_key_invalid" in text
            or "api key not valid" in text
            or "invalid api key" in text
            or "key not valid" in text
        )
    ) or (
        "api_key_invalid" in text
        or "api key not valid" in text
        or "invalid api key" in text
    )

try:
    from dotenv import dotenv_values, load_dotenv
except ImportError:
    dotenv_values = None
    load_dotenv = None


def _read_env_file(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}

    if dotenv_values:
        return {
            key: value
            for key, value in dotenv_values(path).items()
            if key and value
        }

    values: Dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def _load_groq_api_key() -> str:
    """Load a server key, with a local-dev fallback to the Expo env file."""
    api_root = Path(__file__).resolve().parents[2]
    workspace_root = api_root.parent

    if load_dotenv:
        load_dotenv(api_root / ".env", override=False)

    key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
    if key:
        return key

    frontend_env = workspace_root / "behtarfasal" / ".env"
    frontend_values = _read_env_file(frontend_env)
    return frontend_values.get("GROQ_API_KEY") or frontend_values.get(
        "EXPO_PUBLIC_GROQ_API_KEY",
        "",
    )


GROQ_API_KEY = _load_groq_api_key()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]

if GROQ_API_KEY:
    logger.info("Groq API key is configured; chatbot will use the Groq API.")
else:
    logger.warning("Groq API key is not set; chatbot will use local fallback replies.")

SYSTEM_PROMPT = """
You are AgriAssist, an expert agricultural AI assistant for Pakistani farmers.
Your goal is to help them with crop recommendations, fertilizer suggestions, disease detection, weather updates, and general farming practices.

CORE RULES:
1. ALWAYS ALWAYS respond in simple Roman Urdu or simple Urdu scripts. Keep it farmer-friendly and actionable.
2. Be concise but helpful. Avoid overly technical jargon.
3. If the user asks about weather, crops, fertilizers, or diseases, and you are provided with specific data in the prompt context, base your answer heavily on that provided data.
4. Answer the current question specifically. Do not give the same generic answer for different questions.
5. Start with the direct recommendation, then give 3-5 practical implementation steps.
6. For general knowledge questions, answer directly from your agricultural knowledge.
7. If exact field-specific advice needs missing data, ask for only the missing items at the end.
8. Use plain text only. Do not use markdown symbols like **, #, tables, or code fences.
9. If you don't know the answer, politely say you don't know in Roman Urdu (e.g., 'Maaf kijiye, mujhe iski maloomat nahi hai').
"""


def _message_value(message: object, field: str) -> str:
    if isinstance(message, dict):
        return str(message.get(field, "") or "")
    return str(getattr(message, field, "") or "")


def _format_gemini_history(history: list = None) -> list:
    """Return valid alternating Gemini turns and skip app-only greeting messages."""
    formatted_history = []

    if not history:
        return formatted_history

    for msg in history[-10:]:
        content = _message_value(msg, "content").strip()
        raw_role = _message_value(msg, "role").strip().lower()

        if not content:
            continue

        if raw_role == "user":
            role = "user"
        elif raw_role in {"ai", "assistant", "model"}:
            role = "model"
        else:
            continue

        # Gemini chat history should begin with a user turn, so ignore the
        # local welcome message that is rendered before the farmer asks.
        if not formatted_history and role != "user":
            continue

        if formatted_history and formatted_history[-1]["role"] == role:
            formatted_history[-1]["parts"][0] += f"\n{content}"
        else:
            formatted_history.append({"role": role, "parts": [content]})

    # The new prompt is sent as the next user turn. If the saved history also
    # ends with a user turn, drop it so Gemini receives a clean conversation.
    if formatted_history and formatted_history[-1]["role"] == "user":
        formatted_history.pop()

    return formatted_history


def _to_rest_contents(history: List[dict], prompt: str) -> List[dict]:
    contents = []

    for item in history:
        text = "\n".join(str(part) for part in item.get("parts", []) if part)
        if not text:
            continue
        contents.append(
            {
                "role": item["role"],
                "parts": [{"text": text}],
            }
        )

    contents.append({"role": "user", "parts": [{"text": prompt}]})
    return contents


def _extract_rest_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts") or []
    return "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()


def _candidate_models() -> List[str]:
    configured = [
        item.strip()
        for item in os.getenv("GROQ_FALLBACK_MODELS", os.getenv("GEMINI_FALLBACK_MODELS", "")).split(",")
        if item.strip()
    ]
    candidates = [GROQ_MODEL, *configured, *GROQ_FALLBACK_MODELS]
    normalized: List[str] = []

    for model in candidates:
        model_name = model.removeprefix("models/")
        if model_name and model_name not in normalized:
            normalized.append(model_name)

    return normalized


def get_gemini_status() -> dict:
    """Return non-secret Groq runtime status for debugging deployment config."""
    return {
        "groq_key_configured": bool(GROQ_API_KEY),
        "groq_model": GROQ_MODEL,
        "candidate_models": _candidate_models(),
        "provider": "groq",
    }


def _to_groq_messages(history: List[dict], prompt: str, system_prompt: str) -> List[dict]:
    messages = [{"role": "system", "content": system_prompt}]

    for item in history:
        role = _message_value(item, "role").strip().lower()
        parts = item.get("parts", []) if isinstance(item, dict) else getattr(item, "parts", [])
        content = "\n".join(str(part) for part in parts if part).strip()

        if not content:
            continue

        if role == "user":
            messages.append({"role": "user", "content": content})
        elif role in {"ai", "assistant", "model"}:
            messages.append({"role": "assistant", "content": content})

    messages.append({"role": "user", "content": prompt})
    return messages


def _send_groq_rest(prompt: str, history: list, system_prompt: str, model_name: str) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    body = {
        "model": model_name,
        "messages": _to_groq_messages(history, prompt, system_prompt),
        "temperature": 0.55,
        "top_p": 0.9,
        "max_tokens": 650,
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=35) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    choices = response_payload.get("choices") or []
    if not choices:
        return ""

    message = choices[0].get("message") or {}
    return str(message.get("content", "") or "").strip()


async def generate_gemini_response(prompt: str, history: list = None, system_prompt: str = SYSTEM_PROMPT) -> str:
    """Generate a real-time Groq response."""
    if not GROQ_API_KEY:
        return ""

    try:
        formatted_history = _format_gemini_history(history)

        quota_failures = 0

        for model_name in _candidate_models():
            try:
                return await asyncio.to_thread(
                    _send_groq_rest,
                    prompt,
                    formatted_history,
                    system_prompt,
                    model_name,
                )
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", errors="ignore")
                if _is_invalid_api_key_error(detail, e.code):
                    logger.error(
                        "Groq API key is invalid. Update GROQ_API_KEY on the server and restart it."
                    )
                    return ""
                if _is_quota_error(detail, e.code):
                    quota_failures += 1
                logger.warning("Groq model %s failed: %s %s", model_name, e.code, _sanitize_log_text(detail))
            except Exception as e:
                if _is_invalid_api_key_error(e):
                    logger.error(
                        "Groq API key is invalid. Update GROQ_API_KEY on the server and restart it."
                    )
                    return ""
                if _is_quota_error(e):
                    quota_failures += 1
                logger.warning("Groq model %s failed: %s", model_name, _sanitize_log_text(e))

        if quota_failures:
            logger.warning("Groq quota/resource exhausted for configured backend key.")

        return ""
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        if _is_invalid_api_key_error(detail, e.code):
            logger.error(
                "Groq REST API key is invalid. Update GROQ_API_KEY on the server and restart it."
            )
            return ""
        logger.error("Groq REST API error: %s %s", e.code, _sanitize_log_text(detail))
        return ""
    except Exception as e:
        if _is_invalid_api_key_error(e):
            logger.error(
                "Groq API key is invalid. Update GROQ_API_KEY on the server and restart it."
            )
            return ""
        logger.error("Groq API error: %s", _sanitize_log_text(e))
        return ""

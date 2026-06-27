import os
import asyncio
import base64
import json
import logging
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except ImportError:
    genai = None

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


def _load_gemini_api_key() -> str:
    """Load a server key, with a local-dev fallback to the Expo env file."""
    api_root = Path(__file__).resolve().parents[2]
    workspace_root = api_root.parent

    if load_dotenv:
        load_dotenv(api_root / ".env", override=False)

    key = os.getenv("GEMINI_API_KEY") or os.getenv("EXPO_PUBLIC_GEMINI_API_KEY")
    if key:
        return key

    frontend_env = workspace_root / "behtarfasal" / ".env"
    frontend_values = _read_env_file(frontend_env)
    return frontend_values.get("GEMINI_API_KEY") or frontend_values.get(
        "EXPO_PUBLIC_GEMINI_API_KEY",
        "",
    )


GEMINI_API_KEY = _load_gemini_api_key()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
]
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

TRANSCRIPTION_PROMPT = """
Listen carefully and transcribe this farmer voice note into plain text.
The speech may be Roman Urdu, Urdu, Punjabi, Saraiki, Hindi, or English about farming.
Return only the best-effort transcript. Do not translate, explain, add markdown, or add labels.
If a few words are unclear, keep the clear words and approximate the unclear words from context.
Return an empty string only when there is truly no human speech in the audio.
""".strip()

if GEMINI_API_KEY and genai:
    genai.configure(api_key=GEMINI_API_KEY)
elif GEMINI_API_KEY and not genai:
    logger.info("google-generativeai is not installed; chatbot will use Gemini REST API.")
else:
    logger.warning("Gemini API key is not set; chatbot will use local fallback replies.")

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
        for item in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",")
        if item.strip()
    ]
    candidates = [GEMINI_MODEL, *configured, *GEMINI_FALLBACK_MODELS]
    normalized: List[str] = []

    for model in candidates:
        model_name = model.removeprefix("models/")
        if model_name and model_name not in normalized:
            normalized.append(model_name)

    return normalized


def _send_gemini_rest(prompt: str, history: list, system_prompt: str, model_name: str) -> str:
    model = urllib.parse.quote(model_name, safe="")
    url = f"{GEMINI_API_URL.format(model=model)}?key={urllib.parse.quote(GEMINI_API_KEY)}"
    body = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": _to_rest_contents(history, prompt),
        "generationConfig": {
            "temperature": 0.55,
            "topP": 0.9,
            "maxOutputTokens": 650,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=35) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    return _extract_rest_text(response_payload)


def _send_gemini_audio_rest(audio_bytes: bytes, mime_type: str, model_name: str) -> str:
    model = urllib.parse.quote(model_name, safe="")
    url = f"{GEMINI_API_URL.format(model=model)}?key={urllib.parse.quote(GEMINI_API_KEY)}"
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": TRANSCRIPTION_PROMPT},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64.b64encode(audio_bytes).decode("utf-8"),
                        },
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 180,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=45) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    return _extract_rest_text(response_payload)


def _upload_and_transcribe_audio(audio_bytes: bytes, mime_type: str, model_name: str) -> str:
    if not genai:
        return _send_gemini_audio_rest(audio_bytes, mime_type, model_name)

    import tempfile

    suffix = {
        "audio/3gpp": ".3gp",
        "audio/mp4": ".m4a",
        "audio/m4a": ".m4a",
        "audio/webm": ".webm",
        "audio/wav": ".wav",
    }.get(mime_type, ".m4a")

    temp_path = None
    uploaded_file = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        uploaded_file = genai.upload_file(path=temp_path, mime_type=mime_type)

        for _ in range(20):
            state_name = getattr(getattr(uploaded_file, "state", None), "name", "")

            if state_name == "ACTIVE":
                break

            if state_name == "FAILED":
                raise RuntimeError("Gemini audio file processing failed")

            time.sleep(0.5)
            uploaded_file = genai.get_file(uploaded_file.name)

        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                "temperature": 0,
                "max_output_tokens": 180,
            },
        )
        response = model.generate_content([uploaded_file, TRANSCRIPTION_PROMPT])
        return (response.text or "").strip()
    finally:
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                logger.debug("Could not delete Gemini uploaded transcription file", exc_info=True)
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                logger.debug("Could not delete temporary transcription file", exc_info=True)

async def generate_gemini_response(prompt: str, history: list = None, system_prompt: str = SYSTEM_PROMPT) -> str:
    """Generate a real-time Gemini response."""
    if not GEMINI_API_KEY:
        return ""

    try:
        formatted_history = _format_gemini_history(history)

        for model_name in _candidate_models():
            try:
                if not genai:
                    return await asyncio.to_thread(
                        _send_gemini_rest,
                        prompt,
                        formatted_history,
                        system_prompt,
                        model_name,
                    )

                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_prompt,
                    generation_config={
                        "temperature": 0.55,
                        "top_p": 0.9,
                        "max_output_tokens": 650,
                    },
                )

                chat = model.start_chat(history=formatted_history)
                response = await asyncio.to_thread(chat.send_message, prompt)
                return response.text
            except urllib.error.HTTPError as e:
                detail = e.read().decode("utf-8", errors="ignore")
                logger.warning("Gemini model %s failed: %s %s", model_name, e.code, detail)
            except Exception as e:
                logger.warning("Gemini model %s failed: %s", model_name, str(e))

        return "Maaf kijiye, Gemini API se jawab nahi aa saka. (System Error)"
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        logger.error("Gemini REST API error: %s %s", e.code, detail)
        return "Maaf kijiye, Gemini API se jawab nahi aa saka. (System Error)"
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        return "Maaf kijiye, technical masle ki wajah se mein abhi jawab nahi de sakta. (System Error)"


async def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe a short farmer voice note using Gemini audio input."""
    if not GEMINI_API_KEY:
        return ""

    for model_name in _candidate_models():
        try:
            transcript = await asyncio.to_thread(
                _upload_and_transcribe_audio,
                audio_bytes,
                mime_type,
                model_name,
            )
            transcript = re.sub(r"\s+", " ", transcript or "").strip()
            if transcript:
                return transcript
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore")
            logger.warning("Gemini transcription model %s failed: %s %s", model_name, e.code, detail)
        except Exception as e:
            logger.warning("Gemini transcription model %s failed: %s", model_name, str(e))

    return ""

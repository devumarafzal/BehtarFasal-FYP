import logging
import re
from typing import Any, Dict, List

from app.models.chat_model import ChatRequest, ChatResponse
from app.services.gemini_service import generate_gemini_response

logger = logging.getLogger(__name__)

CROP_ALIASES = {
    "gandum": "gandum/wheat",
    "gehu": "gandum/wheat",
    "wheat": "gandum/wheat",
    "chawal": "chawal/rice",
    "rice": "chawal/rice",
    "dhaan": "chawal/rice",
    "makai": "makai/maize",
    "maize": "makai/maize",
    "corn": "makai/maize",
    "kapas": "kapas/cotton",
    "cotton": "kapas/cotton",
    "sugarcane": "ganna/sugarcane",
    "ganna": "ganna/sugarcane",
    "tomato": "tamatar/tomato",
    "tamatar": "tamatar/tomato",
    "potato": "aloo/potato",
    "aloo": "aloo/potato",
    "onion": "piyaz/onion",
    "piyaz": "piyaz/onion",
    "mango": "aam/mango",
    "aam": "aam/mango",
}

INTENTS = {
    "WEATHER": [
        "mausam",
        "weather",
        "barish",
        "rain",
        "temperature",
        "dhoop",
        "garmi",
        "sardi",
        "fog",
        "dhund",
    ],
    "IRRIGATION": [
        "pani",
        "water",
        "irrigation",
        "tube well",
        "nami",
        "moisture",
        "aabpashi",
        "sichai",
    ],
    "CROP": [
        "crop",
        "fasal",
        "koun si fasal",
        "recommend",
        "boien",
        "grow",
        "plant",
        "sowing",
        "kasht",
        *CROP_ALIASES.keys(),
    ],
    "FERTILIZER": [
        "fertilizer",
        "khad",
        "khaad",
        "urea",
        "dap",
        "npk",
        "potash",
        "sop",
        "mop",
        "zinc",
        "boron",
        "compost",
        "gobar",
    ],
    "DISEASE": [
        "disease",
        "bemari",
        "bimari",
        "keera",
        "keere",
        "pest",
        "sundi",
        "leaves",
        "leaf",
        "patte",
        "patton",
        "daagh",
        "daag",
        "fungus",
        "peela",
        "yellow",
        "spots",
        "rust",
        "blight",
    ],
}

INTENT_PRIORITY = ["DISEASE", "FERTILIZER", "IRRIGATION", "WEATHER", "CROP"]


def _find_matches(message: str, lookup: Dict[str, str]) -> List[str]:
    found: List[str] = []
    lower_msg = message.lower()

    for needle, label in lookup.items():
        if re.search(rf"\b{re.escape(needle)}\b", lower_msg) and label not in found:
            found.append(label)

    return found


def _format_items(items: List[str], fallback: str) -> str:
    if not items:
        return fallback
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + f" aur {items[-1]}"


def detect_intent(message: str) -> str:
    """Classify the user message into a farming intent."""
    msg = message.lower()
    scores = {intent: 0 for intent in INTENTS.keys()}

    for intent, keywords in INTENTS.items():
        for keyword in keywords:
            if re.search(rf"\b{re.escape(keyword.lower())}\b", msg):
                scores[intent] += 1

    best_score = max(scores.values())
    if best_score <= 0:
        return "GENERAL"

    for intent in INTENT_PRIORITY:
        if scores.get(intent) == best_score:
            return intent

    return "GENERAL"


async def mock_fetch_user_context(user_id: str) -> Dict[str, Any]:
    """Mock MongoDB fetch for user context."""
    if not user_id:
        return {}

    # Real implementation would query MongoDB here.
    return {"farm_size": "5 acres", "location": "Punjab", "soil_type": "Loamy"}


def _build_context_text(user_context: Dict[str, Any]) -> str:
    if not user_context:
        return "Farmer context: not provided."

    details = ", ".join(f"{key}: {value}" for key, value in user_context.items())
    return f"Farmer context: {details}."


RAIN_WORDS = ("rain", "drizzle", "thunderstorm", "shower")


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _format_number(value: Any, suffix: str = "") -> str:
    numeric_value = _safe_float(value)
    if numeric_value.is_integer():
        return f"{int(numeric_value)}{suffix}"
    return f"{numeric_value:.1f}{suffix}"


def _weather_text(entry: Dict[str, Any]) -> str:
    return f"{entry.get('condition', '')} {entry.get('description', '')}".strip()


def _mentions_rain(text: str) -> bool:
    lower_text = text.lower()
    return any(word in lower_text for word in RAIN_WORDS)


def analyze_weather_payload(weather_data: Dict[str, Any]) -> Dict[str, Any]:
    if not weather_data:
        return {"has_data": False}

    current = weather_data.get("current") or {}
    hourly = weather_data.get("hourly") or []
    today_key = weather_data.get("todayKey")
    city = weather_data.get("city") or "aapke ilaqe"

    today_entries = [
        entry for entry in hourly
        if not today_key or entry.get("dateKey") == today_key
    ]
    if not today_entries:
        today_entries = hourly[:8]

    current_text = _weather_text(current)
    current_rain_mm = _safe_float(current.get("rainMm"))
    current_is_raining = _mentions_rain(current_text) or current_rain_mm > 0

    max_probability = 0.0
    total_rain_mm = current_rain_mm
    rain_entries: List[Dict[str, Any]] = []

    for entry in today_entries:
        probability = _safe_float(entry.get("pop"))
        if probability > 1:
            probability = probability / 100

        rain_mm = _safe_float(entry.get("rainMm"))
        total_rain_mm += rain_mm
        max_probability = max(max_probability, probability)
        entry_text = _weather_text(entry)
        has_rain = _mentions_rain(entry_text) or rain_mm > 0 or probability >= 0.3

        if has_rain:
            rain_entries.append({
                "time": entry.get("timeLabel") or entry.get("time") or "",
                "condition": entry_text or "rain chance",
                "probability": probability,
                "rain_mm": rain_mm,
            })

    rain_expected = current_is_raining or bool(rain_entries)
    probability_percent = int(round(max_probability * 100))
    rain_times = [entry["time"] for entry in rain_entries if entry.get("time")][:4]

    if current_is_raining:
        answer = f"Haan, {city} mein abhi barish report ho rahi hai."
    elif rain_expected:
        answer = f"Haan, {city} mein aaj barish ka chance hai."
    elif probability_percent >= 15:
        answer = (
            f"{city} mein aaj barish ka chance low hai "
            f"(taqreeban {probability_percent}%)."
        )
    else:
        answer = f"Nahi, {city} mein aaj barish expected nahi lag rahi."

    timing = (
        f"Zyada chance: {', '.join(rain_times)}."
        if rain_times
        else "Aaj ke forecast slots mein clear rain timing nahi aa rahi."
    )

    prompt_note = (
        f"Live weather data attached for {city}. Direct rain answer: {answer} "
        f"Current: {current_text or 'not available'}, temp "
        f"{_format_number(current.get('tempC'), 'C') if current else 'not available'}, "
        f"humidity {_format_number(current.get('humidity'), '%') if current else 'not available'}. "
        f"Max rain probability today: {probability_percent}%. "
        f"Total forecast rain: {_format_number(total_rain_mm, ' mm')}. {timing}"
    )

    return {
        "has_data": True,
        "city": city,
        "answer": answer,
        "rain_expected_today": rain_expected,
        "rain_probability_percent": probability_percent,
        "rain_times": rain_times,
        "total_rain_mm": round(total_rain_mm, 1),
        "current": current,
        "current_text": current_text,
        "timing": timing,
        "prompt_note": prompt_note,
    }


def build_weather_reply(weather_analysis: Dict[str, Any]) -> str:
    if not weather_analysis.get("has_data"):
        return ""

    current = weather_analysis.get("current") or {}
    current_text = weather_analysis.get("current_text") or "not available"
    probability = weather_analysis.get("rain_probability_percent", 0)
    rain_expected = weather_analysis.get("rain_expected_today", False)

    if rain_expected:
        farming_action = (
            "Spray aur fertilizer application ko barish ke qareeb avoid karein; "
            "field drainage aur harvested saman cover kar lein."
        )
    else:
        farming_action = (
            "Normal field work ho sakta hai, lekin irrigation se pehle mitti ki "
            "nami check kar lein."
        )

    return (
        f"{weather_analysis['answer']}\n"
        f"1. Abhi condition: {current_text}, temp "
        f"{_format_number(current.get('tempC'), 'C')}, humidity "
        f"{_format_number(current.get('humidity'), '%')}.\n"
        f"2. Aaj rain chance: {probability}%. {weather_analysis['timing']}\n"
        f"3. Expected rain amount: "
        f"{_format_number(weather_analysis.get('total_rain_mm'), ' mm')}.\n"
        f"4. Farming action: {farming_action}"
    )


def build_ai_prompt(
    intent: str,
    user_message: str,
    user_context: Dict[str, Any],
    data_note: str,
) -> str:
    """Create a prompt that pushes the model toward specific implementation advice."""
    crops = _format_items(_find_matches(user_message, CROP_ALIASES), "crop not clearly mentioned")

    return f"""
{_build_context_text(user_context)}
Detected intent: {intent}
Detected crop words: {crops}
Current farmer question: {user_message}
Available app/backend note: {data_note}

Reply rules:
- Use simple Roman Urdu.
- Do not repeat the question.
- Start with one direct recommendation for this exact question.
- Then give 3 to 5 numbered implementation steps with timing, checks, or precautions.
- Do not invent exact kg/dose, weather forecast, or disease name when required data is missing.
- If exact advice needs missing details, ask for those details in one short final line.
""".strip()


def build_fallback_reply(intent: str, user_message: str, user_context: Dict[str, Any]) -> str:
    """Return a useful local reply when the AI provider is unavailable."""
    crops = _find_matches(user_message, CROP_ALIASES)
    crop_text = _format_items(crops, "is crop")
    context_line = ""

    if user_context:
        location = user_context.get("location")
        soil_type = user_context.get("soil_type")
        if location or soil_type:
            context_line = f" Aapki profile ke mutabiq location {location or 'unknown'} aur soil {soil_type or 'unknown'} hai."

    if intent == "WEATHER":
        return (
            f"Live weather data is chat mein available nahi hai, is liye forecast assume nahi karunga.{context_line}\n"
            "1. Pani subah jaldi ya shaam ko dein taa-ke evaporation kam ho.\n"
            "2. Agar barish ka chance ho to irrigation 24 ghante delay karein aur zameen ki nami check karein.\n"
            "3. Spray hamesha tez hawa, dhoop aur barish se pehle avoid karein.\n"
            "4. Zyada garmi mein mulching ya halki hoeing se nami bach sakti hai.\n"
            "Exact mashwara ke liye apna shehar aur aaj ka forecast/share weather bata dein."
        )

    if intent == "IRRIGATION":
        return (
            f"{crop_text.capitalize()} ke liye pani ka faisla zameen ki nami aur crop stage par karein.{context_line}\n"
            "1. Mitti 2-3 inch gehrai tak check karein; agar sukhi ho to irrigation dein.\n"
            "2. Subah ya shaam pani dein, dopahar mein zyada pani zaya hota hai.\n"
            "3. Standing water se bachain, khas taur par sabziyon aur cotton mein roots damage ho sakti hain.\n"
            "4. Barish ke baad kam az kam ek din ruk kar field ki nami dobara check karein.\n"
            "Exact schedule ke liye crop stage, soil type aur last irrigation date bata dein."
        )

    if intent == "CROP":
        return (
            f"Crop selection ke liye sab se pehle soil NPK, pH, rainfall aur pani ki availability match karni chahiye.{context_line}\n"
            "1. App ke Crop Recommendation form mein nitrogen, phosphorus, potassium, pH, temperature, humidity aur rainfall fill karein.\n"
            "2. Agar pani limited hai to high water crops se bachain; agar pani acha hai to rice/sugarcane type crops consider ho sakti hain.\n"
            "3. Punjab mein season ke mutabiq Kharif ke liye rice, maize, cotton aur Rabi ke liye wheat common options hain.\n"
            "4. Final crop se pehle market rate, seed cost aur expected yield compare karein.\n"
            "Exact recommendation ke liye soil test values aur season bata dein."
        )

    if intent == "FERTILIZER":
        return (
            f"{crop_text.capitalize()} ke liye khad exact dose ke baghair general nahi deni chahiye, warna cost aur crop dono affect ho sakte hain.{context_line}\n"
            "1. Soil test ya app ke Fertilizer Suggestion form mein soil type, crop, moisture, N, P aur K values enter karein.\n"
            "2. DAP/Phosphorus aam tor par sowing ke qareeb diya jata hai; urea ko split doses mein dena zyada behtar hota hai.\n"
            "3. Urea ko pani se pehle ya halki nami mein apply karein; sukhi zameen par zyada loss ho sakta hai.\n"
            "4. Khad ko seed ya patton ke direct contact se bachain, khas taur par young plants mein.\n"
            "Exact kg/acre ke liye crop stage, acres aur soil NPK values bhej dein."
        )

    if intent == "DISEASE":
        return (
            f"{crop_text.capitalize()} mein disease/pest ka masla ho sakta hai, lekin photo ya symptoms ke baghair exact naam confirm nahi karna chahiye.{context_line}\n"
            "1. Affected patton ki clear photo lein: upper side, lower side aur poora plant.\n"
            "2. App ke Disease Detection screen mein photo upload karein taa-ke model disease identify kare.\n"
            "3. Filhal affected leaves/plants ko mark karein aur unnecessary spray avoid karein.\n"
            "4. Agar keera nazar aaye to subah ya shaam underside of leaves check karein.\n"
            "5. Spray sirf diagnosis ke baad label dose ke mutabiq karein.\n"
            "Exact help ke liye crop name, symptoms aur photo share karein."
        )

    return (
        "Main behtar jawab tab de sakta hoon jab aap crop aur masla thora specific bata dein.\n"
        "1. Crop ka naam likhein, jaise gandum, chawal, cotton ya makai.\n"
        "2. Masla batayein: khad, pani, bemari, pest, weather ya crop selection.\n"
        "3. Agar possible ho to soil type, area/location aur crop stage bhi add karein.\n"
        "Example: 'Gandum booting stage par hai, patte peele ho rahe hain, kya karoon?'"
    )


def clean_reply(reply: str, user_message: str) -> str:
    """Remove obvious question echoing from AI replies."""
    if not reply:
        return reply

    cleaned = reply.strip()
    question = user_message.strip()

    if question and question in cleaned:
        cleaned = cleaned.replace(question, "").replace("''", "")

    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"^[\s,.:;-]+", "", cleaned)
    return cleaned.strip()


async def process_chat_message(request: ChatRequest) -> ChatResponse:
    user_message = request.message.strip()
    intent = detect_intent(user_message)
    user_context = await mock_fetch_user_context(request.userId)
    weather_analysis = analyze_weather_payload(request.weather or {})

    data: Dict[str, Any] = {}

    data_notes = {
        "GENERAL": "Give a direct, useful answer to the farmer's question.",
        "WEATHER": (
            weather_analysis["prompt_note"]
            if weather_analysis.get("has_data")
            else "No live weather API data is attached. Do not claim a live forecast, but give practical weather-based farming guidance."
        ),
        "IRRIGATION": "No live moisture sensor data is attached. Give practical irrigation timing, field checks, and precautions.",
        "CROP": "If exact soil/weather values are missing, still suggest practical crop-selection criteria and likely options for Pakistan.",
        "FERTILIZER": "If exact NPK or soil values are missing, still give a safe general fertilizer approach and explain what data would improve the dose.",
        "DISEASE": "No image is attached. Still explain likely causes from the described symptoms, safe immediate steps, and when a photo/lab check is needed.",
    }

    if intent == "WEATHER":
        data = {
            "weather_data_available": weather_analysis.get("has_data", False),
            "rain_expected_today": weather_analysis.get("rain_expected_today"),
            "rain_probability_percent": weather_analysis.get("rain_probability_percent"),
            "city": weather_analysis.get("city"),
            "rain_times": weather_analysis.get("rain_times", []),
        }
    elif intent == "CROP":
        data = {"required_fields": ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"]}
    elif intent == "FERTILIZER":
        data = {"required_fields": ["soil_type", "crop_type", "moisture", "temperature", "humidity", "nitrogen", "phosphorus", "potassium"]}
    elif intent == "DISEASE":
        data = {"image_required": True}

    if intent == "WEATHER" and weather_analysis.get("has_data"):
        reply = build_weather_reply(weather_analysis)
        return ChatResponse(
            reply=reply,
            intent=intent,
            data=data,
        )

    prompt = build_ai_prompt(
        intent=intent,
        user_message=user_message,
        user_context=user_context,
        data_note=data_notes.get(intent, data_notes["GENERAL"]),
    )

    try:
        reply = await generate_gemini_response(prompt, request.history)
    except Exception as provider_error:
        logger.warning("Chat provider failed, using fallback reply: %s", provider_error)
        reply = ""

    if not reply:
        reply = build_fallback_reply(intent, user_message, user_context)

    reply = clean_reply(reply, user_message)

    return ChatResponse(
        reply=reply,
        intent=intent,
        data=data,
    )

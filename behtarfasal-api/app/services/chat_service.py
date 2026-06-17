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

    data: Dict[str, Any] = {}

    data_notes = {
        "GENERAL": "Give a direct, useful answer to the farmer's question.",
        "WEATHER": "No live weather API data is attached. Do not claim a live forecast, but give practical weather-based farming guidance.",
        "IRRIGATION": "No live moisture sensor data is attached. Give practical irrigation timing, field checks, and precautions.",
        "CROP": "If exact soil/weather values are missing, still suggest practical crop-selection criteria and likely options for Pakistan.",
        "FERTILIZER": "If exact NPK or soil values are missing, still give a safe general fertilizer approach and explain what data would improve the dose.",
        "DISEASE": "No image is attached. Still explain likely causes from the described symptoms, safe immediate steps, and when a photo/lab check is needed.",
    }

    if intent == "WEATHER":
        data = {"weather_data_available": False}
    elif intent == "CROP":
        data = {"required_fields": ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"]}
    elif intent == "FERTILIZER":
        data = {"required_fields": ["soil_type", "crop_type", "moisture", "temperature", "humidity", "nitrogen", "phosphorus", "potassium"]}
    elif intent == "DISEASE":
        data = {"image_required": True}

    prompt = build_ai_prompt(
        intent=intent,
        user_message=user_message,
        user_context=user_context,
        data_note=data_notes.get(intent, data_notes["GENERAL"]),
    )
    reply = await generate_gemini_response(prompt, request.history)

    if not reply:
        reply = build_fallback_reply(intent, user_message, user_context)

    reply = clean_reply(reply, user_message)

    return ChatResponse(
        reply=reply,
        intent=intent,
        data=data,
    )

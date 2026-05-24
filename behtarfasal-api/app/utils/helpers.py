from typing import List


def convert_nutrient_level(level: str) -> int:
    """Convert user-friendly nutrient levels to realistic kg/ha values."""
    mapping = {
        "low": 20,
        "medium": 70,
        "high": 120,
    }

    normalized = level.strip().lower()
    if normalized not in mapping:
        raise ValueError("Invalid nutrient level. Use Low, Medium, or High.")
    return mapping[normalized]


def get_planting_time(crop_name: str) -> str:
    """Return crop-specific planting window for Pakistan."""
    planting_times = {
        "rice": "June to July (Kharif season)",
        "maize": "March to April or July to August",
        "chickpea": "October to November (Rabi season)",
        "kidneybeans": "February to March",
        "pigeonpeas": "June to July (Kharif season)",
        "mothbeans": "June to July (Kharif season)",
        "mungbean": "March to April or June to July",
        "blackgram": "June to July (Kharif season)",
        "lentil": "October to November (Rabi season)",
        "pomegranate": "February to March",
        "banana": "February to May",
        "mango": "July to August (monsoon planting)",
        "grapes": "December to January (dormant season)",
        "watermelon": "February to March",
        "muskmelon": "February to March",
        "apple": "December to January (dormant season)",
        "orange": "July to August",
        "papaya": "February to March or June to July",
        "coconut": "June to September (monsoon season)",
        "cotton": "April to May (Kharif season)",
        "jute": "March to May",
        "coffee": "June to July",
    }
    return planting_times.get(crop_name, "Consult local agriculture department")


def get_expected_yield(crop_name: str) -> str:
    """Return expected per-acre crop yield under typical conditions."""
    yields = {
        "rice": "30-40 maunds per acre",
        "maize": "40-60 maunds per acre",
        "chickpea": "10-15 maunds per acre",
        "kidneybeans": "8-12 maunds per acre",
        "pigeonpeas": "8-12 maunds per acre",
        "mothbeans": "6-10 maunds per acre",
        "mungbean": "6-10 maunds per acre",
        "blackgram": "6-10 maunds per acre",
        "lentil": "10-14 maunds per acre",
        "pomegranate": "100-150 kg per tree per year",
        "banana": "250-350 bunches per acre",
        "mango": "200-400 kg per tree per year",
        "grapes": "4-6 tons per acre",
        "watermelon": "150-200 maunds per acre",
        "muskmelon": "100-150 maunds per acre",
        "apple": "10-15 tons per acre",
        "orange": "150-200 fruits per tree",
        "papaya": "200-400 fruits per plant per year",
        "coconut": "50-80 nuts per tree per year",
        "cotton": "25-35 maunds per acre",
        "jute": "20-30 maunds per acre",
        "coffee": "5-8 maunds per acre",
    }
    return yields.get(crop_name, "10-30 maunds per acre (varies by conditions)")


def build_reason(
    crop_name: str,
    n: int,
    p: int,
    k: int,
    ph: float,
    temp: float,
    humidity: float,
    rainfall: float,
) -> str:
    """Generate a concise, human-readable reason for the recommendation."""
    crop = crop_name.capitalize()
    factors: List[str] = []

    if n >= 100:
        factors.append(f"high nitrogen ({n} kg/ha)")
    elif n <= 35:
        factors.append(f"low nitrogen ({n} kg/ha)")

    if p >= 90:
        factors.append(f"strong phosphorus level ({p} kg/ha)")
    elif p <= 30:
        factors.append(f"low phosphorus ({p} kg/ha)")

    if k >= 120:
        factors.append(f"high potassium ({k} kg/ha)")

    if temp >= 32:
        factors.append(f"warm temperature ({temp:.1f}C)")
    elif temp <= 18:
        factors.append(f"cool temperature ({temp:.1f}C)")

    if humidity >= 80:
        factors.append(f"high humidity ({humidity:.0f}%)")
    elif humidity <= 35:
        factors.append(f"low humidity ({humidity:.0f}%)")

    if rainfall >= 180:
        factors.append(f"good rainfall ({rainfall:.0f}mm)")
    elif rainfall <= 80:
        factors.append(f"low rainfall ({rainfall:.0f}mm)")

    if 6.0 <= ph <= 7.2:
        factors.append(f"balanced soil pH ({ph:.1f})")
    elif ph < 6.0:
        factors.append(f"slightly acidic pH ({ph:.1f})")
    else:
        factors.append(f"slightly alkaline pH ({ph:.1f})")

    climate_note = ""
    if crop_name in {"rice", "jute"} and humidity >= 70 and rainfall >= 140:
        climate_note = " This humidity and moisture profile strongly supports water-loving crops."
    elif crop_name in {"cotton", "mothbeans", "pigeonpeas"} and rainfall <= 120 and temp >= 28:
        climate_note = " The warmer and relatively drier profile supports drought-tolerant crop behavior."
    elif crop_name in {"apple", "lentil", "chickpea"} and temp <= 22:
        climate_note = " Cooler conditions align well with this crop's growth pattern."

    primary_factors = ", ".join(factors[:3])
    return (
        f"{crop} is recommended because your farm conditions show {primary_factors}, "
        f"which are suitable for this crop in Pakistan.{climate_note}"
    )

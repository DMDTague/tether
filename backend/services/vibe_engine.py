"""
Vibe Engine — Tether

Mathematically-driven vibe system that replaces manual genre selection.

Converts Spotify Audio Features into:
1. A normalized 4D vibe vector [valence, energy, danceability, acousticness]
2. An HSL-derived color palette (3-4 hex colors)
3. Skia shader uniforms for Perlin noise animation
4. Cosine similarity scores between user vectors

All color math uses HSL for perceptually meaningful mapping:
- Valence  → hue warmth (cool blues ↔ warm oranges)
- Energy   → saturation (muted ↔ vivid)
- Acousticness → lightness depth (bright ↔ deep/dark)
- Danceability → hue spread (monochromatic ↔ wide gradient)
"""

import math
import colorsys
from typing import Optional


# ── Vector Extraction ─────────────────────────────────────────

FEATURE_KEYS = ["valence", "energy", "danceability", "acousticness"]


def audio_features_to_vector(features: dict) -> list[float]:
    """
    Extract a normalized 4D vibe vector from Spotify audio features.
    
    Returns [valence, energy, danceability, acousticness], each clamped to [0, 1].
    Falls back to 0.5 for any missing key.
    """
    return [
        max(0.0, min(1.0, float(features.get(key, 0.5))))
        for key in FEATURE_KEYS
    ]


def aggregate_vectors(vectors: list[list[float]]) -> list[float]:
    """
    Compute the element-wise mean of multiple vibe vectors.
    
    Used to create a stable vibe signature from recent listening history
    rather than a single track's features.
    """
    if not vectors:
        return [0.5, 0.5, 0.5, 0.5]
    n = len(vectors)
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / n for i in range(dim)]


# ── Color Palette Generation ─────────────────────────────────

def _hsl_to_hex(h: float, s: float, l: float) -> str:
    """Convert HSL (all 0-1) to hex string."""
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"


def vector_to_color_palette(vector: list[float]) -> list[str]:
    """
    Map a 4D vibe vector to a 4-color hex palette using HSL math.
    
    Mapping:
    - Valence  → base hue (0.6=cool blue → 0.08=warm orange)
    - Energy   → saturation (0.2 muted → 0.85 vivid)
    - Acousticness → lightness (0.25 deep → 0.55 bright, inverted)
    - Danceability → hue spread (±0.03 tight → ±0.15 wide)
    """
    valence, energy, danceability, acousticness = vector

    # Base hue: low valence → cool (blue ~0.6), high → warm (orange ~0.08)
    base_hue = 0.6 - (valence * 0.52)
    if base_hue < 0:
        base_hue += 1.0

    # Saturation: energy drives vividness
    saturation = 0.2 + (energy * 0.65)

    # Lightness: high acousticness → deeper/darker tones
    lightness = 0.55 - (acousticness * 0.30)

    # Hue spread: danceability widens the gradient range
    spread = 0.03 + (danceability * 0.12)

    # Generate 4 colors with hue offsets
    offsets = [-spread * 1.2, -spread * 0.3, spread * 0.5, spread * 1.5]
    palette = []
    for offset in offsets:
        h = (base_hue + offset) % 1.0
        # Slight lightness variation per stop
        l_var = lightness + (offset * 0.4)
        l_var = max(0.12, min(0.65, l_var))
        # Slight saturation variation
        s_var = max(0.15, min(0.95, saturation + (offset * 0.3)))
        palette.append(_hsl_to_hex(h, s_var, l_var))

    return palette


# ── Shader Parameter Generation ──────────────────────────────

def vector_to_shader_params(vector: list[float]) -> dict:
    """
    Map a vibe vector to Skia shader uniforms for Perlin noise animation.
    
    Returns:
    - amplitude: Perlin noise displacement intensity (from Energy)
    - frequency: Noise spatial density (from Danceability)
    - speed: Animation time multiplier (from Energy × 1.5)
    - warmth: RGB warmth bias 0=cool 1=warm (from Valence)
    """
    valence, energy, danceability, acousticness = vector

    return {
        "amplitude": 0.3 + (energy * 1.2),          # 0.3 – 1.5
        "frequency": 1.0 + (danceability * 3.0),     # 1.0 – 4.0
        "speed": 0.2 + (energy * 1.3),               # 0.2 – 1.5
        "warmth": valence,                            # 0.0 – 1.0
    }


# ── Cosine Similarity ────────────────────────────────────────

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    
    Returns a value between 0 and 1:
    - 1.0 = identical vibe
    - 0.0 = completely different
    
    Formula: cos(θ) = (A·B) / (‖A‖ × ‖B‖)
    """
    if len(vec_a) != len(vec_b) or not vec_a:
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    magnitude_a = math.sqrt(sum(a * a for a in vec_a))
    magnitude_b = math.sqrt(sum(b * b for b in vec_b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    similarity = dot_product / (magnitude_a * magnitude_b)
    # Clamp to [0, 1] — cosine similarity can be negative for opposing vectors
    return max(0.0, min(1.0, similarity))


# ── Legacy Compatibility ─────────────────────────────────────

# Keep the old genre-based lookup for backward compat during migration
VIBE_MAP = {
    "edm": {"style": "aura", "speed": 1.0},
    "lofi": {"style": "waves", "speed": 0.3},
    "pop": {"style": "mesh", "speed": 0.8},
    "rock": {"style": "mesh", "speed": 1.2},
    "chill": {"style": "mesh", "speed": 0.5},
}


def get_vibe_params(primary_vibe: str) -> tuple[str, float]:
    """Return (skia_style, skia_speed) for a given vibe. Defaults to chill."""
    vibe = primary_vibe.lower()
    config = VIBE_MAP.get(vibe, VIBE_MAP["chill"])
    return config["style"], config["speed"]

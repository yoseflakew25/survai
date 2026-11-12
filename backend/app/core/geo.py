"""Lightweight geo helpers for admin presence (ISO country codes + centroids)."""

from __future__ import annotations

import re

# ISO 3166-1 alpha-2 → (name, lat, lng, numeric). Numeric matches world-atlas ids.
COUNTRY_META: dict[str, tuple[str, float, float, int]] = {
    "AE": ("United Arab Emirates", 23.42, 53.85, 784),
    "AR": ("Argentina", -38.42, -63.62, 32),
    "AT": ("Austria", 47.52, 14.55, 40),
    "AU": ("Australia", -25.27, 133.78, 36),
    "BE": ("Belgium", 50.50, 4.47, 56),
    "BG": ("Bulgaria", 42.73, 25.49, 100),
    "BR": ("Brazil", -14.24, -51.93, 76),
    "CA": ("Canada", 56.13, -106.35, 124),
    "CH": ("Switzerland", 46.82, 8.23, 756),
    "CL": ("Chile", -35.68, -71.54, 152),
    "CN": ("China", 35.86, 104.20, 156),
    "CO": ("Colombia", 4.57, -74.30, 170),
    "CZ": ("Czechia", 49.82, 15.47, 203),
    "DE": ("Germany", 51.17, 10.45, 276),
    "DK": ("Denmark", 56.26, 9.50, 208),
    "EG": ("Egypt", 26.82, 30.80, 818),
    "ES": ("Spain", 40.46, -3.75, 724),
    "ET": ("Ethiopia", 9.15, 40.49, 231),
    "FI": ("Finland", 61.92, 25.75, 246),
    "FR": ("France", 46.23, 2.21, 250),
    "GB": ("United Kingdom", 55.38, -3.44, 826),
    "GH": ("Ghana", 7.95, -1.02, 288),
    "GR": ("Greece", 39.07, 21.82, 300),
    "HK": ("Hong Kong", 22.40, 114.11, 344),
    "HU": ("Hungary", 47.16, 19.50, 348),
    "ID": ("Indonesia", -0.79, 113.92, 360),
    "IE": ("Ireland", 53.14, -7.69, 372),
    "IL": ("Israel", 31.05, 34.85, 376),
    "IN": ("India", 20.59, 78.96, 356),
    "IT": ("Italy", 41.87, 12.57, 380),
    "JP": ("Japan", 36.20, 138.25, 392),
    "KE": ("Kenya", -0.02, 37.91, 404),
    "KR": ("South Korea", 35.91, 127.77, 410),
    "MX": ("Mexico", 23.63, -102.55, 484),
    "MY": ("Malaysia", 4.21, 101.98, 458),
    "NG": ("Nigeria", 9.08, 8.68, 566),
    "NL": ("Netherlands", 52.13, 5.29, 528),
    "NO": ("Norway", 60.47, 8.47, 578),
    "NZ": ("New Zealand", -40.90, 174.89, 554),
    "PE": ("Peru", -9.19, -75.02, 604),
    "PH": ("Philippines", 12.88, 121.77, 608),
    "PK": ("Pakistan", 30.38, 69.35, 586),
    "PL": ("Poland", 51.92, 19.15, 616),
    "PT": ("Portugal", 39.40, -8.22, 620),
    "RO": ("Romania", 45.94, 24.97, 642),
    "RU": ("Russia", 61.52, 105.32, 643),
    "RW": ("Rwanda", -1.94, 29.87, 646),
    "SA": ("Saudi Arabia", 23.89, 45.08, 682),
    "SE": ("Sweden", 60.13, 18.64, 752),
    "SG": ("Singapore", 1.35, 103.82, 702),
    "TH": ("Thailand", 15.87, 100.99, 764),
    "TR": ("Türkiye", 38.96, 35.24, 792),
    "TZ": ("Tanzania", -6.37, 34.89, 834),
    "UA": ("Ukraine", 48.38, 31.17, 804),
    "UG": ("Uganda", 1.37, 32.29, 800),
    "US": ("United States", 37.09, -95.71, 840),
    "VN": ("Vietnam", 14.06, 108.28, 704),
    "ZA": ("South Africa", -30.56, 22.94, 710),
}

_ISO2_RE = re.compile(r"^[A-Za-z]{2}$")
_SKIP = frozenset({"XX", "T1", "A1", "A2", "O1"})


def normalize_country_code(raw: str | None) -> str | None:
    if not raw:
        return None
    code = raw.strip().upper()
    if code in _SKIP or not _ISO2_RE.match(code):
        return None
    return code


def country_label(code: str) -> str:
    meta = COUNTRY_META.get(code.upper())
    return meta[0] if meta else code.upper()


def country_centroid(code: str) -> tuple[float, float] | None:
    meta = COUNTRY_META.get(code.upper())
    if not meta:
        return None
    return meta[1], meta[2]


def country_numeric_id(code: str) -> int | None:
    meta = COUNTRY_META.get(code.upper())
    if not meta:
        return None
    return meta[3]


def extract_country_from_headers(headers: dict[str, str]) -> str | None:
    """Prefer edge-provided country headers (Cloudflare / Vercel / CloudFront)."""
    lowered = {k.lower(): v for k, v in headers.items()}
    for key in (
        "cf-ipcountry",
        "x-vercel-ip-country",
        "cloudfront-viewer-country",
        "x-geo-country",  # local/dev override
        "x-appengine-country",
    ):
        found = normalize_country_code(lowered.get(key))
        if found:
            return found
    return None

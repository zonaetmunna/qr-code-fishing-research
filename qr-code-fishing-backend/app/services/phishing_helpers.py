"""Pure helpers for URL phishing heuristics (testable, no I/O)."""

from __future__ import annotations

import re
from urllib.parse import ParseResult, urlparse

# Tunable caps
MAX_INDICATORS_DISPLAY = 12
MAX_URL_CHARS = 8192

_SUSPICIOUS_TLDS = frozenset(
    {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "work", "click", "link", "buzz", "icu"}
)
_TRUSTED_HOST_SUFFIXES = (
    "google.com",
    "microsoft.com",
    "github.com",
    "wikipedia.org",
    "apple.com",
    "mozilla.org",
)
_SHORTENER_HOSTS = frozenset(
    {
        "bit.ly",
        "tinyurl.com",
        "t.co",
        "goo.gl",
        "ow.ly",
        "buff.ly",
        "is.gd",
    }
)
_PATH_KEYWORDS = (
    "confirm",
    "password",
    "secure",
    "signin",
    "update",
    "verify",
    "wallet",
)

def is_local_host(hostname: str) -> bool:
    """Check if the hostname is a local or loopback address."""
    if hostname in ("localhost", "127.0.0.1", "::1"):
        return True
    # Basic check for private IP ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if re.match(r"^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)", hostname):
        return True
    return False


def clip_indicators(items: list[str], limit: int = MAX_INDICATORS_DISPLAY) -> list[str]:
    """Keep the list readable for API clients."""
    if len(items) <= limit:
        return items
    return items[:limit] + [f"… and {len(items) - limit} more signal(s) not listed."]


def parse_url_loose(raw: str) -> ParseResult | None:
    """Parse URL string; prepend http:// if scheme is missing."""
    text = raw.strip()
    if "://" not in text:
        text = "http://" + text
    try:
        return urlparse(text)
    except ValueError:
        return None


def score_userinfo(raw_without_scheme: str) -> tuple[int, list[str]]:
    """Detect @ patterns used in phishing (credential confusion)."""
    if "@" in raw_without_scheme:
        return (
            45,
            ["Userinfo or '@' pattern in URL (common credential-phishing trick)."],
        )
    return 0, []


def score_scheme(scheme: str) -> tuple[int, list[str]]:
    if scheme == "http":
        return 12, ["Uses HTTP instead of HTTPS (no transport encryption)."]
    if scheme not in ("http", "https"):
        return 15, [f"Uncommon scheme '{scheme}' — verify before trusting."]
    return 0, []


def score_ip_host(hostname: str) -> tuple[int, list[str]]:
    if is_local_host(hostname):
        return 0, []
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", hostname):
        return 25, ["Host is a raw IP address instead of a domain name."]
    return 0, []


def score_tld(parts: list[str]) -> tuple[int, list[str]]:
    if len(parts) < 2:
        return 0, []
    tld = parts[-1]
    if tld in _SUSPICIOUS_TLDS:
        return 22, [f"TLD '.{tld}' is frequently abused in phishing campaigns."]
    return 0, []


def score_subdomain_depth(parts: list[str]) -> tuple[int, list[str]]:
    depth = len(parts) - 2 if len(parts) > 2 else 0
    if depth >= 3:
        return 10, ["Unusually deep subdomain chain may hide the real destination."]
    return 0, []


def trusted_relief(host: str) -> tuple[int, list[str]]:
    """Reduce risk when host matches a known-good suffix (heuristic only)."""
    if any(host == s or host.endswith("." + s) for s in _TRUSTED_HOST_SUFFIXES):
        return -30, ["Host matches a common trusted domain (heuristic relief)."]
    return 0, []


def score_punycode(hostname: str) -> tuple[int, list[str]]:
    if "xn--" in hostname:
        return 12, ["Internationalized domain (punycode) — inspect the real hostname carefully."]
    return 0, []


def score_shortener(hostname: str) -> tuple[int, list[str]]:
    if hostname in _SHORTENER_HOSTS or hostname.endswith(".bit.ly"):
        return 20, ["Short link / redirect host — final destination is hidden until resolved."]
    return 0, []


def score_nonstandard_port(parsed: ParseResult) -> tuple[int, list[str]]:
    port = parsed.port
    if port is None:
        return 0, []
    if port in (80, 443):
        return 0, []
    # Allow common development ports to avoid false positives during testing
    if port in (3000, 5173, 8000, 8080):
        return 0, []
    return 8, [f"Non-standard port {port} — often used in imposter or test pages."]


def score_path_keywords(path: str) -> tuple[int, list[str]]:
    lower = path.lower()
    hits: list[str] = []
    score = 0
    for kw in _PATH_KEYWORDS:
        if kw in lower:
            hits.append(kw)
            score += 6
    score = min(score, 18)
    if not hits:
        return 0, []
    return score, [
        f"Path contains sensitive keywords ({', '.join(sorted(set(hits))[:5])}) — common in phishing lures."
    ]


def score_url_length(url: str) -> tuple[int, list[str]]:
    if len(url) > 200:
        return 5, ["Very long URL — may be used to hide the true destination."]
    return 0, []

from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "movie_tracker")
TMDB_READ_ACCESS_TOKEN = os.getenv("TMDB_READ_ACCESS_TOKEN", "")
USER_AGENT = os.getenv("USER_AGENT", "GlobalMovieTrackerBot/0.1")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20"))
DEFAULT_POLL_SECONDS = int(os.getenv("DEFAULT_POLL_SECONDS", "900"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "4"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
REGISTRY_PATH = ROOT / "source_registry.json"

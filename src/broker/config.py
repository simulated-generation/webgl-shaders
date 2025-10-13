# broker/config.py
import os
import re

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
VERBOSE = os.getenv("VERBOSE", "false").lower() in ("1", "true", "yes")
LOG_DIR = os.getenv("LOG_DIR", "/logs")
# allow alpha-num, dash, underscore up to 64 OR UUID 8-4-4-4-12 (hex and dashes)
ALLOWED_ID_PATTERN = os.getenv(
    "ALLOWED_ID_PATTERN",
    r"^[a-zA-Z0-9_-]{1,64}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
)
ID_RE = re.compile(ALLOWED_ID_PATTERN)


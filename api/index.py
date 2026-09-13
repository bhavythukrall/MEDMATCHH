# Vercel entrypoint for the MedMatch FastAPI backend.
# The existing backend uses imports such as `from database import ...`,
# so add the backend directory to Python's import path before loading it.
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from server import app

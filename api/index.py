import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable in Vercel Serverless
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from app.main import app  # type: ignore[import-not-found]
except ImportError:
    from backend.app.main import app  # type: ignore[import-not-found]


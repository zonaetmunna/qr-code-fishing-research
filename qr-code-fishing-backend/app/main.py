"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers.scan import router as scan_router
from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.db.session import init_db
from app.services.ml_service import load_model

_settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup: logging, database tables."""
    configure_logging(debug=_settings.debug)
    init_db()
    load_model()
    yield


app = FastAPI(title=_settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan_router)

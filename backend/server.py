"""Main FastAPI application: MedMatch rural healthcare platform."""
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import engine, Base
from routes import auth as auth_routes
from routes import hospitals as hospital_routes
from routes import patients as patient_routes
from routes import matching as matching_routes
from routes import referrals as referral_routes
from routes import ambulances as ambulance_routes
from routes import uploads as upload_routes
from routes import doctors as doctor_routes
from routes import sos as sos_routes
from seed import seed_data
from storage import init_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sanjeevani")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col in ("relationship VARCHAR DEFAULT ''", "medical_history TEXT DEFAULT ''", "allergies TEXT DEFAULT ''"):
            await conn.exec_driver_sql(f"ALTER TABLE patients ADD COLUMN IF NOT EXISTS {col}")
    logger.info("PostgreSQL tables ready")

    # Seed initial data (admin, sample hospitals, ambulances)
    await seed_data()
    logger.info("Seed complete")

    # Init object storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (uploads will be disabled): {e}")

    yield
    await engine.dispose()


app = FastAPI(title="MedMatch API", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "MedMatch", "status": "ok"}


api_router.include_router(auth_routes.router)
api_router.include_router(hospital_routes.router)
api_router.include_router(patient_routes.router)
api_router.include_router(matching_routes.router)
api_router.include_router(referral_routes.router)
api_router.include_router(ambulance_routes.router)
api_router.include_router(upload_routes.router)
api_router.include_router(doctor_routes.router)
api_router.include_router(sos_routes.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

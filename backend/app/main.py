import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db_manager
from app.routers import health, data, clean, ai, recipes, history, auth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cleansheet.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: test MongoDB Atlas connection
    logger.info("Starting CleanSheet AI backend services...")
    db_connected = db_manager.connect()
    if db_connected:
        logger.info(f"MongoDB Atlas: Connected and verified. (Database: {settings.MONGODB_DB_NAME})")
    else:
        logger.warning(
            f"MongoDB Atlas: Offline or unconfigured ({db_manager.error_message}). "
            "CleanSheet AI is running in resilient in-memory local fallback mode."
        )
    yield
    # Shutdown: clean up client
    if db_manager.client:
        logger.info("Closing MongoDB client...")
        db_manager.client.close()

app = FastAPI(
    title="CleanSheet AI API",
    description="Intelligent spreadsheet cleaning and transformation engine powered by Pandas and Gemini AI.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration allowing local Vite development and general API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health.router)
app.include_router(data.router)
app.include_router(clean.router)
app.include_router(ai.router)
app.include_router(recipes.router)
app.include_router(history.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {
        "app": "CleanSheet AI API",
        "status": "operational",
        "docs_url": "/docs",
        "database": db_manager.get_status()["mode"]
    }

from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # MongoDB Atlas
    MONGODB_URI: Optional[str] = None
    MONGODB_DB_NAME: str = "cleansheet_ai"
    
    # Google Gemini
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Security
    JWT_SECRET: str = "dev_secret_key_cleansheet_ai_2026_super_secure_random_string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Storage & Limits
    MAX_FILE_SIZE_BYTES: int = 26214400 # 25 MB
    TEMP_STORAGE_TTL_SECONDS: int = 7200 # 2 hours
    
    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

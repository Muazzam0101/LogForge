from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

    PROJECT_NAME: str = "LogForge ULPF Core Engine"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Ingestion Constraints
    MAX_LOG_SIZE_BYTES: int = 1_048_576  # 1MB limit for individual raw log line
    MAX_BATCH_SIZE: int = 500             # Max logs allowed per batch request

    # Database Configuration (MySQL 8.0 default, with PostgreSQL/SQLite support)
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/logforge"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]


settings = Settings()

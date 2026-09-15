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

    # Blockchain Anchoring Configuration
    BLOCKCHAIN_ENABLED: bool = False
    BLOCKCHAIN_RPC_URL: str = "http://127.0.0.1:8545"
    BLOCKCHAIN_CONTRACT_ADDRESS: str = ""
    BLOCKCHAIN_PRIVATE_KEY: str = ""
    BLOCKCHAIN_NETWORK: str = "local-evm"

    # OpenSearch Scalability & Search Layer Configuration
    OPENSEARCH_ENABLED: bool = False
    OPENSEARCH_URL: str = "http://localhost:9200"
    OPENSEARCH_INDEX: str = "logforge-events"
    OPENSEARCH_BULK_SIZE: int = 500
    OPENSEARCH_TIMEOUT: int = 10
    OPENSEARCH_MAX_RETRIES: int = 3
    OPENSEARCH_AUTH_USER: str | None = None
    OPENSEARCH_AUTH_PASSWORD: str | None = None
    OPENSEARCH_USE_SSL: bool = False
    OPENSEARCH_VERIFY_CERTS: bool = False

    # Apache Kafka Streaming Architecture Configuration
    KAFKA_ENABLED: bool = False
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_LOG_TOPIC: str = "logforge.raw-events"
    KAFKA_DLQ_TOPIC: str = "logforge.dead-letter"
    KAFKA_CONSUMER_GROUP: str = "logforge-ulpf-workers"
    KAFKA_BATCH_SIZE: int = 100
    KAFKA_NUM_PARTITIONS: int = 3
    KAFKA_REPLICATION_FACTOR: int = 1
    KAFKA_MAX_RETRIES: int = 3
    KAFKA_RETRY_BACKOFF_MS: int = 1000
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_CLIENT_ID: str = "logforge-producer"

    # Authentication, Session & Security Configuration
    JWT_SECRET_KEY: str = "logforge-super-secret-key-for-jwt-sih-2026-ntro-secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AUTH_COOKIE_NAME: str = "logforge_access_token"
    AUTH_REFRESH_COOKIE_NAME: str = "logforge_refresh_token"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    DEFAULT_ADMIN_EMAIL: str = "admin@logforge.security"
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_FULL_NAME: str = "System Administrator"


settings = Settings()



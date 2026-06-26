"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the API and database."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "QR Phishing Detection API"
    debug: bool = False
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins",
    )
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/qr_phishing",
        description="SQLAlchemy database URL (env: DATABASE_URL)",
    )
    max_upload_bytes: int = Field(
        default=5 * 1024 * 1024,
        ge=1,
        description="Maximum uploaded image size in bytes",
    )
    use_reputation_safety_net: bool = Field(
        default=False,
        description=(
            "When True, a static trusted-domain / restricted-TLD allowlist can override the "
            "ML verdict to SAFE (false-positive guard for deployment). Default False = the "
            "ML model alone decides every verdict (ML-based detection)."
        ),
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def strip_cors(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    def cors_origin_list(self) -> list[str]:
        """Return CORS origins as a list."""
        if not self.cors_origins:
            return []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()

from pydantic_settings import BaseSettings
from pydantic import AnyUrl, field_validator
from typing import List


class Settings(BaseSettings):
    # ─── App ────────────────────────────────────────────────
    APP_NAME: str = "PaySure"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str

    # ─── JWT ────────────────────────────────────────────────
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ─── Database ───────────────────────────────────────────
    DATABASE_URL: str

    # ─── Clerk ──────────────────────────────────────────────
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""

    # ─── Razorpay ───────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # ─── CORS ───────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        # Splits the comma-separated ALLOWED_ORIGINS string into a Python list
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",  # Ignores any extra vars in .env that aren't defined here
    }

# Single shared instance — import this everywhere in the app
settings = Settings()
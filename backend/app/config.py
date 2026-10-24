from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://arthasathi:arthasathi@localhost:5432/arthasathi"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    token_minutes: int = 720
    # Agent LLM: Gemini is used if GOOGLE_API_KEY is set, else Claude if ANTHROPIC_API_KEY is set,
    # else the deterministic offline advisor answers (still uses the same tools).
    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    anthropic_api_key: str = ""
    agent_model: str = "claude-sonnet-4-6"
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()

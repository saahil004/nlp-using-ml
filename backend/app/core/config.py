from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:5174", "http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
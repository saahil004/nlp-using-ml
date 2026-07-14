from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: list[str] = ["https://nlp-using-ml.vercel.app"]

    class Config:
        env_file = ".env"

settings = Settings()
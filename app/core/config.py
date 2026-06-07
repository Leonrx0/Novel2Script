from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "NovelToScript"
    VERSION: str = "0.1.0"
    
    DATABASE_URL: str = "postgresql+psycopg://leon:123456@localhost:5432/noveltoscript"
    
    QWEN_API_KEY: str = "xxxx"
    QWEN_API_BASE: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    QWEN_MODEL: str = "qwen-vl-max"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

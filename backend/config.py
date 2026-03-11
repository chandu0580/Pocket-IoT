import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key_123")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_key_123")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///iot_data.db")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
    
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://pocketiot.vercel.app,http://localhost:5173").split(",")

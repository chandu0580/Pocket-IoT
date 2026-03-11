import os
import json
import logging
from concurrent.futures import ThreadPoolExecutor

# Use a thread pool for background tasks on Windows
executor = ThreadPoolExecutor(max_workers=4)

# Connect to Redis for caching only
try:
    from redis import Redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_conn = Redis.from_url(redis_url, decode_responses=True)
    redis_conn.ping()
    USE_REDIS = True
    logging.info("✅ Redis connected successfully.")
except Exception as e:
    logging.warning(f"⚠️ Redis unavailable (caching disabled): {e}")
    redis_conn = None
    USE_REDIS = False
    
def async_task(func):
    """Decorator to run a function in the background using ThreadPoolExecutor."""
    def wrapper(*args, **kwargs):
        # Always use the executor so we do not block the main request thread
        return executor.submit(func, *args, **kwargs)
    return wrapper

def start_worker():
    """Dummy start worker for Windows since RQ is not supported."""
    logging.info("RQ is not supported on Windows. Using ThreadPoolExecutor in the main process instead.")


import os
import json
import logging
from redis import Redis
from concurrent.futures import ThreadPoolExecutor

# Use a thread pool for background tasks on Windows
executor = ThreadPoolExecutor(max_workers=4)

# Connect to Redis for caching only
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    redis_conn = Redis.from_url(redis_url)
    # Ping to check if Redis is actually up
    redis_conn.ping()
    USE_REDIS = True
except Exception as e:
    logging.warning(f"Could not connect to Redis: {e}")
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


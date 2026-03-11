import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.app import create_app
from backend.models import delete_device
from backend.db import get_db_connection

app = create_app()
with app.app_context():
    try:
        with get_db_connection(app.config['DATABASE_PATH']) as c:
            delete_device(c, 9)
            print("Delete successful")
    except Exception as e:
        import traceback
        traceback.print_exc()

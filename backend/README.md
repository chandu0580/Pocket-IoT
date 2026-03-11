## Backend - cy-023-iot-monitoring

This is the Flask backend for the IoT Device Monitoring System. It exposes REST APIs for devices, sensor data, and alerts, and uses SQLite for persistence.

### Requirements

- Python 3.10+
- Windows/macOS/Linux

### Setup (Local, without Docker)

1. Create and activate a virtual environment (Windows PowerShell example):

```powershell
cd cy-023-iot-monitoring\backend
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Configure environment:

```powershell
copy .env.example .env
```

You can adjust values in `.env` as needed (for example, `ALERT_ACCEL_THRESHOLD`).

4. Run the development server:

```powershell
python app.py
```

The API will listen on `http://127.0.0.1:5000`.

The SQLite database (`iot_data.db` by default) will be created automatically if it does not exist, and seeded with three devices:

- `device_1` / `device_1_token`
- `device_2` / `device_2_token`
- `device_3` / `device_3_token`

### Key API Endpoints

- `GET /api/health` – health check
- `GET /api/devices` – list devices
- `GET /api/sensor-data` – latest sensor data (query params: `limit`, `device_id`)
- `GET /api/alerts` – latest alerts (query param: `limit`)
- `POST /api/send-data` – ingest sensor data with bearer token authentication

All errors are returned as JSON objects with an `error` field. Missing or invalid input will result in `4xx` responses; unexpected issues are logged and returned as `500` responses.


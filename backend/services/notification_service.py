"""Notification service for email, webhooks, and SSE broadcasts."""
import os
import smtplib
import json
import requests
import logging
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional, Dict, Any

# Adjust path to import from parent
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from db import get_db_connection, get_placeholder
from sse import broadcaster

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from services.task_worker import async_task

class NotificationService:
    @staticmethod
    def create_notification(
        organization_id: int,
        device_id: Optional[int] = None,
        alert_id: Optional[int] = None,
        notif_type: str = "general",
        message: str = "",
        status: str = "unsent",
        db_path: str = "backend/pocketiot.db"
    ) -> int:
        """Create a notification record in the database."""
        try:
            with get_db_connection(db_path) as conn:
                c = conn.cursor()
                p = get_placeholder(conn)
                now = datetime.utcnow().isoformat()
                c.execute(
                    f"INSERT INTO notifications (organization_id, device_id, alert_id, type, message, status, created_at) "
                    f"VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p})",
                    (organization_id, device_id, alert_id, notif_type, message, status, now)
                )
                conn.commit()
                # Return the last inserted ID
                if p == "?":
                    return c.lastrowid
                else:
                    c.execute("SELECT LASTVAL()")
                    row = c.fetchone()
                    return (list(row.values())[0] if isinstance(row, dict) else row[0]) if row else -1
        except Exception:
            logger.exception("Failed to create notification record")
            return -1

    @staticmethod
    @async_task
    def send_email_notification(email_to: str, subject: str, body: str):
        """Send an email using SMTP."""
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")

        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials are not configured")
            return False

        try:
            msg = MIMEText(body)
            msg['Subject'] = subject or "Alert"
            msg['From'] = str(smtp_user)
            msg['To'] = str(email_to)

            with smtplib.SMTP(str(smtp_host), smtp_port) as server:
                server.starttls()
                server.login(str(smtp_user), str(smtp_password))
                server.send_message(msg)
            
            logger.info("Email notification sent to %s", email_to)
            return True
        except Exception:
            logger.exception("Failed to send email notification")
            return False

    @staticmethod
    @async_task
    def send_webhook_notification(webhook_url: str, payload: Dict[str, Any]):
        """Send a JSON payload to a webhook endpoint via POST."""
        try:
            response = requests.post(webhook_url, json=payload, timeout=5)
            response.raise_for_status()
            logger.info("Webhook notification sent to %s", webhook_url)
            return True
        except Exception:
            logger.exception("Failed to send webhook notification to %s", webhook_url)
            return False

    @staticmethod
    def broadcast_notification_event(organization_id: int, device_id: int, message: str, device_name: str = "Unknown"):
        """Broadcast a notification event via SSE."""
        payload = {
            "type": "notification",
            "organization_id": organization_id,
            "device_id": device_id,
            "device_name": device_name,
            "message": message,
            "created_at": datetime.utcnow().isoformat()
        }
        broadcaster.broadcast("notification", payload)
        logger.info("SSE Notification broadcasted for org %s", organization_id)

def trigger_alert_notifications(
    organization_id: int,
    device_id: int,
    device_name: str,
    alert_id: int,
    message: str,
    severity: str = "warning",
    org_email: Optional[str] = None,
    org_webhook: Optional[str] = None
):
    """Orchestrate all notification channels when an alert is triggered."""
    # 1. Store record (status = sent after all channels)
    notif_id = NotificationService.create_notification(
        organization_id=organization_id,
        device_id=device_id,
        alert_id=alert_id,
        notif_type=severity,
        message=message,
        status="sent"
    )

    # 2. Email (if configured)
    if org_email:
        email_body = f"Device {device_name} triggered alert:\n\n{message}\n\nTimestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        NotificationService.send_email_notification(
            email_to=org_email,
            subject=f"PocketIoT Alert: {device_name}",
            body=email_body
        )

    # 3. Webhook (if configured)
    if org_webhook:
        payload = {
            "organization": str(organization_id), # Ideally fetch org name
            "device_id": str(device_id),
            "alert": message,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        NotificationService.send_webhook_notification(org_webhook, payload)

    # 4. SSE
    NotificationService.broadcast_notification_event(
        organization_id=organization_id,
        device_id=device_id,
        message=message,
        device_name=device_name
    )

    return notif_id

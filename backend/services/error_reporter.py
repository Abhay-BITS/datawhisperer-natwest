"""
Error Reporter — Debug Feedback Loop.

Sends error reports via email (SMTP) when configured, or falls back to
writing errors to a local log file. This ensures that runtime issues
in production (e.g., on Vercel/Render) are captured and surfaced to
the developer without requiring manual log inspection.

Environment variables:
    FEEDBACK_EMAIL: Recipient email for error reports.
    SMTP_HOST:      SMTP server hostname (default: smtp.gmail.com).
    SMTP_PORT:      SMTP server port (default: 587).
    SMTP_USER:      SMTP login username.
    SMTP_PASS:      SMTP login password or app-specific password.
"""

import os
import logging
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)

FEEDBACK_EMAIL = os.getenv("FEEDBACK_EMAIL", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


def report_error(error: Exception, context: dict | None = None) -> None:
    """Report an error via email or local log file.

    Args:
        error: The exception that was caught.
        context: Optional dict of request context (user question, mode, etc.).
    """
    timestamp = datetime.utcnow().isoformat()
    tb = traceback.format_exception(type(error), error, error.__traceback__)
    tb_str = "".join(tb)

    context_str = ""
    if context:
        # Sanitise context — remove sensitive fields
        safe_ctx = {k: v for k, v in context.items() if k not in ("token", "password")}
        context_str = "\n".join(f"  {k}: {v}" for k, v in safe_ctx.items())

    report = (
        f"DataWhisperer Error Report\n"
        f"{'=' * 50}\n"
        f"Time: {timestamp}\n"
        f"Error: {error}\n\n"
        f"Context:\n{context_str or '  (none)'}\n\n"
        f"Traceback:\n{tb_str}\n"
    )

    # Try email first
    if FEEDBACK_EMAIL and SMTP_USER and SMTP_PASS:
        try:
            _send_email(report, timestamp)
            logger.info("Error report emailed to %s", FEEDBACK_EMAIL)
            return
        except Exception as mail_err:
            logger.warning("Email failed (%s), falling back to log file.", mail_err)

    # Fallback: write to local log file
    _write_log_file(report)


def _send_email(report: str, timestamp: str) -> None:
    """Send the error report via SMTP."""
    import smtplib
    from email.mime.text import MIMEText

    msg = MIMEText(report)
    msg["Subject"] = f"[DataWhisperer] Error at {timestamp}"
    msg["From"] = SMTP_USER
    msg["To"] = FEEDBACK_EMAIL

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


def _write_log_file(report: str) -> None:
    """Append the error report to a local errors.log file."""
    log_path = os.path.join(os.path.dirname(__file__), "..", "errors.log")
    try:
        with open(log_path, "a") as f:
            f.write(report)
            f.write("\n\n")
        logger.info("Error report written to %s", log_path)
    except Exception as file_err:
        logger.error("Failed to write error log: %s", file_err)

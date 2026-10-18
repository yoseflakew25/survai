"""SSL context for managed Postgres (Aiven, Neon, etc.)."""

from __future__ import annotations

import ssl
from pathlib import Path


def build_database_ssl_context(ca_file: str | None = None) -> ssl.SSLContext:
    """Build an SSL context for asyncpg.

    - With ``ca_file``: verify the server cert (Aiven CA download).
    - Without: encrypt like libpq ``sslmode=require`` (no CA verification).
    """
    if ca_file:
        path = Path(ca_file)
        if not path.is_file():
            raise FileNotFoundError(f"DATABASE_SSL_CA not found: {ca_file}")
        return ssl.create_default_context(cafile=str(path))

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

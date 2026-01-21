# =============================================================================
# PostgreSQL Backup Service for trafico-dashboard
#
# Runs daily via Railway cron, backs up to R2 and Google Drive.
# Based on abemon.es/services/backup pattern.
#
# Uses postgres:17 official image which includes pg_dump 17.x
# =============================================================================

FROM postgres:17-bookworm

# Install rclone for R2 (S3-compatible) and Python for Drive upload
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    unzip \
    python3 \
    python3-pip \
    gzip \
    && pip3 install --no-cache-dir --break-system-packages \
        google-api-python-client \
        google-auth \
    && curl -fsSL https://downloads.rclone.org/rclone-current-linux-amd64.zip -o /tmp/rclone.zip \
    && unzip -j /tmp/rclone.zip '*/rclone' -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/rclone \
    && rm /tmp/rclone.zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set timezone for Madrid
ENV TZ=Europe/Madrid

# Copy scripts
COPY backup.sh /usr/local/bin/backup.sh
COPY upload_drive.py /usr/local/bin/upload_drive.py
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/upload_drive.py

# Override PostgreSQL's default entrypoint
ENTRYPOINT []
CMD ["/usr/local/bin/backup.sh"]

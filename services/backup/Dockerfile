# =============================================================================
# PostgreSQL Backup Service for trafico-dashboard
#
# Runs daily via Railway cron, backs up to R2 and Google Drive.
# Based on abemon.es/services/backup pattern.
# =============================================================================

FROM alpine:3.19

# Install PostgreSQL client and utilities
RUN apk add --no-cache \
    postgresql16-client \
    python3 \
    py3-pip \
    py3-google-api-python-client \
    py3-google-auth \
    ca-certificates \
    curl \
    gzip \
    unzip \
    tzdata \
    bash

# Install rclone for R2 (S3-compatible)
RUN curl -fsSL https://downloads.rclone.org/rclone-current-linux-amd64.zip -o /tmp/rclone.zip \
    && unzip -j /tmp/rclone.zip '*/rclone' -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/rclone \
    && rm /tmp/rclone.zip

# Set timezone for Madrid
ENV TZ=Europe/Madrid

# Copy scripts
COPY backup.sh /usr/local/bin/backup.sh
COPY upload_drive.py /usr/local/bin/upload_drive.py
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/upload_drive.py

CMD ["/usr/local/bin/backup.sh"]

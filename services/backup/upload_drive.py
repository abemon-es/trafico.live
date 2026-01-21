#!/usr/bin/env python3
"""
Upload backup file to Google Drive.

Usage: upload_drive.py <file_path> <folder_id>

Environment variables:
  GOOGLE_CREDENTIALS_JSON - Service account credentials JSON string
  GOOGLE_ADMIN_EMAIL      - Email to impersonate (default: mj@blue-mountain.es)
"""

import os
import sys
import json
import tempfile

def main():
    if len(sys.argv) < 3:
        print("Usage: upload_drive.py <file_path> <folder_id>", file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]
    folder_id = sys.argv[2]

    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    # Get credentials from env var
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    if not creds_json:
        print("ERROR: GOOGLE_CREDENTIALS_JSON not set", file=sys.stderr)
        sys.exit(1)

    # Import Google libraries (installed via apk in Dockerfile)
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError as e:
        print(f"ERROR: Missing Google libraries: {e}", file=sys.stderr)
        sys.exit(1)

    # Write credentials to temp file
    creds_file = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write(creds_json)
            creds_file = f.name

        # Create credentials
        credentials = service_account.Credentials.from_service_account_file(
            creds_file,
            scopes=['https://www.googleapis.com/auth/drive.file']
        )

        # Impersonate admin user for domain-wide delegation
        admin_email = os.environ.get('GOOGLE_ADMIN_EMAIL', 'mj@blue-mountain.es')
        credentials = credentials.with_subject(admin_email)

        # Build Drive service
        service = build('drive', 'v3', credentials=credentials, cache_discovery=False)

        # Upload file
        file_name = os.path.basename(file_path)
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }

        media = MediaFileUpload(
            file_path,
            mimetype='application/gzip',
            resumable=True
        )

        print(f"[drive] Uploading: {file_name}")
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,size',
            supportsAllDrives=True
        ).execute()

        print(f"[drive] Uploaded: {file.get('name')} (ID: {file.get('id')})")
        return 0

    except Exception as e:
        print(f"ERROR: Upload failed: {e}", file=sys.stderr)
        return 1

    finally:
        if creds_file and os.path.exists(creds_file):
            os.unlink(creds_file)


if __name__ == '__main__':
    sys.exit(main())

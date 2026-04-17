#!/usr/bin/env python3
"""
Fast vessel owner enrichment from marinetraffic.org
Runs LOCALLY on macOS (Cloudflare doesn't block residential IPs).
Uses plain HTTP requests (no browser needed).
Connects to DB via SSH tunnel.

Setup:
  ssh -N -L 15432:localhost:5440 database-primary

Usage:
  python3 enrich-fast.py                    # all pending
  python3 enrich-fast.py --limit 100        # first 100
  python3 enrich-fast.py --test 9838345     # test single IMO
  python3 enrich-fast.py --workers 3        # parallel workers
"""

import os
import sys
import time
import random
import logging
import re
import json
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import RealDictCursor

# --- Config ---
DB_HOST = "127.0.0.1"
DB_PORT = 15432
DB_NAME = "le_trafico"
DB_USER = "trafico_admin"
DB_PASS = os.environ["TRAFICO_ADMIN_PASSWORD"]

BASE_URL = "https://www.marinetraffic.org/ship-owner-manager-ism-data"
MIN_DELAY = 1.5
MAX_DELAY = 3.0

SCRIPT_DIR = Path(__file__).parent
PROGRESS_FILE = SCRIPT_DIR / ".enrich-fast-progress.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(SCRIPT_DIR / "enrich-fast.log"),
    ],
)
log = logging.getLogger(__name__)

# Thread-safe counters
stats = {
    "processed": 0,
    "enriched": 0,
    "not_found": 0,
    "empty": 0,
    "errors": 0,
    "rate_limited": 0,
}
stats_lock = Lock()
db_lock = Lock()


def get_db():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )


def _extract(text, pattern):
    """Extract a value from pipe-separated text, skip if locked."""
    m = re.search(pattern, text)
    if m:
        val = m.group(1).strip().rstrip("(").strip()
        if val and val != "-" and "Unlock" not in val:
            return val
    return None


def parse_page(soup):
    """Extract ALL free data fields from the vessel page."""
    data = {}

    # --- Parse table rows (key → value pairs) ---
    rows = soup.find_all("tr")
    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            val = cells[1].get_text(strip=True)
            if not val or val == "-" or "Unlock" in val:
                continue

            # Vessel info
            if key == "Ship type, detailed":
                data["shipTypeDetailed"] = val
            elif key == "Service Status":
                data["serviceStatus"] = val
            elif key == "Home Port":
                data["homePort"] = val
            elif key == "Call Sign":
                data["callSign"] = val
            elif key == "Built":
                try:
                    data["yearBuilt"] = int(val)
                except ValueError:
                    pass
            elif key == "Builder" and val != "-":
                data["builder"] = val
            elif key == "Gross Tonnage":
                try:
                    data["grossTonnage"] = int(val.replace(",", ""))
                except ValueError:
                    pass
            elif key == "Summer DWT":
                try:
                    data["deadweight"] = int(val.replace(",", ""))
                except ValueError:
                    pass

    # --- Parse management section with pipe-separated text ---
    sections = soup.find_all(class_="ship-owner-manager-ism-info__section")
    for section in sections:
        text = section.get_text(separator="|", strip=True)

        # Registered Shipowner + address
        val = _extract(text, r"Registered Shipowner\|([^|]+)")
        if val:
            data["registeredOwner"] = val
        # Owner address: look for Address right after owner
        val = _extract(
            text,
            r"Registered Shipowner\|[^|]+\|(?:Care of[^|]*\|[^|]*\|)?Address(?:\([^)]*\))?\|([^|]+)",
        )
        if not val:
            val = _extract(
                text, r"(?:of the beneficial owner\))\|([^|]+(?:,\s*[^|]+)*)"
            )
        if val and len(val) > 5:
            data["beneficialOwnerAddress"] = val

        # Beneficial shipowner
        val = _extract(text, r"(?:Care of )?[Bb]eneficial [Ss]hipowner\|([^|]+)")
        if val:
            data["beneficialOwner"] = val

        # Ship Manager + address
        val = _extract(text, r"Ship [Mm]anager\|([^|]+)")
        if val:
            data["shipManager"] = val
        addr = _extract(text, r"Ship [Mm]anager\|[^|]+\|Address\|([^|]+)")
        if addr and len(addr) > 5:
            data["managerAddress"] = addr

        # ISM Manager
        val = _extract(text, r"ISM [Mm]anager\|([^|]+)")
        if val:
            data["ismManager"] = val

    # --- GT/DWT ratio ---
    for section in sections:
        text = section.get_text(separator="|", strip=True)
        m = re.search(r"1 GT\(this ship\)\|(\d+\.?\d*)\s*DWT", text)
        if m:
            try:
                data["gtDwtRatio"] = float(m.group(1))
            except ValueError:
                pass

    return data


def enrich_vessel(session, vessel):
    """Fetch and parse owner data for a single vessel."""
    imo = vessel["imo"]
    mmsi = vessel["mmsi"]
    name = (vessel.get("name") or "UNKNOWN").replace(" ", "-").upper()

    url = f"{BASE_URL}/{name}/{imo}/{mmsi}"

    try:
        resp = session.get(url, headers=HEADERS, timeout=15)

        if resp.status_code == 404:
            return imo, "not_found", None
        if resp.status_code == 429:
            log.warning(f"Rate limited on IMO {imo}! Sleeping 60s...")
            time.sleep(60)
            return imo, "rate_limited", None
        if resp.status_code == 403:
            log.warning(f"403 on IMO {imo} — Cloudflare?")
            return imo, "error", None
        if resp.status_code != 200:
            log.warning(f"HTTP {resp.status_code} for IMO {imo}")
            return imo, "error", None

        soup = BeautifulSoup(resp.text, "html.parser")
        data = parse_page(soup)

        if not any(data.values()):
            return imo, "empty", None

        return imo, "ok", data

    except Exception as e:
        log.error(f"Error fetching IMO {imo}: {e}")
        return imo, "error", None


def update_vessel(conn, imo, data):
    """Update vessel record in DB with all extracted fields."""
    with db_lock:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "Vessel" SET
                    "registeredOwner" = COALESCE(%s, "registeredOwner"),
                    "shipManager" = COALESCE(%s, "shipManager"),
                    "ismManager" = COALESCE(%s, "ismManager"),
                    "beneficialOwner" = COALESCE(%s, "beneficialOwner"),
                    "classificationSociety" = COALESCE(%s, "classificationSociety"),
                    "shipTypeDetailed" = COALESCE(%s, "shipTypeDetailed"),
                    "serviceStatus" = COALESCE(%s, "serviceStatus"),
                    "homePort" = COALESCE(%s, "homePort"),
                    "ownerAddress" = COALESCE(%s, "ownerAddress"),
                    "managerAddress" = COALESCE(%s, "managerAddress"),
                    "beneficialOwnerAddress" = COALESCE(%s, "beneficialOwnerAddress"),
                    "callSign" = COALESCE(%s, "callSign"),
                    "yearBuilt" = COALESCE(%s, "yearBuilt"),
                    "builder" = COALESCE(%s, "builder"),
                    "grossTonnage" = COALESCE(%s, "grossTonnage"),
                    "deadweight" = COALESCE(%s, "deadweight"),
                    "gtDwtRatio" = COALESCE(%s, "gtDwtRatio"),
                    "ownerEnrichedAt" = NOW(),
                    "enrichSource" = 'marinetraffic.org'
                WHERE imo = %s
            """,
                (
                    data.get("registeredOwner"),
                    data.get("shipManager"),
                    data.get("ismManager"),
                    data.get("beneficialOwner"),
                    data.get("classificationSociety"),
                    data.get("shipTypeDetailed"),
                    data.get("serviceStatus"),
                    data.get("homePort"),
                    data.get("ownerAddress"),
                    data.get("managerAddress"),
                    data.get("beneficialOwnerAddress"),
                    data.get("callSign"),
                    data.get("yearBuilt"),
                    data.get("builder"),
                    data.get("grossTonnage"),
                    data.get("deadweight"),
                    data.get("gtDwtRatio"),
                    imo,
                ),
            )
            conn.commit()


def save_progress():
    with stats_lock:
        PROGRESS_FILE.write_text(json.dumps(stats, indent=2))


def worker(session, conn, vessel, idx, total):
    """Process a single vessel."""
    imo = vessel["imo"]
    name = vessel.get("name", "?")

    imo, status, data = enrich_vessel(session, vessel)

    with stats_lock:
        stats["processed"] += 1
        if status == "ok":
            stats["enriched"] += 1
            d = data or {}
            owner = d.get("registeredOwner", "?")
            manager = d.get("shipManager", "?")
            stype = d.get("shipTypeDetailed", "")
            built = d.get("yearBuilt", "")
            gt = d.get("grossTonnage", "")
            extra = f" | {stype}" if stype else ""
            extra += f" | {built}" if built else ""
            extra += f" | {gt}GT" if gt else ""
            log.info(f"[{idx}/{total}] {name} (IMO {imo}) → {owner} / {manager}{extra}")
        elif status == "not_found":
            stats["not_found"] += 1
            log.info(f"[{idx}/{total}] {name} (IMO {imo}) → not found")
        elif status == "empty":
            stats["empty"] += 1
            log.info(f"[{idx}/{total}] {name} (IMO {imo}) → empty page")
        elif status == "rate_limited":
            stats["rate_limited"] += 1
        else:
            stats["errors"] += 1
            log.warning(f"[{idx}/{total}] {name} (IMO {imo}) → error")

        if stats["processed"] % 50 == 0:
            save_progress()
            log.info(
                f"  Progress: {stats['processed']}/{total} | enriched={stats['enriched']} errors={stats['errors']}"
            )

    if data:
        update_vessel(conn, imo, data)

    # Random delay
    time.sleep(random.uniform(MIN_DELAY, MAX_DELAY))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--test", type=int, help="Test single IMO number")
    parser.add_argument(
        "--workers", type=int, default=1, help="Parallel workers (max 3)"
    )
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()

    args.workers = min(args.workers, 3)  # Safety cap

    conn = get_db()
    session = requests.Session()

    if args.test:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT imo, mmsi, name FROM "Vessel" WHERE imo = %s', (args.test,)
            )
            vessel = cur.fetchone()
            if not vessel:
                print(f"IMO {args.test} not found in DB")
                return
        imo, status, data = enrich_vessel(session, vessel)
        print(f"Status: {status}")
        print(f"Data: {json.dumps(data, indent=2)}")
        return

    # Get pending vessels
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        query = """
            SELECT imo, mmsi, name FROM "Vessel"
            WHERE "ownerEnrichedAt" IS NULL AND imo IS NOT NULL AND imo > 0
            ORDER BY imo
        """
        if args.offset:
            query += f" OFFSET {args.offset}"
        if args.limit:
            query += f" LIMIT {args.limit}"
        cur.execute(query)
        vessels = cur.fetchall()

    total = len(vessels)
    log.info(f"Starting enrichment: {total} vessels, {args.workers} worker(s)")

    if args.workers == 1:
        for idx, vessel in enumerate(vessels, 1):
            worker(session, conn, vessel, idx, total)
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = []
            for idx, vessel in enumerate(vessels, 1):
                f = pool.submit(worker, session, conn, vessel, idx, total)
                futures.append(f)
                # Stagger starts
                time.sleep(0.5)
            for f in as_completed(futures):
                f.result()  # Raise exceptions

    save_progress()
    log.info(f"DONE: {json.dumps(stats)}")
    conn.close()


if __name__ == "__main__":
    main()

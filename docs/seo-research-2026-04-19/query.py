#!/usr/bin/env python3
"""Helper CLI para consultar el universo de keywords del research 2026-04-19.

Úsalo desde cualquier agente que necesite datos sin leer el CSV completo.

Examples:
    # Top 50 quick wins ES
    python query.py winnable --country es --max-kd 20 --min-vol 1000 --top 50

    # Todas las keywords meteo PT con vol >= 10K
    python query.py search --country pt --pattern "tempo|meteo" --min-vol 10000

    # Gap keywords para dgt.es con CPC > 1
    python query.py gap --competitor dgt.es --min-cpc 1

    # Resumen estadístico
    python query.py stats

    # Export a CSV filtrado
    python query.py winnable --country es --top 500 --out /tmp/es-top500.csv
"""

import argparse
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
UNIVERSE = ROOT / "03-keyword-universe-full.csv"
WINNABLE = ROOT / "13-winnable-full.csv"
GAP = ROOT / "02-competitors-gap.csv"


def load_csv(path: Path):
    with open(path) as f:
        return list(csv.DictReader(f))


def fnum(x, default=0):
    try:
        return float(x)
    except (ValueError, TypeError):
        return default


def inum(x, default=None):
    try:
        return int(float(x))
    except (ValueError, TypeError):
        return default


def cmd_search(args):
    """Search in universe by keyword pattern."""
    rows = load_csv(UNIVERSE)
    pattern = re.compile(args.pattern, re.IGNORECASE) if args.pattern else None
    out = []
    for r in rows:
        if args.country and r["country"] != args.country:
            continue
        if pattern and not pattern.search(r["keyword"] or ""):
            continue
        vol = inum(r["search_volume"], 0)
        if vol < args.min_vol:
            continue
        if args.max_kd is not None:
            kd = inum(r["difficulty"])
            if kd is None or kd > args.max_kd:
                continue
        out.append(r)
    out.sort(key=lambda x: -inum(x["search_volume"], 0))
    write_out(out[: args.top], args.out)


def cmd_winnable(args):
    """Top winnable, sorted by score."""
    rows = load_csv(WINNABLE)
    out = []
    for r in rows:
        if args.country and r["country"] != args.country:
            continue
        vol = inum(r["search_volume"], 0)
        kd = inum(r["difficulty"])
        if vol < args.min_vol or (kd is None or kd > args.max_kd):
            continue
        out.append(r)
    out.sort(key=lambda x: -fnum(x["score"]))
    write_out(out[: args.top], args.out)


def cmd_gap(args):
    """Gap keywords (competitor ranks, we don't)."""
    rows = load_csv(GAP)
    out = []
    for r in rows:
        if args.country and r["country"] != args.country:
            continue
        if (
            args.competitor
            and args.competitor.lower() not in (r["competitor"] or "").lower()
        ):
            continue
        vol = inum(r["search_volume"], 0)
        cpc = fnum(r["cpc"], 0)
        if vol < args.min_vol or cpc < args.min_cpc:
            continue
        out.append(r)
    out.sort(key=lambda x: -inum(x["search_volume"], 0))
    write_out(out[: args.top], args.out)


def cmd_stats(args):
    """Quick stats about the universe."""
    rows = load_csv(UNIVERSE)
    es = [r for r in rows if r["country"] == "es"]
    pt = [r for r in rows if r["country"] == "pt"]
    es_kd = [r for r in es if r["difficulty"]]
    pt_kd = [r for r in pt if r["difficulty"]]

    print(f"Universe:      {len(rows):>7,} keywords")
    print(f"  ES:          {len(es):>7,}  (KD medido: {len(es_kd):,})")
    print(f"  PT:          {len(pt):>7,}  (KD medido: {len(pt_kd):,})")
    print()

    for country, sub in (("ES", es_kd), ("PT", pt_kd)):
        print(f"{country} — KD × Volumen (keywords con KD medido):")
        bands = {}
        for r in sub:
            v = inum(r["search_volume"], 0)
            kd = inum(r["difficulty"])
            if v < 100 or kd is None:
                continue
            kd_band = (
                "0-10"
                if kd <= 10
                else "11-20"
                if kd <= 20
                else "21-30"
                if kd <= 30
                else "31-50"
                if kd <= 50
                else "51+"
            )
            v_band = (
                "100K+"
                if v >= 100000
                else "10K-100K"
                if v >= 10000
                else "1K-10K"
                if v >= 1000
                else "100-1K"
            )
            bands.setdefault(kd_band, {}).setdefault(v_band, 0)
            bands[kd_band][v_band] += 1
        print(
            f"  {'KD/Vol':10} {'100-1K':>8} {'1K-10K':>8} {'10K-100K':>10} {'100K+':>6}"
        )
        for kd_b in ["0-10", "11-20", "21-30", "31-50", "51+"]:
            row = [f"  KD {kd_b:6}"]
            for v_b in ["100-1K", "1K-10K", "10K-100K", "100K+"]:
                row.append(f"{bands.get(kd_b, {}).get(v_b, 0):>8,}")
            print("  ".join(row))
        print()


def write_out(rows, out_path):
    if not rows:
        print("(no results)", file=sys.stderr)
        return
    if out_path:
        with open(out_path, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            for r in rows:
                w.writerow(r)
        print(f"Wrote {len(rows):,} rows to {out_path}")
        return
    # Pretty print to stdout
    for r in rows:
        kw = r.get("keyword", "")
        vol = r.get("search_volume", "")
        kd = r.get("difficulty", "-") or "-"
        cpc = r.get("cpc", "-") or "-"
        extra = ""
        if "score" in r:
            extra = f" score={r['score']}"
        elif "competitor" in r:
            extra = f" via={r['competitor']} rank={r.get('competitor_rank', '-')}"
        print(
            f"{r['country']} | {kw[:60]:60} | vol={vol:>8} | KD={kd:>4} | CPC=${cpc:>5}{extra}"
        )


def main():
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    # search
    ps = sub.add_parser("search", help="Search universe by pattern")
    ps.add_argument("--country", choices=["es", "pt"])
    ps.add_argument("--pattern", help="Regex on keyword")
    ps.add_argument("--min-vol", type=int, default=0)
    ps.add_argument("--max-kd", type=int, default=None)
    ps.add_argument("--top", type=int, default=100)
    ps.add_argument("--out", help="Write to CSV")
    ps.set_defaults(func=cmd_search)

    # winnable
    pw = sub.add_parser("winnable", help="Top winnable sorted by score")
    pw.add_argument("--country", choices=["es", "pt"])
    pw.add_argument("--min-vol", type=int, default=100)
    pw.add_argument("--max-kd", type=int, default=20)
    pw.add_argument("--top", type=int, default=50)
    pw.add_argument("--out", help="Write to CSV")
    pw.set_defaults(func=cmd_winnable)

    # gap
    pg = sub.add_parser("gap", help="Gap (competitor ranks, trafico.live doesn't)")
    pg.add_argument("--country", choices=["es", "pt"])
    pg.add_argument("--competitor", help="Filter by competitor domain substring")
    pg.add_argument("--min-vol", type=int, default=0)
    pg.add_argument("--min-cpc", type=float, default=0)
    pg.add_argument("--top", type=int, default=50)
    pg.add_argument("--out", help="Write to CSV")
    pg.set_defaults(func=cmd_gap)

    # stats
    pt = sub.add_parser("stats", help="Quick stats about universe")
    pt.set_defaults(func=cmd_stats)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

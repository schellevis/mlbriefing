"""
Nieuws-pipeline: haalt RSS + Reddit op en schrijft naar data/news/YYYY-MM-DD.json.
Draait 4x per dag. Append-modus: voegt nieuwe headlines toe aan bestaande.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path

# Voeg scripts/ toe aan het pad
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import load_config
from fetch_news import fetch_all_news

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data" / "news"


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    config = load_config()
    today = str(date.today())
    out_path = DATA_DIR / f"{today}.json"

    # Bestaand bestand laden voor deduplicatie
    existing_headlines = []
    existing_data: dict = {}
    if out_path.exists():
        try:
            with open(out_path, encoding="utf-8") as f:
                existing_data = json.load(f)
            existing_headlines = existing_data.get("headlines", [])
            logger.info(f"Bestaand bestand geladen: {len(existing_headlines)} headlines")
        except Exception as e:
            logger.warning(f"Kon bestaand nieuws niet laden: {e}")

    # Nieuws ophalen
    new_data = fetch_all_news(existing_headlines=existing_headlines)

    # Merge: voeg nieuwe headlines toe aan bestaande
    merged_headlines = existing_headlines + new_data["headlines"]

    # Reddit: vervang (meest recente is best)
    merged_reddit = {**existing_data.get("reddit", {}), **new_data["reddit"]}

    output = {
        "last_updated": datetime.now(tz=timezone.utc).isoformat(),
        "headlines": merged_headlines,
        "reddit": merged_reddit,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info(
        f"Nieuws geschreven naar {out_path}: "
        f"{len(merged_headlines)} headlines, "
        f"{sum(len(v) for v in merged_reddit.values())} reddit posts"
    )


if __name__ == "__main__":
    main()

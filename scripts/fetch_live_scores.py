"""Live scores updater — lichtgewicht, geen AI. Draait elke 30 minuten."""
from __future__ import annotations

import json
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import requests

from utils.config import load_config

logger = logging.getLogger(__name__)

MLB_API = "https://statsapi.mlb.com/api/v1"
DATA_DIR = Path(__file__).parent.parent / "data" / "live"


def fetch_live_scores() -> list[dict]:
    """Haalt huidige scores op voor vandaag."""
    today = str(date.today())
    try:
        r = requests.get(
            f"{MLB_API}/schedule?date={today}&sportId=1&hydrate=linescore,team",
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"Live scores fout: {e}")
        return []

    games = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            status = game.get("status", {}).get("detailedState", "")
            away = game["teams"]["away"]
            home = game["teams"]["home"]

            games.append({
                "game_pk": game["gamePk"],
                "away": away["team"].get("abbreviation", ""),
                "home": home["team"].get("abbreviation", ""),
                "away_score": away.get("score"),
                "home_score": home.get("score"),
                "status": status,
                "inning": game.get("linescore", {}).get("currentInning"),
                "inning_half": game.get("linescore", {}).get("inningHalf", ""),
            })

    return games


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    config = load_config()

    games = fetch_live_scores()

    # Alleen schrijven als er data is
    if not games:
        logger.info("Geen live games gevonden, niets te schrijven")
        sys.exit(0)

    # Check of er active games zijn (niet alleen Final)
    active = [g for g in games if "Final" not in g["status"] and "Preview" not in g["status"]]
    if not active:
        logger.info("Alle games zijn afgelopen of nog niet begonnen")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "updated_at": datetime.now(tz=timezone.utc).isoformat(),
        "games": games,
    }

    out_path = DATA_DIR / "latest.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info(f"Live scores geschreven naar {out_path} ({len(games)} games)")


if __name__ == "__main__":
    main()

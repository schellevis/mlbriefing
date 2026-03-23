"""Haalt MLB standings op via de MLB Stats API."""
from __future__ import annotations

import logging
from datetime import date

import requests

from utils.config import load_config

logger = logging.getLogger(__name__)

MLB_API = "https://statsapi.mlb.com/api/v1"


def fetch_standings(season: int | None = None) -> dict[str, list[dict]]:
    """
    Haalt standings op voor alle divisions en geeft een dict terug
    met division-namen als keys.
    """
    config = load_config()
    if season is None:
        season = date.today().year

    try:
        r = requests.get(
            f"{MLB_API}/standings?leagueId=103,104&season={season}&hydrate=team",
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"MLB standings API fout: {e}")
        return {}

    # Division ID → naam mapping
    division_id_map = config.get("division_ids", {})
    id_to_name = {v: k for k, v in division_id_map.items()}

    # Welke divisions volgen we?
    target_divisions = set(config.get("divisions", []))

    result: dict[str, list[dict]] = {}

    for record in data.get("records", []):
        division = record.get("division", {})
        div_id = division.get("id")
        div_name = id_to_name.get(div_id) or division.get("name", f"Division {div_id}")

        if div_name not in target_divisions:
            continue

        teams = []
        for tr in record.get("teamRecords", []):
            team = tr.get("team", {})
            abbr = team.get("abbreviation", "UNK")
            wins = tr.get("wins", 0)
            losses = tr.get("losses", 0)
            pct = tr.get("winningPercentage", ".000")
            gb = tr.get("gamesBack", "—")
            streak = tr.get("streak", {}).get("streakCode", "")
            last10 = ""
            if "records" in tr:
                for sub in tr["records"].get("splitRecords", []):
                    if sub.get("type") == "lastTen":
                        last10 = f"{sub['wins']}-{sub['losses']}"

            teams.append({
                "team": abbr,
                "w": wins,
                "l": losses,
                "pct": pct,
                "gb": gb if gb != "-" else "—",
                "streak": streak,
                "l10": last10,
            })

        result[div_name] = teams

    return result


def get_team_record(standings: dict[str, list[dict]], team_abbr: str) -> str:
    """Zoekt het W-L record van een specifiek team."""
    for division_teams in standings.values():
        for t in division_teams:
            if t["team"] == team_abbr:
                return f"{t['w']}-{t['l']}"
    return "?-?"

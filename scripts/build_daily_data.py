"""
Orchestrator voor de dagelijkse MLBriefing pipeline.

Gebruik:
    python scripts/build_daily_data.py              # Normaal draaien
    python scripts/build_daily_data.py --dry-run    # Test zonder schrijven/AI
    python scripts/build_daily_data.py --date 2026-03-27  # Specifieke datum
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

# Voeg scripts/ toe aan het pad zodat imports werken
sys.path.insert(0, str(Path(__file__).parent))

from utils.config import load_config, get_my_teams, get_team_abbrs
from fetch_scores import (
    fetch_schedule,
    build_scores_list,
    build_watch_list,
    build_team_card,
    get_team_game,
    fetch_boxscore,
)
from fetch_standings import fetch_standings, get_team_record
from generate_briefing import generate_briefing

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MLBriefing dagelijkse data pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Test zonder schrijven of AI-calls")
    parser.add_argument("--date", type=str, help="Datum (YYYY-MM-DD), standaard gisteren")
    return parser.parse_args()


def format_date_display(d: date, tz: ZoneInfo) -> str:
    """Formatteert datum als Nederlandse string: 'Do 27 mrt'."""
    dag = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"][d.weekday()]
    maand = ["jan", "feb", "mrt", "apr", "mei", "jun",
             "jul", "aug", "sep", "okt", "nov", "dec"][d.month - 1]
    return f"{dag} {d.day} {maand}"


def detect_gameday(target_date: date) -> int:
    """
    Schat het game-day nummer op basis van de datum.
    Opening Day 2026 is op 26 mrt.
    """
    opening_day = date(target_date.year, 3, 26)
    delta = (target_date - opening_day).days
    return max(1, delta + 1)


def build_daily_json(
    target_date: date,
    config: dict,
    dry_run: bool = False,
) -> dict:
    """Bouwt het volledige dagelijkse JSON object."""

    tz = ZoneInfo(config["timezone"])
    now = datetime.now(tz=timezone.utc).isoformat()
    season = target_date.year

    logger.info(f"Data ophalen voor {target_date}...")

    # Scores van de doeldatum ophalen
    games_today = fetch_schedule(target_date, days=1)
    logger.info(f"  {len(games_today)} games gevonden voor {target_date}")

    # Upcoming games voor watch-tab (volgende N dagen)
    watch_days = config.get("watch_days_ahead", 7)
    tomorrow = target_date + timedelta(days=1)
    upcoming_games = fetch_schedule(tomorrow, days=watch_days)
    logger.info(f"  {len(upcoming_games)} aankomende games gevonden")

    # Standings ophalen
    standings_raw = fetch_standings(season)
    logger.info(f"  Standings opgehaald: {list(standings_raw.keys())}")

    # Scores lijst (alle afgelopen wedstrijden)
    scores = build_scores_list(games_today)

    # Watch lijst (aankomende wedstrijden)
    watch = build_watch_list(upcoming_games, config)

    # Team cards bouwen voor mijn teams
    my_teams = get_my_teams(config)
    team_cards: dict[str, dict] = {}

    for team in my_teams:
        abbr = team["abbr"]
        team_key = team["name"].lower().replace(" ", "_").split("_")[-1]  # "mets" of "rays"
        # Gebruik de subreddit als key (handiger)
        team_key = abbr.lower()

        game = get_team_game(games_today, abbr)

        if game:
            # Boxscore ophalen voor pitcher details
            boxscore = {}
            if not dry_run:
                boxscore = fetch_boxscore(game["game_pk"])

            # Volgende game van dit team
            next_game = next(
                (g for g in upcoming_games if g["away"] == abbr or g["home"] == abbr),
                None,
            )

            card = build_team_card(game, abbr, boxscore, next_game, config)
            # Voeg record toe vanuit standings
            card["record"] = get_team_record(standings_raw, abbr)
            # Kleur uit config
            card["color"] = team["color"]
        else:
            # Team heeft vandaag niet gespeeld
            next_game = next(
                (g for g in upcoming_games if g["away"] == abbr or g["home"] == abbr),
                None,
            )
            next_info = None
            if next_game:
                ng_home = next_game["home"] == abbr
                ng_opp = next_game["away"] if ng_home else next_game["home"]
                next_info = {
                    "date": next_game["date"],
                    "date_display": next_game.get("date_display", ""),
                    "vs": ng_opp,
                    "home": ng_home,
                    "starter": next_game["home_probable"] if ng_home else next_game["away_probable"],
                    "opp_starter": next_game["away_probable"] if ng_home else next_game["home_probable"],
                    "game_time_et": next_game["game_time_et"],
                    "game_time_cet": next_game["game_time_cet"],
                }
            card = {
                "abbr": abbr,
                "result": None,
                "score": None,
                "opponent": None,
                "home": None,
                "record": get_team_record(standings_raw, abbr),
                "starter": {"name": None, "line": None},
                "key_play": None,
                "next_game": next_info,
                "color": team["color"],
            }

        team_cards[abbr.lower()] = card

    # Standings opmaken
    standings_output: dict[str, list] = {}
    for div_name, teams in standings_raw.items():
        # Zet divisienaam om naar snake_case key
        key = div_name.lower().replace(" ", "_")  # "nl_east", "al_east"
        standings_output[key] = teams

    # Context voor AI
    ai_context = {
        "date": str(target_date),
        "teams": team_cards,
        "scores": scores,
        "standings": standings_output,
    }

    # Briefing genereren
    logger.info("  AI briefing genereren...")
    briefing = generate_briefing(ai_context, dry_run=dry_run)
    logger.info(f"  Briefing: {briefing[:80]}...")

    # Tijdstip weergave in lokale tijd
    local_now = datetime.now(tz=tz)
    gen_time = local_now.strftime("%H:%M")

    output = {
        "meta": {
            "date": str(target_date),
            "date_display": format_date_display(target_date, tz),
            "generated_at": now,
            "gen_time": gen_time,
            "gameday": detect_gameday(target_date),
            "season": season,
        },
        "briefing": briefing,
        "teams": team_cards,
        "scores": scores,
        "standings": standings_output,
        "watch": watch,
    }

    return output


def update_index(daily_dir: Path, index_path: Path, new_date: str) -> None:
    """Voegt een datum toe aan data/index.json."""
    if index_path.exists():
        with open(index_path, encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"dates": [], "latest": None}

    if new_date not in index["dates"]:
        index["dates"].append(new_date)
        index["dates"].sort(reverse=True)

    index["latest"] = index["dates"][0] if index["dates"] else None

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    args = parse_args()
    config = load_config()

    # Datum bepalen: gisteren in de lokale tijdzone
    tz = ZoneInfo(config["timezone"])
    if args.date:
        from datetime import date as date_cls
        target_date = date_cls.fromisoformat(args.date)
    else:
        # Gisteren (de vorige MLB-dag)
        local_now = datetime.now(tz=tz)
        target_date = (local_now - timedelta(days=1)).date()

    logger.info(f"MLBriefing pipeline starten voor {target_date}")
    if args.dry_run:
        logger.info("DRY RUN MODE — geen bestanden worden geschreven, geen AI-calls")

    try:
        output = build_daily_json(target_date, config, dry_run=args.dry_run)
    except Exception as e:
        logger.error(f"Pipeline gefaald: {e}")
        raise

    if args.dry_run:
        print("\n=== DRY RUN OUTPUT ===")
        print(json.dumps(output, ensure_ascii=False, indent=2))
        logger.info("Dry run voltooid")
        return

    # Schrijf naar data/daily/YYYY-MM-DD.json
    daily_dir = DATA_DIR / "daily"
    daily_dir.mkdir(parents=True, exist_ok=True)
    out_path = daily_dir / f"{target_date}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    logger.info(f"Geschreven naar {out_path}")

    # Update index
    index_path = DATA_DIR / "index.json"
    update_index(daily_dir, index_path, str(target_date))
    logger.info(f"Index bijgewerkt: {index_path}")


if __name__ == "__main__":
    main()

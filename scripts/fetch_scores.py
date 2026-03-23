"""Haalt MLB scores op voor een gegeven datum via de MLB Stats API."""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests

from utils.config import load_config, get_team_abbrs

logger = logging.getLogger(__name__)

MLB_API = "https://statsapi.mlb.com/api/v1"
TEAM_ABBR_MAP: dict[int, str] = {}


def _get_team_abbr_map() -> dict[int, str]:
    """Bouwt een map van team_id → abbreviation."""
    global TEAM_ABBR_MAP
    if TEAM_ABBR_MAP:
        return TEAM_ABBR_MAP
    try:
        r = requests.get(f"{MLB_API}/teams?sportId=1", timeout=10)
        r.raise_for_status()
        for team in r.json().get("teams", []):
            TEAM_ABBR_MAP[team["id"]] = team.get("abbreviation", "UNK")
    except Exception as e:
        logger.warning(f"Kon team-map niet ophalen: {e}")
    return TEAM_ABBR_MAP


def _parse_linescore(linescore: dict) -> str | None:
    """Zet linescore om naar leesbare pitcher-regel (bv. '7 IP 2 ER 9 K')."""
    if not linescore:
        return None
    innings = linescore.get("currentInning", 0)
    return f"{innings} IP" if innings else None


def _format_time_cet(utc_str: str, tz: ZoneInfo) -> str:
    """Converteert UTC ISO-string naar lokale tijd (HH:MM)."""
    try:
        dt = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        local = dt.astimezone(tz)
        return local.strftime("%H:%M")
    except Exception:
        return "—"


def fetch_schedule(target_date: date, days: int = 1) -> list[dict]:
    """
    Haalt het MLB-schema op voor target_date (+ optioneel aantal extra dagen).
    Geeft een lijst van games terug.
    """
    config = load_config()
    tz = ZoneInfo(config["timezone"])
    abbr_map = _get_team_abbr_map()

    end_date = target_date + timedelta(days=days - 1)
    url = (
        f"{MLB_API}/schedule"
        f"?startDate={target_date}&endDate={end_date}"
        f"&sportId=1"
        f"&hydrate=linescore,probablePitcher,decisions,team"
    )

    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"MLB schedule API fout: {e}")
        return []

    games = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            away_team = game["teams"]["away"]["team"]
            home_team = game["teams"]["home"]["team"]
            away_id = away_team["id"]
            home_id = home_team["id"]

            away_abbr = abbr_map.get(away_id, away_team.get("abbreviation", "UNK"))
            home_abbr = abbr_map.get(home_id, home_team.get("abbreviation", "UNK"))

            status = game.get("status", {}).get("detailedState", "Unknown")
            is_final = "Final" in status or "Completed" in status

            away_score = game["teams"]["away"].get("score")
            home_score = game["teams"]["home"].get("score")

            # Probable pitchers
            away_probable = (
                game["teams"]["away"].get("probablePitcher", {}).get("fullName")
                if not is_final else None
            )
            home_probable = (
                game["teams"]["home"].get("probablePitcher", {}).get("fullName")
                if not is_final else None
            )

            # Winnaars
            winning_pitcher = None
            losing_pitcher = None
            if "decisions" in game:
                d = game["decisions"]
                winning_pitcher = d.get("winner", {}).get("fullName")
                losing_pitcher = d.get("loser", {}).get("fullName")

            game_time_utc = game.get("gameDate", "")
            game_time_cet = _format_time_cet(game_time_utc, tz) if game_time_utc else "—"
            # ET is UTC-4 (zomertijd) / UTC-5 (wintertijd)
            try:
                dt_utc = datetime.fromisoformat(game_time_utc.replace("Z", "+00:00"))
                dt_et = dt_utc.astimezone(ZoneInfo("America/New_York"))
                game_time_et = dt_et.strftime("%H:%M")
                game_date_display = dt_et.strftime("%Y-%m-%d")
            except Exception:
                game_time_et = "—"
                game_date_display = str(target_date)

            games.append({
                "game_pk": game["gamePk"],
                "date": game_date_display,
                "away": away_abbr,
                "home": home_abbr,
                "away_score": away_score,
                "home_score": home_score,
                "status": status,
                "is_final": is_final,
                "game_time_utc": game_time_utc,
                "game_time_et": game_time_et,
                "game_time_cet": game_time_cet,
                "winning_pitcher": winning_pitcher,
                "losing_pitcher": losing_pitcher,
                "away_probable": away_probable,
                "home_probable": home_probable,
                "linescore": game.get("linescore"),
            })

    return games


def build_scores_list(games: list[dict]) -> list[dict]:
    """Bouwt de compacte scores-lijst voor de JSON output."""
    scores = []
    for g in games:
        if not g["is_final"]:
            continue
        scores.append({
            "away": g["away"],
            "home": g["home"],
            "away_score": g["away_score"],
            "home_score": g["home_score"],
            "status": g["status"],
            "note": "",  # Wordt later door generate_briefing ingevuld
        })
    return scores


def build_watch_list(games: list[dict], config: dict) -> list[dict]:
    """
    Bouwt de watch-lijst voor de Kijken-tab.
    Berekent watch_status op basis van CET-tijd en drempelwaarden.
    """
    tz = ZoneInfo(config["timezone"])
    my_abbrs = get_team_abbrs(config)
    watchable = config["watch_thresholds"]["watchable_before"]
    maybe = config["watch_thresholds"]["maybe_before"]

    watch = []
    for g in games:
        if g["is_final"]:
            continue

        # Datum weergave in Nederlands (bijv. "vr 28 mrt")
        try:
            d = datetime.fromisoformat(g["game_time_utc"].replace("Z", "+00:00"))
            local_d = d.astimezone(tz)
            dag_nl = ["ma", "di", "wo", "do", "vr", "za", "zo"][local_d.weekday()]
            maand_nl = ["jan", "feb", "mrt", "apr", "mei", "jun",
                        "jul", "aug", "sep", "okt", "nov", "dec"][local_d.month - 1]
            date_display = f"{dag_nl} {local_d.day} {maand_nl}"
        except Exception:
            date_display = g["date"]
            local_d = None

        # Watch status
        cet = g["game_time_cet"]
        watch_status = "nacht"
        if cet != "—":
            try:
                h, m = map(int, cet.split(":"))
                cet_minutes = h * 60 + m
                # Correctie voor middernacht (bijv. 01:10 = 25:10)
                if h < 12:
                    cet_minutes += 24 * 60
                watchable_h, watchable_m = map(int, watchable.split(":"))
                maybe_h, maybe_m = map(int, maybe.split(":"))
                if cet_minutes <= watchable_h * 60 + watchable_m:
                    watch_status = "kijkbaar"
                elif cet_minutes <= maybe_h * 60 + maybe_m:
                    watch_status = "twijfel"
            except Exception:
                pass

        is_mine = g["away"] in my_abbrs or g["home"] in my_abbrs
        my_team = next((t for t in my_abbrs if t in (g["away"], g["home"])), None)

        watch.append({
            "away": g["away"],
            "home": g["home"],
            "game_time_et": g["game_time_et"],
            "game_time_cet": g["game_time_cet"],
            "date": g["date"],
            "date_display": date_display,
            "starter_away": g["away_probable"] or "TBD",
            "starter_home": g["home_probable"] or "TBD",
            "watch_status": watch_status,
            "is_mine": is_mine,
            "my_team": my_team,
        })

    return watch


def get_team_game(games: list[dict], team_abbr: str) -> dict | None:
    """Zoekt het gespeelde game voor een specifiek team."""
    for g in games:
        if g["is_final"] and (g["away"] == team_abbr or g["home"] == team_abbr):
            return g
    return None


def fetch_boxscore(game_pk: int) -> dict:
    """Haalt de boxscore op voor een specifiek spel."""
    try:
        r = requests.get(f"{MLB_API}/game/{game_pk}/boxscore", timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning(f"Kon boxscore niet ophalen voor game {game_pk}: {e}")
        return {}


def build_team_card(game: dict, team_abbr: str, boxscore: dict, next_game: dict | None, config: dict) -> dict:
    """
    Bouwt de team-card data voor een gespeeld spel.
    """
    is_home = game["home"] == team_abbr
    opponent = game["away"] if is_home else game["home"]

    my_score = game["home_score"] if is_home else game["away_score"]
    opp_score = game["away_score"] if is_home else game["home_score"]
    result = "W" if (my_score is not None and opp_score is not None and my_score > opp_score) else "L"
    score_str = f"{my_score}-{opp_score}" if my_score is not None else "—"

    # Starter info uit boxscore
    starter_name = ""
    starter_line = ""
    try:
        side = "home" if is_home else "away"
        pitchers = boxscore.get("teams", {}).get(side, {}).get("pitchers", [])
        pitcher_info = boxscore.get("teams", {}).get(side, {}).get("players", {})
        if pitchers:
            starter_id = f"ID{pitchers[0]}"
            player = pitcher_info.get(starter_id, {})
            stats = player.get("stats", {}).get("pitching", {})
            starter_name = player.get("person", {}).get("fullName", "").split()[-1]
            ip = stats.get("inningsPitched", "?")
            er = stats.get("earnedRuns", "?")
            k = stats.get("strikeOuts", "?")
            starter_line = f"{ip} IP {er} ER {k} K"
    except Exception:
        pass

    # Record (uit standings, wordt later aangevuld)
    record = "?-?"

    # Next game info
    next_info = None
    if next_game:
        ng_home = next_game["home"] == team_abbr
        ng_opp = next_game["away"] if ng_home else next_game["home"]
        next_info = {
            "date": next_game["date"],
            "date_display": next_game.get("date_display", next_game["date"]),
            "vs": ng_opp,
            "home": ng_home,
            "starter": next_game["home_probable"] if ng_home else next_game["away_probable"],
            "opp_starter": next_game["away_probable"] if ng_home else next_game["home_probable"],
            "game_time_et": next_game["game_time_et"],
            "game_time_cet": next_game["game_time_cet"],
        }

    return {
        "abbr": team_abbr,
        "result": result,
        "score": score_str,
        "opponent": opponent,
        "home": is_home,
        "record": record,
        "starter": {
            "name": starter_name,
            "line": starter_line,
        },
        "key_play": "",  # Wordt door AI ingevuld
        "next_game": next_info,
    }

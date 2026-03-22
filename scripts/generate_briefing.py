"""Genereert de AI-briefing via Anthropic API (Haiku + Opus)."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from utils.config import load_config

logger = logging.getLogger(__name__)


def _load_prompt(filename: str) -> str:
    path = Path(__file__).parent / "prompts" / filename
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def generate_haiku_summary(context: dict, dry_run: bool = False) -> str:
    """
    Stap 1: Haiku genereert een feitelijke samenvatting van scores.
    """
    config = load_config()
    model = config["ai"]["briefing_model"]
    max_words = config["ai"]["max_briefing_words"]
    language = config["ai"]["language"]

    if dry_run:
        return "[DRY RUN] Haiku samenvatting niet gegenereerd."

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("Geen ANTHROPIC_API_KEY gevonden, sla AI-samenvatting over")
        return ""

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = _load_prompt("briefing_system.txt") or f"""Je bent een beknopte MLB-verslaggever die schrijft in het {language}.
Schrijf een feitelijke samenvatting van de MLB-nacht in maximaal {max_words} woorden.
Schrijfregels:
- Geen onverklaarde afkortingen in lopende tekst
- "7 sterke innings met 9 strikeouts", niet "7 IP, 9 K"
- Nederlands waar het kan, gangbaar Engels laten staan (homerun, bullpen, strikeout)
- Noem de Mets en Rays resultaten eerst als ze gespeeld hebben
- Compact en informatief"""

        # Bouw context op
        lines = [f"MLB uitslag {context.get('date', '')}:"]

        teams = context.get("teams", {})
        for team_key, team in teams.items():
            if team.get("result"):
                lines.append(
                    f"- {team['abbr']}: {team['result']} {team['score']} vs {team['opponent']}"
                    + (f" — starter: {team['starter']['line']}" if team.get("starter", {}).get("line") else "")
                )

        scores = context.get("scores", [])
        if scores:
            lines.append("\nAlle uitslagen:")
            for s in scores:
                winner = s["away"] if s["away_score"] > s["home_score"] else s["home"]
                lines.append(f"- {s['away']} {s['away_score']}-{s['home_score']} {s['home']}")

        user_content = "\n".join(lines)

        msg = client.messages.create(
            model=model,
            max_tokens=400,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        )
        return msg.content[0].text.strip()

    except Exception as e:
        logger.error(f"Haiku API fout: {e}")
        return ""


def generate_opus_analysis(context: dict, haiku_summary: str, dry_run: bool = False) -> str:
    """
    Stap 2: Opus genereert analytische inzichten.
    """
    config = load_config()
    model = config["ai"]["analysis_model"]
    max_words = config["ai"]["max_analysis_words"]

    if dry_run:
        return "[DRY RUN] Opus analyse niet gegenereerd."

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return ""

    # Als er geen Statcast data is, geef feitelijke samenvatting terug
    statcast = context.get("statcast", {})
    reddit = context.get("reddit_sentiment", {})
    if not statcast and not reddit:
        return haiku_summary

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = _load_prompt("analysis_system.txt") or f"""Je bent een analytische MLB-columnist die schrijft voor een Nederlandse fan
met bovengemiddelde honkbalkennis.

Je taak: lever 2-3 inzichten die NIET uit de boxscore te halen zijn.
Focus op:
- Pitch-level trends (velocity changes, whiff rate vs gemiddelde)
- Approach changes (pull% vs oppo%, chase rate shifts)
- Vergelijking met vorige starts of seizoensgemiddelde
- Wat fans op Reddit opvalt (sentiment, zorgen, hype)

Stijl:
- Kort en puntig, max {max_words} woorden totaal
- Elk inzicht begint met een concreet datapunt
- Nederlands, informeel maar analytisch
- Geen herhaling van de feitelijke samenvatting"""

        lines = [f"Analyseer de MLB-nacht van {context.get('date', '')}."]
        lines.append(f"\nFEITELIJKE SAMENVATTING:\n{haiku_summary}")

        if statcast:
            for pitcher, data in statcast.items():
                lines.append(f"\nSTATCAST {pitcher}:")
                for k, v in data.items():
                    lines.append(f"  {k}: {v}")

        if reddit:
            lines.append("\nREDDIT SENTIMENT:")
            for sub, posts in reddit.items():
                if posts:
                    lines.append(f"r/{sub}: {', '.join(p['title'][:60] for p in posts[:3])}")

        msg = client.messages.create(
            model=model,
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": "\n".join(lines)}],
        )
        return msg.content[0].text.strip()

    except Exception as e:
        logger.error(f"Opus API fout: {e}")
        return haiku_summary


def generate_briefing(context: dict, dry_run: bool = False) -> str:
    """
    Volledige briefing pipeline: Haiku samenvatting → Opus analyse.
    Fallback naar feitelijke samenvatting als AI faalt.
    """
    haiku = generate_haiku_summary(context, dry_run=dry_run)
    if not haiku:
        # Fallback: simpele tekst-samenvatting zonder AI
        teams = context.get("teams", {})
        parts = []
        for team in teams.values():
            if team.get("result"):
                parts.append(f"{team['abbr']} {team['result']} {team['score']}")
        return " · ".join(parts) if parts else "Geen briefing beschikbaar."

    analysis = generate_opus_analysis(context, haiku, dry_run=dry_run)
    return analysis if analysis else haiku

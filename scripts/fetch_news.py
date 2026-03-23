"""Haalt nieuws op via RSS feeds en Reddit RSS."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import feedparser
import requests

from utils.config import load_config
from utils.dedup import dedup_headlines

logger = logging.getLogger(__name__)

# Tag-regels op basis van keywords
TAG_RULES = [
    ("🔥", ["shutout", "no-hitter", "perfect game", "grand slam", "cycle", "walk-off",
            "complete game", "cgso", "debut", "debuut"]),
    ("🌱", ["prospect", "minor league", "callup", "call-up", "draft", "triple-a", "double-a"]),
    ("💊", ["injury", "il ", "injured", "surgery", "rehab", "blessure", "dl "]),
    ("🔄", ["trade", "trade ", "traded", "acquired", "deal", "transaction", "signing",
            "signed", "released", "waiver"]),
    ("📡", ["statcast", "exit velocity", "spin rate", "launch angle", "evo", "rpm"]),
]

DEFAULT_TAG = "📰"


def tag_headline(title: str) -> str:
    """Kent een emoji-tag toe op basis van de titel."""
    title_lower = title.lower()
    for tag, keywords in TAG_RULES:
        if any(kw in title_lower for kw in keywords):
            return tag
    return DEFAULT_TAG


def fetch_rss_source(url: str, name: str, limit: int = 10) -> list[dict]:
    """Haalt items op uit een RSS feed."""
    try:
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:limit]:
            published_str = ""
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    published_str = dt.isoformat()
                except Exception:
                    pass

            title = entry.get("title", "").strip()
            if not title:
                continue

            link = entry.get("link", "")
            excerpt = ""
            if hasattr(entry, "summary"):
                # Strip HTML tags
                import re
                excerpt = re.sub(r"<[^>]+>", "", entry.summary).strip()[:200]

            items.append({
                "title": title,
                "source": name,
                "url": link,
                "published_at": published_str,
                "tag": tag_headline(title),
                "excerpt": excerpt,
            })
        logger.info(f"RSS {name}: {len(items)} items")
        return items
    except Exception as e:
        logger.warning(f"RSS {name} ({url}) fout: {e}")
        return []


def fetch_reddit_rss(subreddit: str, sort: str = "hot", time_filter: str = "day", limit: int = 10) -> list[dict]:
    """Haalt posts op via Reddit RSS."""
    url = f"https://www.reddit.com/r/{subreddit}/{sort}/.rss"
    if sort == "top":
        url += f"?t={time_filter}"

    headers = {"User-Agent": "mlbriefing/1.0 (dashboard)"}
    try:
        # feedparser respecteert geen custom headers, gebruik requests + feedparser
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)

        posts = []
        for entry in feed.entries[:limit]:
            title = entry.get("title", "").strip()
            if not title:
                continue

            link = entry.get("link", "")
            # Score staat niet in RSS, zet 0 als placeholder
            posts.append({
                "title": title,
                "url": link,
                "score": 0,
                "comments": 0,
                "subreddit": subreddit,
            })
        logger.info(f"Reddit r/{subreddit}: {len(posts)} posts")
        return posts
    except Exception as e:
        logger.warning(f"Reddit r/{subreddit} RSS fout: {e}")
        return []


def fetch_all_news(existing_headlines: list[dict] | None = None) -> dict:
    """
    Haalt alle nieuws op en geeft de gecombineerde output terug.
    Dedupliceert op basis van bestaande headlines.
    """
    config = load_config()
    now = datetime.now(tz=timezone.utc).isoformat()

    # RSS feeds
    all_headlines = []
    for source in config.get("sources", {}).get("rss", []):
        items = fetch_rss_source(source["url"], source["name"])
        all_headlines.extend(items)
        time.sleep(0.5)  # Vriendelijk ophalen

    # Dedupliceer
    fresh = dedup_headlines(all_headlines, existing_headlines)

    # Reddit feeds
    reddit_data: dict[str, list[dict]] = {}

    # Algemeen baseball subreddit
    for reddit_cfg in config.get("sources", {}).get("reddit", []):
        sub = reddit_cfg["subreddit"]
        sort = reddit_cfg.get("sort", "hot")
        time_filter = reddit_cfg.get("time", "day")
        posts = fetch_reddit_rss(sub, sort, time_filter)
        key = f"r_{sub.lower().replace('/', '_')}"
        reddit_data[key] = posts
        time.sleep(0.5)

    # Team-specifieke subreddits uit my_teams
    for team_key in ("primary", "secondary"):
        team = config["my_teams"].get(team_key)
        if not team:
            continue
        sub = team.get("subreddit", "")
        if not sub:
            continue
        posts = fetch_reddit_rss(sub, sort="hot")
        key = f"r_{sub.lower()}"
        reddit_data[key] = posts
        time.sleep(0.5)

    return {
        "last_updated": now,
        "headlines": fresh,
        "reddit": reddit_data,
    }

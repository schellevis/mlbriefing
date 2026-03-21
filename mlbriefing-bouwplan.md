# MLBriefing — Bouwplan

## Wat is het?

Een dagelijkse, Nederlandstalige MLB-briefing als statische website. Elke ochtend haalt een GitHub Action scores, standings en headlines op, laat Claude Haiku er een samenvatting van maken, en publiceert het resultaat via GitHub Pages.

Geen server, geen Docker, geen onderhoud. Git is je database.

---

## Architectuur

Niet alles hoeft even vaak opgehaald te worden. Drie gescheiden workflows:

```
┌─────────────────────────────────────────────────────────┐
│  WORKFLOW 1: Ochtendbriefing (1x/dag, 07:00 CET)       │
│                                                           │
│  Python orchestrator:                                     │
│  ├── MLB Stats API → scores gisteravond, standings        │
│  ├── MLB Stats API → rosters, probable pitchers           │
│  ├── Anthropic API (Haiku 4.5) → briefing in NL          │
│  └── Output → data/daily/YYYY-MM-DD.json                 │
│                                                           │
│  Dit is de "krant" — de volledige dagelijkse samenvatting │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  WORKFLOW 2: Nieuwsfeed (4x/dag: 07, 12, 18, 23 CET)   │
│                                                           │
│  Python script:                                           │
│  ├── ESPN MLB RSS → headlines + excerpts                  │
│  ├── MLB.com RSS → officiele nieuws                       │
│  ├── Reddit r/baseball top/day → trending posts           │
│  ├── Reddit r/NewYorkMets hot → Mets-specifiek            │
│  ├── Reddit r/tampabayrays hot → Rays-specifiek           │
│  ├── Baseball America RSS → prospects                     │
│  └── Output → data/news/YYYY-MM-DD.json (append/merge)   │
│                                                           │
│  Headlines worden gededupliceerd en getagd (AI of regex)  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  WORKFLOW 3: Live scores (elke 30 min, 18-06 CET)       │
│  (optioneel, fase 2 — alleen op gamedays)                │
│                                                           │
│  ├── MLB Stats API → huidige scores + status              │
│  └── Output → data/live/latest.json (overschrijven)       │
│                                                           │
│  Lichtgewicht: geen AI call, alleen data refresh          │
│  ~24 runs/gameday × 1 min = verwaarloosbaar               │
└─────────────────────────────────────────────────────────┘

         │ alle workflows committen naar repo
         ▼

┌─────────────────────────────────────────────────────────┐
│  GitHub Pages (statische React site)                     │
│                                                           │
│  - data/daily/YYYY-MM-DD.json → ochtendbriefing           │
│  - data/news/YYYY-MM-DD.json → headlines feed             │
│  - data/live/latest.json → live scores (als beschikbaar)  │
│  - data/index.json → lijst beschikbare dagen (archief)    │
└─────────────────────────────────────────────────────────┘
```

### Ophaalfrequenties samengevat

| Data | Frequentie | Bron | Workflow |
|------|-----------|------|----------|
| Scores gisteravond | 1x/dag (ochtend) | MLB Stats API | 1 |
| Standings | 1x/dag (ochtend) | MLB Stats API | 1 |
| Rosters/probable pitchers | 1x/dag (ochtend) | MLB Stats API | 1 |
| AI briefing | 1x/dag (ochtend) | Anthropic Haiku | 1 |
| ESPN headlines | 4x/dag | ESPN RSS | 2 |
| MLB.com nieuws | 4x/dag | MLB RSS | 2 |
| Reddit r/baseball trending | 4x/dag | Reddit RSS/API | 2 |
| Reddit r/NewYorkMets | 4x/dag | Reddit RSS | 2 |
| Reddit r/tampabayrays | 4x/dag | Reddit RSS | 2 |
| Live scores (fase 2) | Elke 30 min op gamedays | MLB Stats API | 3 |

---

## Stack

| Component | Technologie | Waarom |
|-----------|------------|--------|
| Data ophalen | Python 3.12 | `python-mlb-statsapi`, `pybaseball`, `feedparser` |
| AI briefing | Anthropic API | Haiku 4.5 (feiten) + Opus 4.6 (analyse) |
| Frontend | React (Vite) | Statisch buildbaar, snel |
| Hosting | GitHub Pages | Gratis bij publieke repo |
| CI/CD | GitHub Actions | Gratis & ongelimiteerd bij publieke repo |
| Database | Git history | Elke dag een JSON commit = gratis tijdreeks |
| Repo | **Publiek** | Gratis Actions, gratis Pages, fork-baar |

**Totale maandelijkse kosten: ~$2.55** (alleen Anthropic API)

> **Let op: publieke repo betekent dat je code én data zichtbaar zijn.**
> Je API keys zijn veilig (die staan in GitHub Secrets, nooit in code).
> De gegenereerde JSON-data en de briefings zijn publiek — maar dat is
> alleen MLB-scores en jouw dashboard. Geen persoonlijke data.

### Secrets & veiligheid

GitHub Secrets zijn versleuteld en nooit zichtbaar in logs, ook niet 
in publieke repo's. Ze zijn alleen beschikbaar voor workflows die 
draaien vanuit de repo zelf (niet vanuit forks — GitHub blokkeert dit 
automatisch bij pull_request events van forks).

**Regels om secrets veilig te houden:**
1. Gebruik ALLEEN `${{ secrets.X }}` in workflow YAML — nooit in code
2. Zet nooit een API key in `config.yaml` of ergens in de repo
3. Gebruik `--dry-run` vlag in scripts om lokaal te testen zonder keys
4. GitHub maskeert automatisch secret-waarden in workflow logs

---

## Data bronnen

### MLB Stats API (gratis, geen key)
- `https://statsapi.mlb.com/api/v1/schedule?date=YYYY-MM-DD&sportId=1&hydrate=linescore,probablePitcher`
- `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026`
- `https://statsapi.mlb.com/api/v1/game/{gameId}/boxscore`
- `https://statsapi.mlb.com/api/v1/teams/{teamId}/roster`
- Via Python wrapper: `python-mlb-statsapi` (PyPI, MIT license)

### ESPN (RSS feeds, gratis)
- MLB headlines: `https://www.espn.com/espn/rss/mlb/news`
- ESPN heeft een officiële RSS-index met MLB-specifieke feeds
- Let op: ESPN ToS staat toe om headlines + excerpts te tonen mits je
  teruglinkt naar espn.com en ESPN als bron vermeldt

### Reddit (RSS of API free tier)
Twee opties, RSS is het simpelst:

**Optie A: RSS (aanbevolen, nul authenticatie)**
- `https://www.reddit.com/r/baseball/top/.rss?t=day` — top posts vandaag
- `https://www.reddit.com/r/NewYorkMets/hot/.rss` — Mets subreddit
- `https://www.reddit.com/r/tampabayrays/hot/.rss` — Rays subreddit
- Voordeel: geen OAuth nodig, geen rate limits, heel simpel
- Nadeel: minder data dan de API (geen upvote counts, comment counts beperkt)

**Optie B: Reddit API free tier (meer data, meer complexiteit)**
- OAuth vereist, 100 requests/minuut
- Via `praw` Python library
- Voordeel: upvotes, comment counts, flair filtering
- Nadeel: OAuth setup, rate limit management
- Voor 3 subreddits 4x/dag heb je ~12 requests nodig — ruim binnen free tier

Advies: **start met RSS** (fase 1), upgrade naar API als je meer data wilt (fase 2).

### Overige RSS feeds
- MLB.com News: `https://www.mlb.com/feeds/news/rss.xml`
- Baseball America: `https://www.baseballamerica.com/feed/`
- MLB Trade Rumors: `https://www.mlbtraderumors.com/feed`

### Anthropic API
- Model: `claude-haiku-4-5-20251001`
- Één call per dag (ochtendbriefing), ~4-6K input tokens, ~800 output tokens
- Optioneel: een tweede call bij de nieuwsfeed om headlines te taggen/filteren
- Geschatte kosten: $0.25-0.50/maand

---

## Projectstructuur

```
mlbriefing/
├── .github/
│   └── workflows/
│       ├── morning-briefing.yml    # 1x/dag, volledige briefing
│       ├── news-feed.yml           # 4x/dag, headlines
│       └── live-scores.yml         # Elke 30 min (fase 2)
├── prototype/
│   └── mlb-dashboard-prototype.jsx # Visueel prototype (design-referentie)
├── scripts/
│   ├── fetch_scores.py             # MLB Stats API: scores + boxscores
│   ├── fetch_standings.py          # Standings + wild card
│   ├── fetch_rosters.py            # Rosters + probable pitchers
│   ├── fetch_news.py               # ESPN + Reddit + MLB.com + BA RSS
│   ├── fetch_live_scores.py        # Live scores (fase 2)
│   ├── generate_briefing.py        # Anthropic API call
│   ├── tag_headlines.py            # Categoriseer headlines (regex/AI)
│   ├── build_daily_data.py         # Orchestrator: ochtendbriefing
│   └── utils/
│       ├── reddit_rss.py           # Reddit RSS parser
│       ├── espn_rss.py             # ESPN RSS parser
│       └── dedup.py                # Headline deduplicatie
├── data/
│   ├── daily/
│   │   ├── 2026-03-26.json         # Volledige dagelijkse briefing
│   │   └── 2026-03-27.json
│   ├── news/
│   │   ├── 2026-03-26.json         # Headlines van die dag (append)
│   │   └── 2026-03-27.json
│   ├── live/
│   │   └── latest.json             # Huidige scores (overschreven)
│   └── index.json                  # Lijst beschikbare dagen
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── TeamCard.jsx
│   │   ├── Scoreboard.jsx
│   │   ├── Standings.jsx
│   │   ├── Headlines.jsx           # Inclusief Reddit trending
│   │   ├── Briefing.jsx
│   │   ├── NewsFeed.jsx            # Doorlopende headlines feed
│   │   └── Archive.jsx
│   ├── hooks/
│   │   └── useData.js
│   └── index.html
├── vite.config.js
├── package.json
├── requirements.txt                # python-mlb-statsapi, pybaseball,
│                                   # feedparser, anthropic, praw (fase 2)
├── CLAUDE.md
└── README.md
```

---

## GitHub Actions Workflows

### Workflow 1: Ochtendbriefing (dagelijks)

```yaml
# .github/workflows/morning-briefing.yml
name: MLBriefing Daily

on:
  schedule:
    - cron: '0 5 * * *'    # 05:00 UTC = 07:00 CET (zomertijd: 06:00)
  workflow_dispatch:

jobs:
  briefing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - name: Generate daily briefing
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: python scripts/build_daily_data.py
      - name: Commit & push
        run: |
          git config user.name "MLBriefing Bot"
          git config user.email "bot@mlbriefing"
          git add data/
          git commit -m "📊 Briefing $(date +%Y-%m-%d)" || exit 0
          git push
      - name: Build & deploy
        run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Workflow 2: Nieuwsfeed (4x per dag)

```yaml
# .github/workflows/news-feed.yml
name: MLB Nieuwsfeed

on:
  schedule:
    - cron: '0 5 * * *'     # 07:00 CET
    - cron: '0 10 * * *'    # 12:00 CET
    - cron: '0 16 * * *'    # 18:00 CET
    - cron: '0 21 * * *'    # 23:00 CET
  workflow_dispatch:

jobs:
  news:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - name: Fetch news from ESPN, Reddit, MLB.com
        run: python scripts/fetch_news.py
      - name: Commit & push
        run: |
          git config user.name "MLBriefing Bot"
          git config user.email "bot@mlbriefing"
          git add data/news/
          git commit -m "📰 News update $(date +%H:%M)" || exit 0
          git push
      - name: Rebuild site
        run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Workflow 3: Live scores (fase 2, optioneel)

```yaml
# .github/workflows/live-scores.yml
name: MLB Live Scores

on:
  schedule:
    # Elke 30 min van 18:00-06:00 CET (16:00-04:00 UTC) — MLB game window
    - cron: '*/30 16-23 * * *'
    - cron: '*/30 0-4 * * *'
  workflow_dispatch:

jobs:
  scores:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - name: Check if gameday & fetch scores
        run: python scripts/fetch_live_scores.py
      - name: Commit & push (alleen als er data is)
        run: |
          git config user.name "MLBriefing Bot"
          git config user.email "bot@mlbriefing"
          git add data/live/
          git diff --cached --quiet || (git commit -m "⚾ Live $(date +%H:%M)" && git push)
      # Geen site rebuild — frontend fetcht live/latest.json direct
```

### GitHub Actions: ongelimiteerd

Publieke repo = gratis en ongelimiteerde Actions-minuten op standaard 
GitHub-hosted runners. Geen budget om je zorgen over te maken.

---

## Dagelijkse JSON structuren

### data/daily/YYYY-MM-DD.json (ochtendbriefing)

```json
{
  "meta": {
    "date": "2026-03-27",
    "generated_at": "2026-03-27T07:02:00+02:00",
    "gameday": 2,
    "season": 2026
  },
  "briefing": "De Mets openden het seizoen met een overtuigende...",
  "teams": {
    "mets": {
      "abbr": "NYM", "result": "W", "score": "6-2",
      "opponent": "ATL", "home": true, "record": "1-0",
      "starter": { "name": "Peralta", "line": "7 IP, 2 ER, 9 K" },
      "key_play": "Lindor 3-run HR (5e)",
      "next_game": { "date": "2026-03-28", "vs": "ATL", "starter": "McLean", "opp_starter": "Fried" }
    },
    "rays": { "...": "zelfde structuur" }
  },
  "scores": [
    {
      "away": "NYY", "home": "SF",
      "away_score": 5, "home_score": 3,
      "status": "Final",
      "note": "Judge 2 HR"
    }
  ],
  "standings": {
    "nl_east": [ { "team": "NYM", "w": 1, "l": 0, "pct": ".000", "gb": "—", "l10": "1-0", "run_diff": "+4" } ],
    "al_east": [ "..." ],
    "nl_wild_card": [ "..." ],
    "al_wild_card": [ "..." ]
  }
}
```

### data/news/YYYY-MM-DD.json (nieuwsfeed, 4x/dag bijgewerkt)

```json
{
  "last_updated": "2026-03-27T18:02:00+02:00",
  "headlines": [
    {
      "title": "Skubal dominant in Opening Day: complete game shutout",
      "source": "espn",
      "url": "https://espn.com/...",
      "published_at": "2026-03-27T06:30:00Z",
      "tag": "must-read",
      "excerpt": "De Tigers-ace was ongenaakbaar..."
    },
    {
      "title": "ABS Challenge System: eerste dag levert 37 challenges op",
      "source": "mlb",
      "url": "https://mlb.com/...",
      "published_at": "2026-03-27T08:00:00Z",
      "tag": "nieuw"
    }
  ],
  "reddit": {
    "r_baseball": [
      {
        "title": "Skubal just threw a Maddux on Opening Day",
        "url": "https://reddit.com/r/baseball/...",
        "score": 4823,
        "comments": 612,
        "flair": "Highlight"
      }
    ],
    "r_newyorkmets": [
      {
        "title": "[Post Game Thread] Mets 6 - Braves 2",
        "url": "https://reddit.com/r/NewYorkMets/...",
        "score": 892,
        "comments": 341
      }
    ],
    "r_tampabayrays": [
      {
        "title": "Caminero's first HR of 2026",
        "url": "https://reddit.com/r/tampabayrays/...",
        "score": 234,
        "comments": 67
      }
    ]
  }
}
```

---

## AI Pipeline (twee lagen)

De briefing wordt in twee stappen gegenereerd:

```
Stap 1: Data verzamelen & voorbereiden (Python, geen AI)
├── MLB Stats API → boxscores, linescore
├── Baseball Savant / pybaseball → pitch-level data per pitcher
│   (velocity, whiff%, CSW%, barrel%, spin rate)
├── pybaseball → vergelijk met vorige starts (seizoensgemiddelde)
├── Reddit r/NewYorkMets + r/tampabayrays → top post-game comments
├── ESPN RSS → relevante artikelen (titels + excerpts)
└── Output: structured_context.json (~3-5K tokens)

Stap 2a: Data-samenvatting (Haiku 4.5, goedkoop)
├── Input: boxscores + scores + standings
├── Output: feitelijke samenvatting (wie won, score, linescore)
└── Kosten: ~$0.005/dag

Stap 2b: Analyse & inzichten (Opus 4.6, slim + goede schrijfstijl)
├── Input: structured_context.json met:
│   ├── Pitch-level stats van Mets/Rays starters
│   ├── Vergelijking met seizoensgemiddelde / vorige starts
│   ├── Top Reddit-sentiment (wat valt fans op)
│   ├── ESPN headline-context
│   └── Haiku's feitelijke samenvatting
├── Output: 2-3 inzichten die je niet uit de boxscore haalt
└── Kosten: ~$0.07/dag (Opus — minder dan een euro verschil met Sonnet, betere schrijfstijl)
```

### Voorbeeld output Sonnet-analyse

> **Inzichten**
> - Peralta's slider had 41% whiff rate (seizoensgemiddelde: 36%). Zijn spin rate was 2680 rpm, 80 rpm hoger dan in Milwaukee vorig jaar — mogelijk effect van de Mets' pitching development.
> - Bichette sloeg 3 van 4 balls naar het tegenovergestelde veld. Vorig seizoen in Toronto was dat 22% — hij lijkt bewust zijn approach aan te passen voor meer contact.
> - Reddit r/NewYorkMets is unaniem positief over Williams' negende inning, maar meerdere fans merkten op dat zijn fastball op 93.2 mph zat versus zijn career-gemiddelde van 95.8. Iets om te volgen.

### Opus analyse-prompt

```python
ANALYSIS_SYSTEM = """Je bent een analytische MLB-columnist die schrijft 
voor een Nederlandse fan met bovengemiddelde honkbalkennis. 

Je taak: lever 2-3 inzichten die NIET uit de boxscore te halen zijn.
Focus op:
- Pitch-level trends (velocity changes, whiff rate vs gemiddelde)
- Approach changes (pull% vs oppo%, chase rate shifts)
- Vergelijking met vorige starts of seizoensgemiddelde
- Wat fans op Reddit opvalt (sentiment, zorgen, hype)
- Context uit ESPN/Athletic artikelen

Stijl:
- Kort en puntig, max 150 woorden totaal
- Elk inzicht begint met een concreet datapunt
- Nederlands, informeel maar analytisch
- Geen herhaling van de feitelijke samenvatting
"""

ANALYSIS_USER = f"""Analyseer de MLB-nacht van {date}.

FEITELIJKE SAMENVATTING (door Haiku):
{haiku_summary}

METS PITCHER STATCAST:
{mets_pitcher_statcast}
Vergelijking vorige starts: {mets_pitcher_trend}

RAYS PITCHER STATCAST:
{rays_pitcher_statcast}
Vergelijking vorige starts: {rays_pitcher_trend}

REDDIT SENTIMENT:
r/NewYorkMets top comments: {mets_reddit}
r/tampabayrays top comments: {rays_reddit}

ESPN CONTEXT:
{espn_headlines_with_excerpts}
"""
```

### Statcast data via pybaseball

```python
from pybaseball import statcast_pitcher, playerid_lookup

# Haal pitch-by-pitch data op voor gisteravond
def get_pitcher_statcast(player_name, game_date):
    player = playerid_lookup(player_name.split()[-1], player_name.split()[0])
    mlbam_id = player.iloc[0]['key_mlbam']
    data = statcast_pitcher(game_date, game_date, mlbam_id)
    
    return {
        "pitches": len(data),
        "avg_velo_ff": data[data.pitch_type == 'FF']['release_speed'].mean(),
        "avg_velo_sl": data[data.pitch_type == 'SL']['release_speed'].mean(),
        "whiff_rate": len(data[data.description.str.contains('swinging_strike')]) / len(data),
        "csw_rate": len(data[data.description.isin([
            'called_strike', 'swinging_strike', 'swinging_strike_blocked'
        ])]) / len(data),
        "barrel_rate": data['launch_speed_angle'].apply(
            lambda x: 1 if x == 6 else 0
        ).mean() if 'launch_speed_angle' in data else None,
        "avg_exit_velo": data['launch_speed'].mean(),
    }
```

### Kosten per maand

| Component | Calls/dag | Kosten/dag | Kosten/maand |
|-----------|----------|-----------|-------------|
| Haiku 4.5 (samenvatting) | 1 | $0.005 | $0.15 |
| Opus 4.6 (analyse + schrijfstijl) | 1 | $0.07 | $2.10 |
| Haiku 4.5 (headline tagging, optioneel) | 4 | $0.01 | $0.30 |
| **Totaal** | | | **~$2.55** |

Geen GitHub Pro nodig. Publieke repo = gratis Actions + gratis Pages.

---

## Fases

### Fase 1: MVP (bouwen vóór Opening Day of eerste week seizoen)
- [ ] Python scripts: scores, standings, headlines ophalen
- [ ] Anthropic API integratie voor briefing
- [ ] Dagelijkse JSON generatie
- [ ] GitHub Actions workflow
- [ ] React frontend met TeamCards, Scoreboard, Standings, Briefing
- [ ] GitHub Pages deployment
- [ ] Archief pagina (lijst van eerdere dagen)

### Fase 2: Polish (april)
- [ ] Betere headline-tagging (AI classificeert headlines als must-read/prospect/trade)
- [ ] Standings trend (sparkline: W-L over laatste 10 games)
- [ ] Off-day handling (geen wedstrijden = geen briefing, of kort bericht)
- [ ] Error handling + fallback als API down is
- [ ] Mobile responsive fine-tuning

### Fase 3: Playoff Picture (juni/juli)
- [ ] Wild card standings toevoegen
- [ ] Playoff kansen berekening (simpel pythagorean model)
- [ ] "Richting Oktober" sectie in briefing prompt
- [ ] Clinch/elimination scenarios

### Fase 4: Postseason (oktober)
- [ ] Bracket visualisatie
- [ ] Series-status tracking
- [ ] Verhoogde update-frequentie (na elke wedstrijd?)

---

## Build advies

### Aanbevolen: GitHub Copilot coding agent

Dit project leent zich goed voor de Copilot coding agent — het is 
asynchroon (je maakt een issue, Copilot bouwt, opent een PR) en 
het is een relatief afgebakend full-stack project.

**Hoe:** maak per fase een GitHub Issue met duidelijke beschrijving,
wijs het toe aan Copilot, en laat het bouwen. Review de PR, merge, 
volgende issue.

**Model:** Claude Sonnet 4.6 via de Copilot model picker. 
Dat is 1x premium request multiplier — goed genoeg voor dit project 
en zuinig met je budget. Sonnet 4.6 is sterk in agentic coding en 
zoekoperaties, precies wat je nodig hebt.

Gebruik NIET Opus voor de build zelf — de 3x multiplier vreet door 
je premium requests heen en levert voor code-generatie geen 
merkbaar betere resultaten op dan Sonnet.

**Premium request budget (Pro plan):** 300/maand. Dit project kost 
geschat 30-60 premium requests totaal voor fase 1, afhankelijk van 
hoeveel iteraties nodig zijn. Ruim voldoende.

### Alternatief: Claude Code

Als je interactiever wilt werken (prompt → bekijk → tweak → herhaal), 
is Claude Code vanuit de terminal sterker. Gebruik Sonnet 4.6 voor de 
bulk, Opus alleen voor de AI-prompt tuning (daar merk je het verschil).

### Model per taak

| Taak | Build tool | Build model | Waarom |
|------|-----------|-------------|--------|
| Projectstructuur + boilerplate | Copilot agent | Sonnet 4.6 (1x) | Standaard, snel |
| Python data-fetching scripts | Copilot agent | Sonnet 4.6 (1x) | API integraties |
| React frontend | Copilot agent | Sonnet 4.6 (1x) | Component werk |
| AI briefing-prompt tunen | Claude Code | Opus 4.6 | Schrijfstijl, nuance |
| GitHub Actions workflows | Copilot agent | Sonnet 4.6 (1x) | YAML config |
| Debug & edge cases | Claude Code of Copilot | Sonnet 4.6 | Iteratief |

---

## Fork-baarheid

Dit project is ontworpen zodat iemand anders het makkelijk kan forken 
en aanpassen naar eigen teams. Alle team-specifieke config staat in 
één bestand:

### config.yaml (root van de repo)

```yaml
# MLBriefing — Configuratie
# Fork dit project en pas dit bestand aan voor je eigen teams.

# Jouw teams (team abbreviations: https://statsapi.mlb.com/api/v1/teams?sportId=1)
my_teams:
  primary:
    abbr: "NYM"
    name: "New York Mets"
    subreddit: "NewYorkMets"
    color: "#FF5910"
  secondary:
    abbr: "TB"
    name: "Tampa Bay Rays"
    subreddit: "tampabayrays"
    color: "#8FBCE6"

# Welke divisions volg je? (voor standings)
divisions:
  - "NL East"    # primary team
  - "AL East"    # secondary team

# Tijdzone & kijktijden
timezone: "Europe/Amsterdam"
watch_thresholds:
  watchable_before: "20:30"   # groen: hele wedstrijd kijkbaar
  maybe_before: "21:30"       # geel: begin meepakken
  # alles daarna: nacht

# AI instellingen
ai:
  briefing_model: "claude-haiku-4-5-20251001"    # feitelijke samenvatting
  analysis_model: "claude-opus-4-6-20250207"     # inzichten & schrijfstijl
  language: "nl"                                  # briefing taal
  max_briefing_words: 80                          # kort en puntig
  max_analysis_words: 150                         # 2-3 inzichten

# Data bronnen
sources:
  rss:
    - url: "https://www.espn.com/espn/rss/mlb/news"
      name: "ESPN"
    - url: "https://www.mlb.com/feeds/news/rss.xml"
      name: "MLB"
    - url: "https://www.baseballamerica.com/feed/"
      name: "BA"
    - url: "https://www.mlbtraderumors.com/feed"
      name: "MLBTR"
  reddit:
    - subreddit: "baseball"
      sort: "top"
      time: "day"
    # Team subs worden automatisch toegevoegd vanuit my_teams

# Scheduling (UTC cron)
schedule:
  briefing: "0 5 * * *"      # 07:00 CET
  news:
    - "0 5 * * *"             # 07:00 CET
    - "0 10 * * *"            # 12:00 CET
    - "0 16 * * *"            # 18:00 CET
    - "0 21 * * *"            # 23:00 CET
```

### Wat moet iemand doen om te forken?

1. Fork de repo
2. Edit `config.yaml` — verander teams, tijdzone, taal
3. Voeg `ANTHROPIC_API_KEY` toe als repo secret
4. Enable GitHub Pages
5. Klaar — de workflows draaien automatisch

Alle Python scripts lezen uit `config.yaml`. Geen hardcoded team names, 
geen hardcoded tijdzones, geen hardcoded subreddits.

De AI-prompts gebruiken de taal en teamnamen uit de config:
```python
import yaml

config = yaml.safe_load(open("config.yaml"))
primary = config["my_teams"]["primary"]["name"]
language = config["ai"]["language"]
# → prompt wordt automatisch in de juiste taal, over de juiste teams
```

---

## Fases

### Fase 1: MVP (eerste week seizoen)
- [ ] `config.yaml` met alle configuratie
- [ ] Python scripts: scores, standings, schedule ophalen
- [ ] Statcast data via pybaseball (Mets/Rays starters)
- [ ] RSS feeds: ESPN, MLB.com, Reddit (RSS-modus)
- [ ] AI pipeline: Haiku samenvatting + Opus analyse
- [ ] Dagelijkse JSON generatie + GitHub Actions workflow
- [ ] React frontend: TeamCards, Scoreboard, Standings, Briefing, Headlines
- [ ] Kijken-tab met CET-tijden en drie-tier systeem
- [ ] GitHub Pages deployment
- [ ] Archief pagina

### Fase 2: Polish (april)
- [ ] Nieuwsfeed workflow (4x/dag)
- [ ] Reddit API upgrade (van RSS naar praw, voor upvotes/comments)
- [ ] Headline tagging door Haiku (must-read/prospect/trade/injury)
- [ ] Standings trend sparklines
- [ ] Off-day handling
- [ ] Error handling + fallback
- [ ] Mobile responsive
- [ ] Live scores workflow (optioneel)

### Fase 3: Vergelijkingen & trends (mei)
- [ ] Pitcher start-vergelijking (huidige start vs seizoensgemiddelde)
- [ ] Team rolling stats (laatste 10/30 dagen)
- [ ] Batter hot/cold streaks voor Mets/Rays

### Fase 4: Playoff Picture (juni/juli)
- [ ] Wild card standings
- [ ] Pythagorean W-L + playoff kansen
- [ ] "Richting Oktober" sectie in Opus-prompt
- [ ] Clinch/elimination scenarios

### Fase 5: Postseason (oktober)
- [ ] Bracket visualisatie
- [ ] Series-status tracking
- [ ] Verhoogde frequentie

### Fase 6: Offseason-modus (november)
- [ ] Seizoensdetectie (auto switch regulier/postseason/offseason)
- [ ] Wekelijkse briefing in plaats van dagelijks
- [ ] Transactie-tracking (trades, signings)
- [ ] Free agent tracker voor Mets/Rays-relevante spelers
- [ ] MLB Trade Rumors RSS toevoegen
- [ ] Spring training schema + kijktijden (februari)

---

## Secrets (veilig in publieke repo)

Alle API keys worden opgeslagen als GitHub Encrypted Secrets. Deze zijn:
- Versleuteld in rust en alleen beschikbaar tijdens workflow-executie
- Niet zichtbaar in logs (GitHub maskeert ze automatisch)
- Niet beschikbaar voor workflows getriggerd door forks (bescherming 
  tegen kwaadwillende PRs)

### Benodigde secrets

| Secret | Waarde | Nodig vanaf |
|--------|--------|------------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Fase 1 |
| `REDDIT_CLIENT_ID` | Reddit app client ID | Fase 2 |
| `REDDIT_CLIENT_SECRET` | Reddit app secret | Fase 2 |

**Toevoegen:** repo → Settings → Secrets and variables → Actions → 
New repository secret

### Beveiligingsregels in de code

```python
# ✅ GOED — key uit environment variable
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("Geen API key gevonden, skip AI briefing")
    # genereer data-only versie zonder briefing

# ❌ FOUT — nooit hardcoden
api_key = "sk-ant-..."  # NOOIT DOEN
```

```yaml
# ✅ GOED — secret in workflow
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

# ❌ FOUT — key in config of code
env:
  ANTHROPIC_API_KEY: "sk-ant-..."  # NOOIT DOEN
```

MLB Stats API, Baseball Savant, en Reddit RSS hebben geen keys nodig.

---

## Valkuilen & aandachtspunten

1. **Cron timing**: GitHub Actions cron is UTC en kan 5-15 minuten 
   afwijken. Plan op 05:00 UTC zodat het ruim voor 07:00 CET klaar is.

2. **Geen wedstrijden**: Off-days, All-Star break, regenouts. Script 
   moet graceful omgaan met lege data ("Geen wedstrijden vandaag. 
   Morgen: Mets vs Phillies, Peralta op de heuvel.").

3. **pybaseball rate limiting**: Baseball Savant limiteert requests tot 
   ~30.000 rijen. Voor dagelijks 2 pitchers is dat geen probleem, maar 
   bouw er een retry met backoff in.

4. **Anthropic API failure**: Fallback naar data-only versie (scores + 
   standings zonder AI-samenvatting). De site moet altijd werken, ook 
   als de AI-call faalt.

5. **Git repo groei**: ~5KB/dag × 180 dagen = ~900KB/seizoen. 
   Verwaarloosbaar. Na een paar seizoenen eventueel oude data archiveren.

6. **Offseason-modus**: Zie sectie "Offseason" hieronder — niet uitzetten, 
   maar omschakelen naar een andere cadans en andere bronnen.

7. **Zomer/wintertijd**: CET vs CEST. De config gebruikt `Europe/Amsterdam` 
   en Python's `zoneinfo` handelt dit af — maar test dit rond de 
   tijdwisselingen (laatste zondag maart/oktober).

8. **Reddit RSS betrouwbaarheid**: Reddit RSS feeds zijn soms traag of 
   incompleet. Bouw een timeout in en laat het niet de hele pipeline blokkeren.

9. **Jargon vermijden**: De briefing is voor een fan die honkbal volgt maar 
   niet per se alle afkortingen kent. Zie de sectie "Schrijfstijl" hieronder.

---

## Schrijfstijl & jargon

De AI-briefing moet leesbaar zijn zonder Baseball Reference open te hebben. 
Dit betekent: **geen onverklaarde afkortingen**. 

Voeg dit toe aan de AI-prompts:

```
Schrijfregels:
- Geen onverklaarde afkortingen. Niet "CGSO" maar "complete game shutout 
  (alle 9 innings gegooid zonder runs)". Na eerste verklaring mag je de 
  afkorting gebruiken.
- Niet "7 IP, 2 ER, 9 K" als lopende tekst. Wel: "7 innings, 2 verdiende 
  runs, 9 strikeouts". In data-velden (team card, scorebord) zijn korte 
  notaties prima — daar verwacht de lezer ze.
- Gebruik Nederlandse termen waar het kan: "slagbeurt" ipv "at-bat", 
  "thuisplaat" ipv "home plate". Maar laat gangbaar Engels staan waar 
  het raar klinkt in het Nederlands: "homerun", "strikeout", "bullpen" 
  hoeven niet vertaald.
- Leg Statcast-termen uit bij eerste gebruik: "whiff rate (percentage 
  gemiste swings)" en "exit velocity (hoe hard de bal van het slaghout 
  komt)".
```

In de **data-velden** (team cards, scorebord) zijn afkortingen wél prima — 
die lees je als een tabel, niet als tekst:
- Team card: `Peralta 7IP 2ER 9K` → dit is compact data-display, oké
- Briefing tekst: "Peralta gooide 7 sterke innings met 9 strikeouts" → dit is proza

---

## Offseason (november - maart)

De offseason is niet stil — het is een van de drukste periodes. Free agency, 
trades, Winter Meetings, Rule 5 Draft, spring training, en soms de WBC. 
MLBriefing schakelt automatisch om.

### Offseason-kalender

| Periode | Wat gebeurt er |
|---------|---------------|
| Nov 1-15 | Free agency begint, qualifying offers, options |
| Nov-dec | Winter Meetings, grote trades en signings |
| Dec-jan | Free agency bulk, internationale signings |
| Feb | Pitchers & catchers rapporteren, spring training |
| Mrt | Spring training wedstrijden, WBC (om de 3 jaar) |
| Eind mrt | Opening Day |

### Offseason-modus in config.yaml

```yaml
# Automatische seizoensdetectie op basis van MLB schedule API
# OF handmatig forceren:
mode: "auto"  # "auto" | "regular_season" | "offseason" | "postseason"
```

### Wat verandert er?

| | Regulier seizoen | Offseason |
|---|---|---|
| **Ochtendbriefing** | Dagelijks, 07:00 | 1x per week (zondag) |
| **Nieuwsfeed** | 4x per dag | 2x per dag |
| **Scores/standings** | Dagelijks | Uit |
| **Kijken-tab** | Aankomende games | Spring training schema (feb-mrt) |
| **AI focus** | Wedstrijdanalyse + Statcast | Trades, signings, rosters |
| **Bronnen** | ESPN, Reddit, Savant | + MLB Trade Rumors RSS |

### Offseason AI-prompt (Opus)

```python
OFFSEASON_SYSTEM = """Je bent een analytische MLB-columnist die een 
wekelijkse offseason-update schrijft voor een Nederlandse fan die de 
Mets en Rays volgt.

Focus op:
- Belangrijkste trades en signings van de week
- Impact op de Mets en Rays roster
- Free agents die nog beschikbaar zijn en waar ze passen
- Prospect rankings en callups
- Spring training observaties (feb-mrt)
- Schrijf in het Nederlands, vermijd jargon (zie schrijfregels)
- Maximaal 250 woorden
"""
```

### Offseason nieuwsfeed-bronnen

Voeg toe aan `config.yaml` (alleen actief in offseason):

```yaml
sources:
  offseason_rss:
    - url: "https://www.mlbtraderumors.com/feed"
      name: "MLBTR"
      priority: high    # Dé bron voor trades/signings
    - url: "https://www.baseballamerica.com/feed/"
      name: "BA" 
      priority: medium  # Prospects
```

### Offseason data-structuur

```json
{
  "meta": {
    "date": "2026-11-15",
    "mode": "offseason",
    "week": 3
  },
  "briefing": "Grote week voor de Mets: Stearns haalde...",
  "transactions": [
    {
      "date": "2026-11-14",
      "type": "signing",
      "player": "Player Name",
      "from": "Free Agent",
      "to": "NYM",
      "details": "3 jaar, $45M",
      "impact": "high"
    }
  ],
  "free_agents": {
    "relevant": [
      { "player": "...", "position": "SP", "status": "unsigned" }
    ]
  }
}
```

### Seizoensdetectie

```python
from datetime import date
import mlbstatsapi

def detect_mode():
    """Check MLB schedule API voor huidige seizoensfase."""
    mlb = mlbstatsapi.Mlb()
    today = date.today()
    
    try:
        schedule = mlb.get_schedule(date=str(today))
        if schedule and any(g.games for g in schedule.dates):
            return "regular_season"
    except:
        pass
    
    # Check of we in de postseason zitten
    if today.month == 10 or (today.month == 11 and today.day < 5):
        return "postseason"
    
    # Check spring training (feb-mrt)
    if today.month in (2, 3):
        return "spring_training"
    
    return "offseason"
```

---

## CLAUDE.md

Dit bestand komt in de root van de repo en instrueert elke AI coding 
agent (Claude Code, Copilot, Codex) hoe het project werkt.

```markdown
# MLBriefing

Dagelijks MLB-dashboard met AI-briefing. GitHub Actions + Pages, geen server.

## Architectuur
- `scripts/` — Python data-fetching + AI briefing generatie
- `src/` — React frontend (Vite)
- `data/` — JSON output per dag (git = database)
- `.github/workflows/` — 3 scheduled workflows
- `config.yaml` — alle team/schedule/AI configuratie
- `mlbriefing-bouwplan.md` — volledige specificatie en design decisions

## Design-referentie
Het bestand `prototype/mlb-dashboard-prototype.jsx` is het visuele 
prototype. Dit definieert:
- Kleurenpalet (donker thema, #09090b achtergrond)
- Typografie (Playfair Display, IBM Plex Sans, JetBrains Mono)
- Component-structuur (TeamCard, Scoreboard, Standings, Headlines, etc.)
- Layout en spacing
- Kijktijden drie-tier systeem (kijkbaar/twijfel/nacht)
- Tab-navigatie (Vandaag / Kijken / Nieuws / Archief)
- Team-kleuren (NYM: #FF5910, TB: #8FBCE6)

De productie-frontend moet dit prototype zo dicht mogelijk volgen qua 
look & feel. Gebruik het als visuele waarheid — niet afwijken tenzij 
er een goede reden is.

## Conventies
- Python 3.12, type hints, f-strings
- React functionele componenten, hooks, geen class components
- Inline styles (geen CSS modules) — het prototype definieert de stijl
- Alle team-specifieke waarden komen uit config.yaml, NOOIT hardcoden
- JSON bestanden in data/ worden door workflows geschreven, niet handmatig
- Frontend leest alleen uit data/, maakt nooit API calls zelf
- Google Fonts laden via <link> in index.html, niet via npm packages

## Config-driven
Alles draait om config.yaml. Als je een team, tijdzone, of AI-model 
wilt veranderen, doe dat daar. Scripts importeren config als eerste stap.

## AI Pipeline
1. Haiku 4.5: feitelijke samenvatting van scores
2. Opus 4.6: analytische inzichten met Statcast data + Reddit sentiment
   Prompt templates staan in scripts/prompts/

## Schrijfstijl AI-briefings
- Geen onverklaarde afkortingen in lopende tekst
- "7 sterke innings met 9 strikeouts", niet "7 IP, 9 K"
- Statcast-termen uitleggen bij eerste gebruik
- Nederlands waar het kan, gangbaar Engels laten staan (homerun, bullpen)
- In data-velden (team cards, scorebord) zijn korte notaties WEL prima

## Testen
- `python scripts/build_daily_data.py --dry-run` test de hele pipeline 
  zonder te committen
- `npm run dev` voor lokale frontend development
- `npm run build` voor productie build

## Belangrijk
- De frontend moet ALTIJD werken, ook als AI-calls falen
- Bouw fallbacks in voor elke externe dependency
- data/ bestanden zijn append-only per dag, nooit overschrijven
- API keys staan ALLEEN in GitHub Secrets, NOOIT in code of config
```

---

## Aan de slag

1. Maak een publieke repo `MLBriefing` op GitHub
2. Push de volgende bestanden:
   - `mlbriefing-bouwplan.md` (volledige specificatie)
   - `README.md` (setup-instructies + fork-guide)
   - `CLAUDE.md` (instructies voor AI coding agents)
   - `prototype/mlb-dashboard-prototype.jsx` (visueel prototype)
3. Voeg `ANTHROPIC_API_KEY` toe als repo secret
4. Maak een eerste issue: "Fase 1: MVP — data pipeline + frontend"
5. Wijs toe aan Copilot coding agent (model: Claude Sonnet 4.6)
6. Review de PR, test met `--dry-run`, merge
7. Enable GitHub Pages (Settings → Pages → Source: GitHub Actions)
8. Geniet van je ochtendbriefing

# ⚾ MLBriefing

Dagelijks MLB-dashboard met AI-briefing, Statcast-inzichten, en kijktijden voor Europese fans. Gebouwd op GitHub Actions + Pages — geen server nodig.

**[→ Live demo](https://jouw-username.github.io/mlbriefing)** *(beschikbaar zodra je het hebt opgezet)*

## Wat doet het?

Elke ochtend om 07:00 draait een GitHub Action die:

1. **Scores** ophaalt van gisteravond (MLB Stats API)
2. **Standings** bijwerkt (divisie + wild card)
3. **Statcast data** ophaalt voor jouw teams (pitch velocity, whiff rates via Baseball Savant)
4. **Headlines** verzamelt van ESPN, MLB.com, Reddit (4x per dag)
5. **AI-briefing** genereert in het Nederlands (Haiku voor feiten, Opus voor analyse)
6. Alles publiceert als een **statische site** op GitHub Pages

Je opent het 's ochtends en ziet in 30 seconden wat je gemist hebt.

### Features

- 🏟️ **Team cards** — Mets & Rays (of jouw teams) met scores, starters, key plays
- 📊 **Compact scorebord** — alle uitslagen, winnaar vet, opvallende prestaties
- 📈 **Standings** — NL East, AL East, wild card picture
- 🧠 **AI-inzichten** — Statcast-analyse, Reddit-sentiment, niet-uit-de-boxscore conclusies
- 📺 **Kijktijden** — aankomende games in CET met kijkbaar/twijfel/nacht indicator
- 📰 **Nieuwsfeed** — ESPN + Reddit trending, 4x per dag bijgewerkt
- 📁 **Archief** — elke dag opgeslagen als JSON in git history

## Snel opzetten (5 minuten)

### 1. Fork deze repo

Klik op **Fork** rechtsboven. Je hebt nu je eigen kopie.

### 2. Pas `config.yaml` aan

Dit is het enige bestand dat je hoeft te veranderen:

```yaml
my_teams:
  primary:
    abbr: "NYM"           # Verander naar jouw team
    name: "New York Mets"
    subreddit: "NewYorkMets"
    color: "#FF5910"
  secondary:
    abbr: "TB"             # Of verwijder als je maar 1 team volgt
    name: "Tampa Bay Rays"
    subreddit: "tampabayrays"
    color: "#8FBCE6"

timezone: "Europe/Amsterdam"  # Jouw tijdzone

watch_thresholds:
  watchable_before: "20:30"   # Groen: hele wedstrijd kijkbaar
  maybe_before: "21:30"       # Geel: begin meepakken

ai:
  language: "nl"              # Of "en" voor Engels
```

Team-afkortingen vind je op: `https://statsapi.mlb.com/api/v1/teams?sportId=1`

### 3. Voeg je API key toe

Je hebt alleen een Anthropic API key nodig ($2.55/maand aan tokens).

1. Maak een key aan op [console.anthropic.com](https://console.anthropic.com)
2. Ga naar je repo → **Settings** → **Secrets and variables** → **Actions**
3. Klik **New repository secret**
4. Name: `ANTHROPIC_API_KEY`, Value: je key

> ⚠️ **Zet je API key NOOIT in code of config bestanden.** GitHub Secrets
> zijn versleuteld en niet zichtbaar in logs, ook niet in publieke repo's.

### 4. Enable GitHub Pages

1. Ga naar repo → **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Klaar — de site wordt automatisch gebouwd bij elke commit

### 5. Trigger de eerste run

Ga naar **Actions** → **MLBriefing Daily** → **Run workflow** → **Run**.

Na 2-3 minuten is je eerste briefing live op `https://jouw-username.github.io/mlbriefing`.

## Hoe het werkt

```
GitHub Actions (scheduled)
├── 07:00 CET  Ochtendbriefing (scores + standings + Statcast + AI)
├── 4x/dag     Nieuwsfeed (ESPN + Reddit + MLB.com RSS)
└── (optioneel) Live scores elke 30 min op gamedays

→ Output: JSON bestanden in data/
→ Commit naar repo (git = database)
→ GitHub Pages herbouwt automatisch
→ Statische React site toont de data
```

### Kosten

| Component | Kosten |
|-----------|--------|
| GitHub Actions | **Gratis** (publieke repo = ongelimiteerd) |
| GitHub Pages | **Gratis** (publieke repo) |
| Anthropic API | **~$2.55/maand** |
| MLB Stats API | Gratis (geen key nodig) |
| Baseball Savant | Gratis (via pybaseball) |
| Reddit RSS | Gratis (geen key nodig) |
| ESPN RSS | Gratis |

## Projectstructuur

```
mlbriefing/
├── config.yaml                  ← PAS DIT AAN
├── .github/workflows/
│   ├── morning-briefing.yml     Dagelijkse briefing
│   ├── news-feed.yml            Headlines 4x/dag
│   └── live-scores.yml          Live scores (optioneel)
├── scripts/
│   ├── build_daily_data.py      Orchestrator
│   ├── fetch_scores.py          MLB Stats API
│   ├── fetch_standings.py       Standings
│   ├── fetch_news.py            ESPN + Reddit + MLB RSS
│   ├── generate_briefing.py     Haiku + Opus AI pipeline
│   └── prompts/                 AI prompt templates
├── data/
│   ├── daily/YYYY-MM-DD.json    Dagelijkse briefings
│   ├── news/YYYY-MM-DD.json     Headlines per dag
│   └── live/latest.json         Live scores
├── src/                         React frontend
├── CLAUDE.md                    Instructies voor AI coding agents
└── README.md                    Dit bestand
```

## Aanpassen

### Andere teams volgen
Edit `config.yaml` → `my_teams`. Alles past zich automatisch aan:
subreddits, standings, team kleuren, AI-briefing focus.

### Andere tijdzone
Edit `config.yaml` → `timezone`. Kijktijden worden automatisch omgerekend.

### Andere taal
Edit `config.yaml` → `ai.language`. De AI-briefing wordt in die taal gegenereerd.

### Meer/minder bronnen
Edit `config.yaml` → `sources.rss` en `sources.reddit` om feeds toe te
voegen of te verwijderen.

## Veiligheid

Dit is een **publieke repo**. Dat betekent:
- ✅ Code is zichtbaar — dat is open source, prima
- ✅ Data (scores, briefings) is zichtbaar — dat is publieke MLB-data
- ✅ API keys zijn **niet** zichtbaar — die staan in GitHub Secrets
- ✅ Secrets zijn niet beschikbaar voor fork-PRs
- ❌ Zet **nooit** een API key in een bestand in de repo

## Lokaal ontwikkelen

```bash
# Clone
git clone https://github.com/jouw-username/mlbriefing.git
cd mlbriefing

# Python setup
pip install -r requirements.txt

# Test de data pipeline (zonder AI, zonder commit)
python scripts/build_daily_data.py --dry-run

# Test mét AI
export ANTHROPIC_API_KEY="sk-ant-..."
python scripts/build_daily_data.py --dry-run

# Frontend
npm install
npm run dev     # → http://localhost:5173
```

## Technologie

- **Data**: MLB Stats API, Baseball Savant (pybaseball), ESPN RSS, Reddit RSS
- **AI**: Anthropic Haiku 4.5 (feiten) + Opus 4.6 (analyse & schrijfstijl)
- **Frontend**: React + Vite
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (scheduled workflows)
- **Database**: Git history (elke dag een JSON commit)

## Credits

Gebouwd met ❤️ en ☕ vanuit Nederland, waar MLB-wedstrijden midden in de nacht zijn.

Data: [MLB Stats API](https://statsapi.mlb.com) · [Baseball Savant](https://baseballsavant.mlb.com) · [ESPN](https://espn.com) · [Reddit](https://reddit.com)
AI: [Anthropic Claude](https://anthropic.com)

## Licentie

MIT — fork het, pas het aan, maak het je eigen.

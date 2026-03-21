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

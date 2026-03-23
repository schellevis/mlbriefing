import { useState } from 'react'
import { useData } from './hooks/useData.js'
import TeamCard from './components/TeamCard.jsx'
import Scoreboard from './components/Scoreboard.jsx'
import Standings from './components/Standings.jsx'
import Headlines from './components/Headlines.jsx'
import WatchTab from './components/WatchTab.jsx'
import NewsTab from './components/NewsTab.jsx'
import Archive from './components/Archive.jsx'

const s = "'IBM Plex Sans',-apple-system,sans-serif"
const m = "'JetBrains Mono',monospace"
const p = "'Playfair Display',Georgia,serif"

const TABS = [
  ['now', 'Vandaag'],
  ['watch', 'Kijken'],
  ['news', 'Nieuws'],
  ['arc', 'Archief'],
]

// Haal team-configuratie op uit de statische config die in de build is ingebakken.
// In productie wordt dit geladen vanuit /data/config.json of we embed het hier.
// Voor nu: teams worden gelezen uit de daily JSON (teams object).
function extractMyTeams(daily) {
  if (!daily || !daily.teams) return []
  return Object.values(daily.teams).map(t => ({
    abbr: t.abbr,
    color: t.color || '#888',
  }))
}

export default function App() {
  const [tab, setTab] = useState('now')
  const { index, daily, news, loading, error, activeDate, setActiveDate } = useData()

  const myTeams = extractMyTeams(daily)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0c',
      color: '#ddd',
      fontFamily: s,
      maxWidth: 720,
      margin: '0 auto',
      padding: '0 16px',
    }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 0 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontFamily: p, fontSize: 22, fontWeight: 900, margin: 0, color: '#e8e8e8' }}>
            MLBriefing
          </h1>
          <span style={{ fontSize: 12, color: '#666', fontFamily: m }}>
            {daily?.meta?.date_display
              ? `${daily.meta.date_display} · ${daily.meta.gen_time}`
              : activeDate || '—'}
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 0, marginTop: 10 }}>
          {TABS.map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === k ? '2px solid #FF5910' : '2px solid transparent',
                color: tab === k ? '#ddd' : '#555',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: s,
              }}
            >
              {v}
            </button>
          ))}
        </nav>
      </header>

      {/* Laadstatus */}
      {loading && (
        <div style={{ padding: '30px 0', textAlign: 'center', color: '#444', fontFamily: m, fontSize: 12 }}>
          laden…
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px 0' }}>
          <div style={{
            padding: 12, background: 'rgba(244,67,54,0.06)',
            border: '1px solid rgba(244,67,54,0.15)', borderRadius: 4,
            fontSize: 12, color: '#888',
          }}>
            {error}
          </div>
        </div>
      )}

      {/* Tab: Vandaag */}
      {!loading && tab === 'now' && (
        <div style={{ paddingBottom: 30 }}>
          {/* Briefing */}
          {daily?.briefing && (
            <div style={{
              padding: '14px 0 12px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: 13, color: '#999', lineHeight: 1.6, fontWeight: 300,
            }}>
              {daily.briefing}
            </div>
          )}

          {/* Team cards */}
          {daily?.teams && Object.keys(daily.teams).length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {Object.values(daily.teams).map(team => (
                <TeamCard key={team.abbr} team={team} />
              ))}
            </div>
          )}

          {/* Scoreboard */}
          <Scoreboard scores={daily?.scores} myTeams={myTeams} />

          {/* Standings */}
          <Standings standings={daily?.standings} myTeams={myTeams} />

          {/* Headlines (compact versie) */}
          <Headlines news={news} />
        </div>
      )}

      {/* Tab: Kijken */}
      {!loading && tab === 'watch' && (
        <WatchTab watch={daily?.watch} myTeams={myTeams} />
      )}

      {/* Tab: Nieuws */}
      {!loading && tab === 'news' && (
        <NewsTab news={news} />
      )}

      {/* Tab: Archief */}
      {!loading && tab === 'arc' && (
        <Archive
          index={index}
          activeDate={activeDate}
          onSelectDate={(d) => {
            setActiveDate(d)
            setTab('now')
          }}
        />
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '10px 0 20px',
        fontSize: 9, color: '#333',
        fontFamily: m,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>mlb stats api · espn · reddit · haiku 4.5</span>
        <span>mlbriefing</span>
      </footer>
    </div>
  )
}

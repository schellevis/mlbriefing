const m = "'JetBrains Mono',monospace"
const s = "'IBM Plex Sans',-apple-system,sans-serif"

const WATCH_COLORS = {
  kijkbaar: { dot: '#4caf50', bg: 'rgba(76,175,80,0.12)', text: '#4caf50', label: 'KIJKBAAR' },
  twijfel: { dot: '#ffa726', bg: 'rgba(255,167,38,0.10)', text: '#ffa726', label: 'TWIJFEL' },
  nacht: { dot: '#555', bg: 'transparent', text: '#555', label: 'nacht' },
}

export default function WatchTab({ watch, myTeams }) {
  if (!watch || watch.length === 0) {
    return (
      <div style={{ paddingBottom: 30, marginTop: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>
          Aankomende games · CET tijden
        </div>
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic', marginTop: 8 }}>
          Geen aankomende games gevonden
        </div>
      </div>
    )
  }

  const myAbbrs = myTeams ? myTeams.map(t => t.abbr) : []
  const myColors = myTeams
    ? Object.fromEntries(myTeams.map(t => [t.abbr, t.color]))
    : {}

  // Groepeer per datum
  const grouped = {}
  for (const g of watch) {
    const key = g.date_display || g.date
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(g)
  }

  return (
    <div style={{ paddingBottom: 30, marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>
        Aankomende games · CET tijden
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 10 }}>
        <span><span style={{ color: '#4caf50' }}>●</span> <span style={{ color: '#777' }}>kijkbaar (&lt;20:30)</span></span>
        <span><span style={{ color: '#ffa726' }}>●</span> <span style={{ color: '#777' }}>twijfel (20:30-21:30)</span></span>
        <span><span style={{ color: '#555' }}>●</span> <span style={{ color: '#777' }}>nacht (&gt;21:30)</span></span>
      </div>

      {Object.entries(grouped).map(([day, games]) => (
        <div key={day} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, fontFamily: m }}>{day}</div>
          {games.map((g, i) => {
            const isMine = myAbbrs.includes(g.away) || myAbbrs.includes(g.home)
            const myTeam = myAbbrs.find(a => a === g.away || a === g.home) || null
            const wStyle = WATCH_COLORS[g.watch_status] || WATCH_COLORS.nacht
            const dimmed = g.watch_status === 'nacht' && !isMine

            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '50px 36px 10px 36px 1fr auto',
                alignItems: 'center',
                padding: '6px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: isMine ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderLeft: isMine ? `2px solid ${myColors[myTeam] || '#666'}` : '2px solid transparent',
                borderRadius: 2,
                opacity: dimmed ? 0.4 : 1,
              }}>
                <span style={{ fontFamily: m, fontSize: 13, fontWeight: 600, color: wStyle.text }}>
                  {g.game_time_cet}
                </span>
                <span style={{
                  fontFamily: m, fontSize: 11, textAlign: 'right',
                  color: isMine && g.away === myTeam ? (myColors[myTeam] || '#999') : '#999',
                }}>
                  {g.away}
                </span>
                <span style={{ textAlign: 'center', color: '#444', fontSize: 9 }}>@</span>
                <span style={{
                  fontFamily: m, fontSize: 11,
                  color: isMine && g.home === myTeam ? (myColors[myTeam] || '#999') : '#999',
                }}>
                  {g.home}
                </span>
                <span style={{ fontSize: 11, color: '#666', paddingLeft: 10 }}>
                  {g.starter_away !== 'TBD' || g.starter_home !== 'TBD'
                    ? `${g.starter_away} vs ${g.starter_home}`
                    : ''}
                </span>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 2,
                  background: wStyle.bg, color: wStyle.text,
                  fontWeight: 600, letterSpacing: 0.5,
                }}>
                  {wStyle.label}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{
        marginTop: 16, padding: 10,
        background: 'rgba(255,89,16,0.05)', borderRadius: 4,
        borderLeft: '2px solid rgba(255,89,16,0.3)',
      }}>
        <div style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>
          <strong style={{ color: '#ccc' }}>Kijktip:</strong> Weekend-middagen (ET 13:00-14:00) starten 19:00-20:00 CET — ideaal.
          Getaway days (do/zo) hebben ook vaak vroege starts.
        </div>
      </div>
    </div>
  )
}

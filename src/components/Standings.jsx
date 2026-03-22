const m = "'JetBrains Mono',monospace"

export default function Standings({ standings, myTeams }) {
  if (!standings || Object.keys(standings).length === 0) return null

  const myAbbrs = myTeams ? myTeams.map(t => t.abbr) : []
  const myColors = myTeams
    ? Object.fromEntries(myTeams.map(t => [t.abbr, t.color]))
    : {}

  // Selecteer de divisions die we tonen
  // Sleutels zoals "nl_east", "al_east"
  const divEntries = Object.entries(standings).filter(([, rows]) => rows && rows.length > 0)

  if (divEntries.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
      {divEntries.map(([divKey, rows]) => {
        // "nl_east" → "NL East"
        const title = divKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
        return (
          <div key={divKey} style={{ flex: 1, minWidth: 160 }}>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: 2,
              color: '#555', textTransform: 'uppercase', marginBottom: 4,
            }}>
              {title}
            </div>
            {rows.map(r => {
              const isMine = myAbbrs.includes(r.team)
              const color = myColors[r.team]
              return (
                <div key={r.team} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 20px 20px 30px',
                  gap: 2,
                  fontFamily: m,
                  fontSize: 11,
                  padding: '2px 0',
                  color: isMine ? '#ddd' : '#666',
                  fontWeight: isMine ? 600 : 400,
                }}>
                  <span style={{ color: isMine ? (color || '#ddd') : '#666' }}>{r.team}</span>
                  <span style={{ textAlign: 'right' }}>{r.w}</span>
                  <span style={{ textAlign: 'right' }}>{r.l}</span>
                  <span style={{ textAlign: 'right', color: r.gb === '—' ? '#444' : undefined }}>
                    {r.gb}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

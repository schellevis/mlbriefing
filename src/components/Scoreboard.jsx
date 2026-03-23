const m = "'JetBrains Mono',monospace"
const s = "'IBM Plex Sans',-apple-system,sans-serif"

export default function Scoreboard({ scores, myTeams }) {
  if (!scores || scores.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
          Scores
        </div>
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Geen uitslagen beschikbaar</div>
      </div>
    )
  }

  const myAbbrs = myTeams ? myTeams.map(t => t.abbr) : []

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
        Scores
      </div>
      {scores.map((g, i) => {
        const awayWon = g.away_score > g.home_score
        const isMine = myAbbrs.includes(g.away) || myAbbrs.includes(g.home)
        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '36px 22px 10px 22px 36px 1fr',
            alignItems: 'center',
            padding: '3px 0',
            borderBottom: '1px solid rgba(255,255,255,0.025)',
            fontFamily: m,
            fontSize: 11,
            background: isMine ? 'rgba(255,255,255,0.012)' : 'transparent',
          }}>
            <span style={{ textAlign: 'right', color: awayWon ? '#ccc' : '#555', fontWeight: awayWon ? 600 : 400 }}>
              {g.away}
            </span>
            <span style={{ textAlign: 'right', color: awayWon ? '#ccc' : '#444', fontWeight: awayWon ? 600 : 400 }}>
              {g.away_score}
            </span>
            <span style={{ textAlign: 'center', color: '#333', fontSize: 8 }}>–</span>
            <span style={{ color: !awayWon ? '#ccc' : '#444', fontWeight: !awayWon ? 600 : 400 }}>
              {g.home_score}
            </span>
            <span style={{ color: !awayWon ? '#ccc' : '#555', fontWeight: !awayWon ? 600 : 400 }}>
              {g.home}
            </span>
            <span style={{ color: '#666', fontSize: 11, paddingLeft: 8, fontFamily: s }}>
              {g.note || g.status}
            </span>
          </div>
        )
      })}
    </div>
  )
}

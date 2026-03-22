const m = "'JetBrains Mono',monospace"
const s = "'IBM Plex Sans',-apple-system,sans-serif"
const p = "'Playfair Display',Georgia,serif"

export default function TeamCard({ team, config }) {
  if (!team) return null

  const { abbr, result, score, opponent, home, record, starter, key_play, next_game, color } = team
  const accent = color || '#888'
  const w = result === 'W'
  const hasGame = result !== null && result !== undefined

  return (
    <div style={{
      flex: 1,
      minWidth: 260,
      background: 'rgba(255,255,255,0.025)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 4,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: p, fontSize: 20, fontWeight: 700, color: accent }}>{abbr}</span>
          {hasGame && (
            <span style={{ fontSize: 11, color: '#666' }}>{home ? 'vs' : '@'} {opponent}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          {hasGame && (
            <>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 2,
                background: w ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.12)',
                color: w ? '#81c784' : '#e57373',
                letterSpacing: 0.5,
              }}>{result}</span>
              <span style={{ fontFamily: m, fontSize: 18, fontWeight: 700, color: '#ddd' }}>{score}</span>
            </>
          )}
          {record && (
            <span style={{ fontFamily: m, fontSize: 11, color: '#555' }}>{record}</span>
          )}
        </div>
      </div>

      {hasGame && starter?.line && (
        <div style={{ fontSize: 12, color: '#999', fontFamily: m }}>
          <span style={{ color: '#666' }}>SP</span> {starter.line}
        </div>
      )}
      {hasGame && key_play && (
        <div style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>★ {key_play}</div>
      )}

      {!hasGame && (
        <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>Geen wedstrijd gespeeld</div>
      )}

      {next_game && (
        <div style={{
          fontSize: 11, color: '#555', marginTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6,
        }}>
          ▸ {next_game.vs} · {next_game.game_time_cet} CET
          {next_game.starter && ` · ${next_game.starter} vs ${next_game.opp_starter || '?'}`}
        </div>
      )}
    </div>
  )
}

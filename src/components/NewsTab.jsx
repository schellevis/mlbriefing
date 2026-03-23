const m = "'JetBrains Mono',monospace"
const s = "'IBM Plex Sans',-apple-system,sans-serif"

function RedditFull({ reddit }) {
  if (!reddit) return null

  const allPosts = []
  for (const [subKey, posts] of Object.entries(reddit)) {
    if (!Array.isArray(posts)) continue
    for (const post of posts) {
      allPosts.push({ ...post, subKey })
    }
  }

  if (allPosts.length === 0) return null

  return (
    <>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555',
        textTransform: 'uppercase', margin: '16px 0 6px',
      }}>
        Trending op Reddit
      </div>
      {allPosts.map((r, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
        }}>
          <div style={{ fontFamily: m, fontSize: 11, color: '#FF5910', minWidth: 40, textAlign: 'right' }}>
            ▲ {r.score > 999 ? (r.score / 1000).toFixed(1) + 'k' : (r.score || '—')}
          </div>
          <div style={{ flex: 1 }}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#bbb', textDecoration: 'none', display: 'block' }}
                onMouseOver={e => e.target.style.color = '#eee'}
                onMouseOut={e => e.target.style.color = '#bbb'}>
                {r.title}
              </a>
            ) : (
              <div style={{ fontSize: 12, color: '#bbb' }}>{r.title}</div>
            )}
            <div style={{ fontSize: 10, color: '#555' }}>
              r/{r.subreddit || r.subKey?.replace('r_', '') || '?'}
              {r.score > 1000 ? ' · trending' : ''}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default function NewsTab({ news }) {
  if (!news) {
    return (
      <div style={{ paddingBottom: 30, marginTop: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
          Nieuwsfeed · bijgewerkt 4x/dag
        </div>
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Nog geen nieuws voor vandaag</div>
      </div>
    )
  }

  const headlines = news.headlines || []
  const reddit = news.reddit || {}

  return (
    <div style={{ paddingBottom: 30, marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
        Nieuwsfeed · bijgewerkt 4x/dag
      </div>

      {headlines.length === 0 ? (
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Nog geen headlines</div>
      ) : (
        headlines.map((n, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontSize: 14 }}>{n.tag || '📰'}</span>
              {n.url ? (
                <a href={n.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#ccc', textDecoration: 'none' }}
                  onMouseOver={e => e.target.style.color = '#eee'}
                  onMouseOut={e => e.target.style.color = '#ccc'}>
                  {n.title}
                </a>
              ) : (
                <span style={{ fontSize: 13, color: '#ccc' }}>{n.title}</span>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{n.source}</div>
            {n.excerpt && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.4 }}>{n.excerpt}</div>
            )}
          </div>
        ))
      )}

      <RedditFull reddit={reddit} />
    </div>
  )
}

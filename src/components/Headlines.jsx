const m = "'JetBrains Mono',monospace"
const s = "'IBM Plex Sans',-apple-system,sans-serif"

function RedditSection({ reddit }) {
  if (!reddit) return null

  // Verzamel alle posts over alle subs
  const allPosts = []
  for (const [subKey, posts] of Object.entries(reddit)) {
    if (!Array.isArray(posts)) continue
    for (const post of posts) {
      allPosts.push({ ...post, subKey })
    }
  }

  if (allPosts.length === 0) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 4 }}>
        Reddit
      </div>
      {allPosts.slice(0, 8).map((r, i) => (
        <div key={i} style={{
          display: 'flex', gap: 6, alignItems: 'baseline',
          padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.025)',
        }}>
          <span style={{ fontFamily: m, fontSize: 10, color: '#FF5910', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>
            {r.score > 999 ? (r.score / 1000).toFixed(1) + 'k' : (r.score || '—')}
          </span>
          <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
            r/{r.subreddit || r.subKey?.replace('r_', '') || '?'}
          </span>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}
              onMouseOver={e => e.target.style.color = '#ccc'}
              onMouseOut={e => e.target.style.color = '#999'}>
              {r.title}
            </a>
          ) : (
            <span style={{ fontSize: 12, color: '#999' }}>{r.title}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Headlines({ news }) {
  if (!news) {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
          Headlines
        </div>
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Geen nieuws beschikbaar</div>
      </div>
    )
  }

  const headlines = news.headlines || []
  const reddit = news.reddit || {}

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 6 }}>
        Headlines
      </div>
      {headlines.slice(0, 8).map((n, i) => (
        <div key={i} style={{
          display: 'flex', gap: 6, alignItems: 'baseline',
          padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.025)',
        }}>
          <span style={{ fontSize: 12, flexShrink: 0 }}>{n.tag || '📰'}</span>
          {n.url ? (
            <a href={n.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#bbb', textDecoration: 'none', flex: 1 }}
              onMouseOver={e => e.target.style.color = '#eee'}
              onMouseOut={e => e.target.style.color = '#bbb'}>
              {n.title}
            </a>
          ) : (
            <span style={{ fontSize: 12, color: '#bbb', flex: 1 }}>{n.title}</span>
          )}
          <span style={{ fontSize: 10, color: '#444', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {n.source}
          </span>
        </div>
      ))}

      <RedditSection reddit={reddit} />
    </div>
  )
}

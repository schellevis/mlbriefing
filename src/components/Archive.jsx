const m = "'JetBrains Mono',monospace"

function formatDateNl(dateStr) {
  // "2026-03-27" → "Wo 27 mrt 2026"
  try {
    const d = new Date(dateStr + 'T12:00:00')
    const dag = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]
    const maand = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
                   'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][d.getMonth()]
    return `${dag} ${d.getDate()} ${maand}`
  } catch {
    return dateStr
  }
}

export default function Archive({ index, activeDate, onSelectDate }) {
  if (!index || !index.dates || index.dates.length === 0) {
    return (
      <div style={{ paddingBottom: 30, marginTop: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>
          Archief
        </div>
        <div style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Geen archief beschikbaar</div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 30, marginTop: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>
        Archief
      </div>
      {index.dates.map((d, i) => (
        <div
          key={d}
          onClick={() => onSelectDate(d)}
          style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
            cursor: 'pointer',
            background: d === activeDate ? 'rgba(255,255,255,0.03)' : 'transparent',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseOut={e => e.currentTarget.style.background = d === activeDate ? 'rgba(255,255,255,0.03)' : 'transparent'}
        >
          <span style={{ fontSize: 13, color: d === activeDate ? '#ddd' : '#888' }}>
            {formatDateNl(d)}
            {i === 0 && <span style={{ fontSize: 10, color: '#555', marginLeft: 8 }}>· vandaag</span>}
          </span>
          <span style={{ fontSize: 11, color: '#555', fontFamily: m }}>→</span>
        </div>
      ))}
    </div>
  )
}

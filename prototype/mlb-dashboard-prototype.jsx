import { useState } from "react";

const MOCK = {
  meta: { date: "Do 27 mrt", gen: "07:02", day: 2 },
  briefing: "Peralta dominant in Mets-debuut (7IP, 9K). Lindor 3-run HR. Bichette solide op derde honk. Rays verliezen nipt — Caminero HR #1, maar bullpen geeft walkoff weg.",
  mets: { r: "W", s: "6-2", vs: "ATL", h: true, rec: "1-0", sp: "Peralta 7IP 2ER 9K", star: "Lindor 3-run HR", nxt: "McLean vs Fried" },
  rays: { r: "L", s: "3-4", vs: "STL", h: false, rec: "0-1", sp: "Rasmussen 6IP 3ER 5K", star: "Caminero HR #1", nxt: "Pepiot vs Liberatore" },
  scores: [
    { a: "NYY", h: "SF", as: 5, hs: 3, n: "Judge 2 HR" },
    { a: "LAD", h: "SD", as: 8, hs: 1, n: "Ohtani 3-4, HR" },
    { a: "TOR", h: "BOS", as: 4, hs: 2, n: "Cease 8IP 1ER" },
    { a: "BAL", h: "CLE", as: 7, hs: 6, n: "Alonso walkoff (10)" },
    { a: "PHI", h: "CIN", as: 3, hs: 5, n: "De La Cruz 3 SB" },
    { a: "CHC", h: "MIL", as: 6, hs: 4, n: "Bregman 2-run HR" },
    { a: "DET", h: "KC", as: 2, hs: 0, n: "Skubal CGSO" },
    { a: "HOU", h: "SEA", as: 1, hs: 3, n: "Imai debuut" },
    { a: "PIT", h: "ARI", as: 5, hs: 2, n: "Griffin 2-4 debuut" },
  ],
  watch: [
    { a: "NYM", h: "ATL", time: "19:10", cet: "01:10", day: "vr 28 mrt", sp: "McLean vs Fried", w: "nacht" },
    { a: "TB", h: "STL", time: "13:15", cet: "19:15", day: "za 29 mrt", sp: "Pepiot vs Liberatore", w: "kijkbaar" },
    { a: "NYM", h: "ATL", time: "13:35", cet: "19:35", day: "za 29 mrt", sp: "Peralta vs Morton", w: "kijkbaar" },
    { a: "NYY", h: "SF", time: "16:05", cet: "22:05", day: "za 29 mrt", sp: "Fried vs Webb", w: "nacht" },
    { a: "BAL", h: "CLE", time: "14:10", cet: "20:10", day: "za 29 mrt", sp: "Bradish vs Williams", w: "twijfel" },
    { a: "LAD", h: "SD", time: "16:10", cet: "22:10", day: "zo 30 mrt", sp: "Ohtani vs Darvish", w: "nacht" },
    { a: "NYM", h: "ATL", time: "13:35", cet: "19:35", day: "zo 30 mrt", sp: "Tong vs Schwellenbach", w: "kijkbaar" },
    { a: "TB", h: "STL", time: "14:45", cet: "20:45", day: "zo 30 mrt", sp: "McClanahan vs May", w: "twijfel" },
    { a: "DET", h: "KC", time: "14:10", cet: "20:10", day: "zo 30 mrt", sp: "Skubal vs Ragans", w: "twijfel" },
  ],
  nlE: [
    { t: "NYM", w: 1, l: 0, gb: "—" },
    { t: "MIA", w: 1, l: 0, gb: "—" },
    { t: "PHI", w: 0, l: 1, gb: "1" },
    { t: "ATL", w: 0, l: 1, gb: "1" },
    { t: "WSH", w: 0, l: 1, gb: "1" },
  ],
  alE: [
    { t: "NYY", w: 1, l: 0, gb: "—" },
    { t: "TOR", w: 1, l: 0, gb: "—" },
    { t: "BAL", w: 1, l: 0, gb: "—" },
    { t: "BOS", w: 0, l: 1, gb: "1" },
    { t: "TB", w: 0, l: 1, gb: "1" },
  ],
  news: [
    { t: "Skubal CGSO op Opening Day — 11K, 0 BB", s: "ESPN", tag: "🔥" },
    { t: "ABS debuut: 37 challenges, 54% overturned", s: "MLB", tag: "📡" },
    { t: "Griffin 2-voor-4 in MLB-debuut", s: "BA", tag: "🌱" },
    { t: "Ohtani gooit 4 IP in spring start, 97 mph", s: "ESPN", tag: "📰" },
  ],
  reddit: [
    { t: "Skubal just threw a Maddux on Opening Day", sub: "baseball", score: 4823 },
    { t: "[PGT] Mets 6, Braves 2 — Peralta is HIM", sub: "Mets", score: 892 },
    { t: "Caminero's first HR of 2026 — 112 mph EV", sub: "Rays", score: 234 },
    { t: "ABS Challenge already more exciting than VAR", sub: "baseball", score: 3102 },
  ],
};

const m = "'JetBrains Mono',monospace";
const s = "'IBM Plex Sans',-apple-system,sans-serif";
const p = "'Playfair Display',Georgia,serif";
const hl = { NYM: "#FF5910", TB: "#8FBCE6" };

function Mini({ d, accent, label }) {
  const w = d.r === "W";
  return (
    <div style={{ flex: 1, minWidth: 260, background: "rgba(255,255,255,0.025)", borderLeft: `3px solid ${accent}`, borderRadius: 4, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: p, fontSize: 20, fontWeight: 700, color: accent }}>{label}</span>
          <span style={{ fontSize: 11, color: "#666" }}>{d.h ? "vs" : "@"} {d.vs}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 2, background: w ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.12)", color: w ? "#81c784" : "#e57373", letterSpacing: 0.5 }}>{d.r}</span>
          <span style={{ fontFamily: m, fontSize: 18, fontWeight: 700, color: "#ddd" }}>{d.s}</span>
          <span style={{ fontFamily: m, fontSize: 11, color: "#555" }}>{d.rec}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#999", fontFamily: m }}>
        <span style={{ color: "#666" }}>SP</span> {d.sp}
      </div>
      <div style={{ fontSize: 12, color: "#ccc", marginTop: 2 }}>★ {d.star}</div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 6 }}>
        ▸ {d.nxt}
      </div>
    </div>
  );
}

export default function App() {
  const [d] = useState(MOCK);
  const [tab, setTab] = useState("now");
  const tabs = [["now", "Vandaag"], ["watch", "Kijken"], ["news", "Nieuws"], ["arc", "Archief"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c", color: "#ddd", fontFamily: s, maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 0 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 style={{ fontFamily: p, fontSize: 22, fontWeight: 900, margin: 0, color: "#e8e8e8" }}>MLBriefing</h1>
          <span style={{ fontSize: 12, color: "#666", fontFamily: m }}>{d.meta.date} · {d.meta.gen}</span>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 10 }}>
          {tabs.map(([k, v]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: "none", border: "none", borderBottom: tab === k ? "2px solid #FF5910" : "2px solid transparent",
              color: tab === k ? "#ddd" : "#555", fontSize: 11, fontWeight: 500, letterSpacing: 0.8,
              textTransform: "uppercase", padding: "5px 12px", cursor: "pointer", fontFamily: s,
            }}>{v}</button>
          ))}
        </div>
      </header>

      {tab === "now" && (
        <div style={{ paddingBottom: 30 }}>
          {/* Briefing — compact */}
          <div style={{ padding: "14px 0 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#999", lineHeight: 1.6, fontWeight: 300 }}>
            {d.briefing}
          </div>

          {/* Team cards */}
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Mini d={d.mets} accent={hl.NYM} label="NYM" />
            <Mini d={d.rays} accent={hl.TB} label="TB" />
          </div>

          {/* Scores — ultra compact */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>Scores</div>
            {d.scores.map((g, i) => {
              const aw = g.as > g.hs;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 20px 8px 20px 32px 1fr", alignItems: "center", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.025)", fontFamily: m, fontSize: 11 }}>
                  <span style={{ textAlign: "right", color: aw ? "#ccc" : "#555", fontWeight: aw ? 600 : 400 }}>{g.a}</span>
                  <span style={{ textAlign: "right", color: aw ? "#ccc" : "#444", fontWeight: aw ? 600 : 400 }}>{g.as}</span>
                  <span style={{ textAlign: "center", color: "#333", fontSize: 8 }}>–</span>
                  <span style={{ color: !aw ? "#ccc" : "#444", fontWeight: !aw ? 600 : 400 }}>{g.hs}</span>
                  <span style={{ color: !aw ? "#ccc" : "#555", fontWeight: !aw ? 600 : 400 }}>{g.h}</span>
                  <span style={{ color: "#666", fontSize: 11, paddingLeft: 8, fontFamily: s }}>{g.n}</span>
                </div>
              );
            })}
          </div>

          {/* Standings side by side */}
          <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
            {[["NL East", d.nlE, "NYM"], ["AL East", d.alE, "TB"]].map(([title, rows, team]) => (
              <div key={title} style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
                {rows.map(r => (
                  <div key={r.t} style={{
                    display: "grid", gridTemplateColumns: "32px 18px 18px 28px", gap: 2, fontFamily: m, fontSize: 11,
                    padding: "2px 0", color: r.t === team ? "#ddd" : "#666", fontWeight: r.t === team ? 600 : 400,
                  }}>
                    <span style={{ color: r.t === team ? (hl[r.t] || "#ddd") : "#666" }}>{r.t}</span>
                    <span style={{ textAlign: "right" }}>{r.w}</span>
                    <span style={{ textAlign: "right" }}>{r.l}</span>
                    <span style={{ textAlign: "right", color: r.gb === "—" ? "#444" : undefined }}>{r.gb}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Headlines + Reddit combined */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>Headlines</div>
            {d.news.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{n.tag}</span>
                <span style={{ fontSize: 12, color: "#bbb" }}>{n.t}</span>
                <span style={{ fontSize: 10, color: "#444", whiteSpace: "nowrap", marginLeft: "auto" }}>{n.s}</span>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Reddit</div>
              {d.reddit.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                  <span style={{ fontFamily: m, fontSize: 10, color: "#FF5910", minWidth: 36, textAlign: "right", flexShrink: 0 }}>{r.score > 999 ? (r.score / 1000).toFixed(1) + "k" : r.score}</span>
                  <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>r/{r.sub}</span>
                  <span style={{ fontSize: 12, color: "#999" }}>{r.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "watch" && (
        <div style={{ paddingBottom: 30, marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>
            Aankomende games · CET tijden
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 10 }}>
            <span><span style={{ color: "#4caf50" }}>●</span> <span style={{ color: "#777" }}>kijkbaar (&lt;20:30)</span></span>
            <span><span style={{ color: "#ffa726" }}>●</span> <span style={{ color: "#777" }}>twijfel (20:30-21:30)</span></span>
            <span><span style={{ color: "#555" }}>●</span> <span style={{ color: "#777" }}>nacht (&gt;21:30)</span></span>
          </div>

          {Object.entries(
            d.watch.reduce((acc, g) => {
              if (!acc[g.day]) acc[g.day] = [];
              acc[g.day].push(g);
              return acc;
            }, {})
          ).map(([day, games]) => (
            <div key={day} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 4, fontFamily: m }}>{day}</div>
              {games.map((g, i) => {
                const isMine = ["NYM", "TB"].includes(g.a) || ["NYM", "TB"].includes(g.h);
                const myTeam = ["NYM", "TB"].includes(g.a) ? g.a : (["NYM", "TB"].includes(g.h) ? g.h : null);
                const wColor = g.w === "kijkbaar" ? "#4caf50" : g.w === "twijfel" ? "#ffa726" : "#555";
                const wBg = g.w === "kijkbaar" ? "rgba(76,175,80,0.12)" : g.w === "twijfel" ? "rgba(255,167,38,0.10)" : "transparent";
                const wLabel = g.w === "kijkbaar" ? "KIJKBAAR" : g.w === "twijfel" ? "TWIJFEL" : "nacht";
                const dimmed = g.w === "nacht" && !isMine;
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "50px 32px 8px 32px 1fr auto",
                    alignItems: "center", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: isMine ? "rgba(255,255,255,0.02)" : "transparent",
                    borderLeft: isMine ? `2px solid ${hl[myTeam] || "#666"}` : "2px solid transparent",
                    borderRadius: 2, opacity: dimmed ? 0.4 : 1,
                  }}>
                    <span style={{ fontFamily: m, fontSize: 13, fontWeight: 600, color: wColor }}>
                      {g.cet}
                    </span>
                    <span style={{ fontFamily: m, fontSize: 11, textAlign: "right", color: isMine && g.a === myTeam ? (hl[myTeam]) : "#999" }}>{g.a}</span>
                    <span style={{ textAlign: "center", color: "#444", fontSize: 9 }}>@</span>
                    <span style={{ fontFamily: m, fontSize: 11, color: isMine && g.h === myTeam ? (hl[myTeam]) : "#999" }}>{g.h}</span>
                    <span style={{ fontSize: 11, color: "#666", paddingLeft: 10 }}>{g.sp}</span>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 2, background: wBg, color: wColor, fontWeight: 600, letterSpacing: 0.5 }}>{wLabel}</span>
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ marginTop: 16, padding: 10, background: "rgba(255,89,16,0.05)", borderRadius: 4, borderLeft: "2px solid rgba(255,89,16,0.3)" }}>
            <div style={{ fontSize: 11, color: "#999", lineHeight: 1.5 }}>
              <strong style={{ color: "#ccc" }}>Kijktip:</strong> Weekend-middagen (ET 13:00-14:00) starten 19:00-20:00 CET — ideaal.
              Getaway days (do/zo) hebben ook vaak vroege starts.
            </div>
          </div>
        </div>
      )}

      {tab === "news" && (
        <div style={{ paddingBottom: 30, marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 6 }}>
            Nieuwsfeed · bijgewerkt 4x/dag
          </div>
          {d.news.map((n, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 14 }}>{n.tag}</span>
                <span style={{ fontSize: 13, color: "#ccc" }}>{n.t}</span>
              </div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{n.s}</div>
            </div>
          ))}

          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", margin: "16px 0 6px" }}>
            Trending op Reddit
          </div>
          {d.reddit.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ fontFamily: m, fontSize: 11, color: "#FF5910", minWidth: 40, textAlign: "right" }}>
                ▲ {r.score > 999 ? (r.score / 1000).toFixed(1) + "k" : r.score}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#bbb" }}>{r.t}</div>
                <div style={{ fontSize: 10, color: "#555" }}>r/{r.sub} · {r.score > 1000 ? "trending" : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "arc" && (
        <div style={{ paddingBottom: 30, marginTop: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>
            Archief
          </div>
          {["27 mrt — Dag 2", "26 mrt — Opening Day"].map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
              <span style={{ fontSize: 13, color: "#888" }}>{d}</span>
              <span style={{ fontSize: 11, color: "#555", fontFamily: m }}>→</span>
            </div>
          ))}
        </div>
      )}

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "10px 0 20px", fontSize: 9, color: "#333", fontFamily: m, display: "flex", justifyContent: "space-between" }}>
        <span>mlb stats api · espn · reddit · haiku 4.5</span>
        <span>mlbriefing</span>
      </footer>
    </div>
  );
}

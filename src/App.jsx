import { useState, useEffect } from "react";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MUSCLE_GROUPS = ["Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Trapézio", "Pernas", "Glúteos", "Abdômen", "Panturrilha", "Cardio"];
const MEASURES = ["Peso (kg)", "Altura (cm)", "Braço (cm)", "Antebraço (cm)", "Peito (cm)", "Cintura (cm)", "Quadril (cm)", "Coxa (cm)", "Panturrilha (cm)"];
const MEASURE_KEYS = ["peso", "altura", "braco", "antebraco", "peito_circ", "cintura", "quadril", "coxa", "panturrilha"];

const TODAY = new Date();

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().split("T")[0];
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const defaultState = {
  checkins: {},       // { "YYYY-MM-DD": { muscles: [], note: "", intensity: 1-5 } }
  measures: [],       // [{ date: "YYYY-MM-DD", ...keys }]
  activeTab: "checkin",
  selectedDate: TODAY.toISOString().split("T")[0],
  showMeasureForm: false,
  newMeasure: {},
  viewMode: "week",   // week | month
};

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem("treino_app_v1");
      if (saved) return { ...defaultState, ...JSON.parse(saved) };
    } catch {}
    return defaultState;
  });

  const update = (patch) => setState(prev => {
    const next = { ...prev, ...patch };
    const { activeTab, showMeasureForm, newMeasure, viewMode, selectedDate, ...toSave } = next;
    try { localStorage.setItem("treino_app_v1", JSON.stringify(toSave)); } catch {}
    return next;
  });

  const todayKey = TODAY.toISOString().split("T")[0];
  const { checkins, measures, activeTab, selectedDate, showMeasureForm, newMeasure, viewMode } = state;

  // ─── CHECK-IN LOGIC ─────────────────────────────────────────────────────────
  const currentCheckin = checkins[selectedDate] || { muscles: [], note: "", intensity: 0 };

  const toggleMuscle = (m) => {
    const muscles = currentCheckin.muscles.includes(m)
      ? currentCheckin.muscles.filter(x => x !== m)
      : [...currentCheckin.muscles, m];
    update({ checkins: { ...checkins, [selectedDate]: { ...currentCheckin, muscles } } });
  };

  const setIntensity = (v) => {
    update({ checkins: { ...checkins, [selectedDate]: { ...currentCheckin, intensity: v } } });
  };

  const setNote = (note) => {
    update({ checkins: { ...checkins, [selectedDate]: { ...currentCheckin, note } } });
  };

  // ─── WEEK/MONTH GRID ────────────────────────────────────────────────────────
  function getWeekDays(weekKey) {
    const start = new Date(weekKey + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }

  function getMonthDays(monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const days = [];
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(y, m - 1, d).toISOString().split("T")[0]);
    }
    return days;
  }

  const weekKey = getWeekKey(new Date(selectedDate + "T00:00:00"));
  const monthKey = getMonthKey(new Date(selectedDate + "T00:00:00"));
  const weekDays = getWeekDays(weekKey);
  const monthDays = getMonthDays(monthKey);

  const weekCheckins = weekDays.filter(d => checkins[d]?.muscles?.length > 0).length;
  const monthCheckins = monthDays.filter(d => checkins[d]?.muscles?.length > 0).length;

  // ─── MEASURE LOGIC ──────────────────────────────────────────────────────────
  const lastMeasure = measures.length > 0 ? measures[measures.length - 1] : null;
  const prevMeasure = measures.length > 1 ? measures[measures.length - 2] : null;

  const saveMeasure = () => {
    const entry = { date: todayKey, ...newMeasure };
    update({ measures: [...measures, entry], showMeasureForm: false, newMeasure: {} });
  };

  // ─── HISTORY ────────────────────────────────────────────────────────────────
  const historyDays = Object.entries(checkins)
    .filter(([, v]) => v.muscles?.length > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 20);

  // ─── STREAK ─────────────────────────────────────────────────────────────────
  // Regra: 1 dia de descanso nao quebra. 2+ dias seguidos sem treino = reset.
  const calcStreak = () => {
    const d = new Date(todayKey + "T00:00:00");
    let count = 0;
    let restInARow = 0;
    const todayHasTreino = checkins[todayKey]?.muscles?.length > 0;
    if (!todayHasTreino) { restInARow = 1; d.setDate(d.getDate() - 1); }
    for (let i = 0; i < 365; i++) {
      const k = d.toISOString().split("T")[0];
      const has = checkins[k]?.muscles?.length > 0;
      if (has) { count++; restInARow = 0; d.setDate(d.getDate() - 1); }
      else { restInARow++; if (restInARow >= 2) break; d.setDate(d.getDate() - 1); }
    }
    return count;
  };
  const streak = calcStreak();

  const intensityLabel = ["—", "Leve", "Moderado", "Intenso", "Pesado", "🔥 PR!"];
  const intensityColor = ["#444", "#4ade80", "#facc15", "#f97316", "#ef4444", "#a855f7"];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f", color: "#e8e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      maxWidth: 480, margin: "0 auto", position: "relative",
      paddingBottom: 80
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .tab-btn { transition: all .2s; }
        .tab-btn:hover { opacity: .8; }
        .day-cell { transition: all .15s; cursor: pointer; }
        .day-cell:hover { transform: scale(1.08); }
        .muscle-btn { transition: all .15s; cursor: pointer; border: none; }
        .muscle-btn:hover { transform: translateY(-1px); }
        .intensity-btn { transition: all .15s; cursor: pointer; }
        .intensity-btn:hover { transform: scale(1.1); }
        .nav-btn { transition: all .2s; cursor: pointer; border: none; background: none; color: #888; font-size: 18px; padding: 4px 8px; }
        .nav-btn:hover { color: #e8e8f0; }
        input[type=number], textarea { outline: none; }
        textarea { resize: none; }
        .fade-in { animation: fadeIn .3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .6; } }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "24px 20px 12px", borderBottom: "1px solid #1a1a2e" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              {MONTHS[TODAY.getMonth()]} {TODAY.getFullYear()}
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
              LIFT<span style={{ color: "#6366f1" }}>LOG</span>
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            {streak > 0 && (
              <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>🔥</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#f97316" }}>{streak}</span>
                <span style={{ fontSize: 11, color: "#666" }}>dias</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a2e", background: "#0a0a0f" }}>
        {[["checkin","Check-in"],["historico","Histórico"],["medidas","Medidas"]].map(([id, label]) => (
          <button key={id} className="tab-btn" onClick={() => update({ activeTab: id })}
            style={{
              flex: 1, padding: "14px 0", background: "none", border: "none", cursor: "pointer",
              color: activeTab === id ? "#6366f1" : "#555",
              fontWeight: activeTab === id ? 700 : 400,
              fontSize: 13, letterSpacing: 0.3,
              borderBottom: activeTab === id ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all .2s"
            }}>{label}</button>
        ))}
      </div>

      {/* ════════════════════ CHECK-IN TAB ════════════════════ */}
      {activeTab === "checkin" && (
        <div className="fade-in" style={{ padding: "20px 20px 0" }}>

          {/* Week/Month toggle + nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", background: "#111", borderRadius: 8, padding: 3, gap: 2 }}>
              {["week","month"].map(mode => (
                <button key={mode} onClick={() => update({ viewMode: mode })}
                  style={{
                    padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: viewMode === mode ? "#1e1e3a" : "none",
                    color: viewMode === mode ? "#6366f1" : "#555",
                    transition: "all .2s"
                  }}>
                  {mode === "week" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className="nav-btn" onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() - (viewMode === "week" ? 7 : 30));
                update({ selectedDate: d.toISOString().split("T")[0] });
              }}>‹</button>
              <span style={{ fontSize: 12, color: "#666", minWidth: 90, textAlign: "center" }}>
                {viewMode === "week"
                  ? `${formatDate(weekDays[0]).slice(0,6)} – ${formatDate(weekDays[6]).slice(0,6)}`
                  : `${MONTHS[new Date(selectedDate+"T00:00:00").getMonth()]} ${new Date(selectedDate+"T00:00:00").getFullYear()}`}
              </span>
              <button className="nav-btn" onClick={() => {
                const d = new Date(selectedDate + "T00:00:00");
                d.setDate(d.getDate() + (viewMode === "week" ? 7 : 30));
                update({ selectedDate: d.toISOString().split("T")[0] });
              }}>›</button>
            </div>
          </div>

          {/* WEEK VIEW */}
          {viewMode === "week" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 20 }}>
              {weekDays.map((day, i) => {
                const ci = checkins[day];
                const hasLog = ci?.muscles?.length > 0;
                const isSelected = day === selectedDate;
                const isToday = day === todayKey;
                return (
                  <div key={day} className="day-cell" onClick={() => update({ selectedDate: day })}
                    style={{
                      borderRadius: 10, padding: "8px 4px", textAlign: "center",
                      background: isSelected ? "#1e1e3a" : hasLog ? "#111827" : "#111",
                      border: isSelected ? "1px solid #6366f1" : isToday ? "1px solid #2d2d4e" : "1px solid #1a1a1a",
                    }}>
                    <div style={{ fontSize: 9, color: "#555", marginBottom: 4, letterSpacing: 1 }}>{DAYS[i]}</div>
                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : "#aaa" }}>
                      {new Date(day + "T00:00:00").getDate()}
                    </div>
                    <div style={{ marginTop: 5, height: 6, width: 6, borderRadius: "50%", margin: "5px auto 0",
                      background: hasLog ? (ci.intensity >= 4 ? "#ef4444" : ci.intensity >= 3 ? "#f97316" : "#6366f1") : "transparent" }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* MONTH VIEW */}
          {viewMode === "month" && (() => {
            const firstDay = new Date(monthDays[0] + "T00:00:00").getDay();
            const offset = firstDay === 0 ? 6 : firstDay - 1;
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
                  {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#444", padding: "2px 0" }}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                  {Array(offset).fill(null).map((_, i) => <div key={"e"+i} />)}
                  {monthDays.map(day => {
                    const ci = checkins[day];
                    const hasLog = ci?.muscles?.length > 0;
                    const isSelected = day === selectedDate;
                    const isToday = day === todayKey;
                    return (
                      <div key={day} className="day-cell" onClick={() => update({ selectedDate: day })}
                        style={{
                          borderRadius: 6, padding: "6px 2px", textAlign: "center",
                          background: isSelected ? "#1e1e3a" : hasLog ? "#111827" : "transparent",
                          border: isSelected ? "1px solid #6366f1" : isToday ? "1px solid #2d2d4e" : "1px solid transparent",
                          position: "relative"
                        }}>
                        <div style={{ fontSize: 11, color: isToday ? "#fff" : hasLog ? "#aaa" : "#444", fontWeight: isToday ? 700 : 400 }}>
                          {new Date(day + "T00:00:00").getDate()}
                        </div>
                        {hasLog && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ci.intensity >= 4 ? "#ef4444" : "#6366f1", margin: "2px auto 0" }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: viewMode === "week" ? "Treinos esta semana" : "Treinos este mês", value: viewMode === "week" ? weekCheckins : monthCheckins, max: viewMode === "week" ? 7 : monthDays.length, color: "#6366f1" },
              { label: "Sequência atual", value: streak, unit: streak === 1 ? "dia" : "dias", color: "#f97316" }
            ].map(s => (
              <div key={s.label} style={{ background: "#111", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.value}{s.max ? <span style={{ fontSize: 14, color: "#333", fontWeight: 400 }}>/{s.max}</span> : ""}
                  {s.unit && <span style={{ fontSize: 12, color: "#555", fontWeight: 400, marginLeft: 4 }}>{s.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* SELECTED DAY CHECKIN */}
          <div style={{ background: "#111", borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 14, letterSpacing: 0.5 }}>
              {selectedDate === todayKey ? "Hoje — " : ""}{formatDate(selectedDate)}
            </div>

            <div style={{ fontSize: 11, color: "#555", marginBottom: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Grupos musculares</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {MUSCLE_GROUPS.map(m => {
                const active = currentCheckin.muscles.includes(m);
                return (
                  <button key={m} className="muscle-btn" onClick={() => toggleMuscle(m)}
                    style={{
                      padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: active ? "#6366f1" : "#1a1a2e",
                      color: active ? "#fff" : "#555",
                      border: active ? "1px solid #818cf8" : "1px solid #222",
                    }}>{m}</button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#555", marginBottom: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>Intensidade</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[1,2,3,4,5].map(v => (
                <button key={v} className="intensity-btn" onClick={() => setIntensity(currentCheckin.intensity === v ? 0 : v)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    background: currentCheckin.intensity >= v ? intensityColor[v] : "#1a1a2e",
                    color: currentCheckin.intensity >= v ? "#fff" : "#333",
                  }}>{v}</button>
              ))}
            </div>
            {currentCheckin.intensity > 0 && (
              <div style={{ fontSize: 12, color: intensityColor[currentCheckin.intensity], marginBottom: 14, textAlign: "center" }}>
                {intensityLabel[currentCheckin.intensity]}
              </div>
            )}

            <div style={{ fontSize: 11, color: "#555", marginBottom: 8, letterSpacing: 1.5, textTransform: "uppercase" }}>Observações</div>
            <textarea rows={2} value={currentCheckin.note} onChange={e => setNote(e.target.value)}
              placeholder="PR, lesão, sensação geral..."
              style={{
                width: "100%", background: "#0a0a0f", border: "1px solid #1e1e3a", borderRadius: 10,
                color: "#ccc", fontSize: 13, padding: "10px 12px", fontFamily: "inherit", lineHeight: 1.5
              }} />

            {currentCheckin.muscles.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} className="pulse" />
                <span style={{ fontSize: 11, color: "#4ade80" }}>Check-in salvo automaticamente</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════ HISTÓRICO TAB ════════════════════ */}
      {activeTab === "historico" && (
        <div className="fade-in" style={{ padding: "20px 20px 0" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: "#fff", marginBottom: 20 }}>Treinos recentes</h2>
          {historyDays.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#333" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14 }}>Nenhum treino registrado ainda.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Faça seu primeiro check-in!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historyDays.map(([day, ci]) => (
                <div key={day} style={{ background: "#111", borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${intensityColor[ci.intensity] || "#333"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{formatDate(day)}</span>
                    {ci.intensity > 0 && (
                      <span style={{ fontSize: 11, color: intensityColor[ci.intensity], background: "#1a1a2e", padding: "3px 10px", borderRadius: 12 }}>
                        {intensityLabel[ci.intensity]}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ci.muscles.map(m => (
                      <span key={m} style={{ fontSize: 11, background: "#1a1a2e", color: "#818cf8", padding: "4px 10px", borderRadius: 10 }}>{m}</span>
                    ))}
                  </div>
                  {ci.note && <div style={{ marginTop: 10, fontSize: 12, color: "#555", borderTop: "1px solid #1a1a1a", paddingTop: 8 }}>{ci.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ MEDIDAS TAB ════════════════════ */}
      {activeTab === "medidas" && (
        <div className="fade-in" style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: "#fff" }}>Medidas corporais</h2>
            <button onClick={() => update({ showMeasureForm: !showMeasureForm, newMeasure: {} })}
              style={{
                background: "#6366f1", border: "none", borderRadius: 10, padding: "8px 16px",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}>+ Registrar</button>
          </div>

          {/* FORM */}
          {showMeasureForm && (
            <div className="fade-in" style={{ background: "#111", borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 14, letterSpacing: 1, textTransform: "uppercase" }}>
                Nova medição — {formatDate(todayKey)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {MEASURES.map((label, i) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>{label}</div>
                    <input type="number" step="0.1"
                      value={newMeasure[MEASURE_KEYS[i]] || ""}
                      onChange={e => update({ newMeasure: { ...newMeasure, [MEASURE_KEYS[i]]: e.target.value } })}
                      style={{
                        width: "100%", background: "#0a0a0f", border: "1px solid #1e1e3a",
                        borderRadius: 8, color: "#ccc", fontSize: 13, padding: "8px 10px", fontFamily: "inherit"
                      }} />
                  </div>
                ))}
              </div>
              <button onClick={saveMeasure}
                style={{ width: "100%", background: "#6366f1", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Salvar medição
              </button>
            </div>
          )}

          {/* LAST MEASURE CARD */}
          {lastMeasure && (
            <div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>
                Última medição — {formatDate(lastMeasure.date)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {MEASURE_KEYS.map((key, i) => {
                  if (!lastMeasure[key]) return null;
                  const prev = prevMeasure?.[key];
                  const diff = prev ? (parseFloat(lastMeasure[key]) - parseFloat(prev)).toFixed(1) : null;
                  const isUp = diff > 0;
                  const isWeight = key === "peso";
                  const positiveChange = isWeight ? !isUp : isUp; // weight loss positive, muscle gain positive
                  return (
                    <div key={key} style={{ background: "#111", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>{MEASURES[i].replace(/ \(.*\)/, "")}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>{lastMeasure[key]}</span>
                        <span style={{ fontSize: 10, color: "#444" }}>{MEASURES[i].match(/\((.*)\)/)?.[1]}</span>
                        {diff !== null && diff != 0 && (
                          <span style={{ fontSize: 11, color: positiveChange ? "#4ade80" : "#ef4444", marginLeft: "auto" }}>
                            {isUp ? "+" : ""}{diff}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* HISTORY */}
              {measures.length > 1 && (
                <div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>Histórico de peso</div>
                  <div style={{ background: "#111", borderRadius: 16, padding: 16, marginBottom: 20 }}>
                    {[...measures].reverse().slice(0, 8).map((m, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(measures.length, 8) - 1 ? "1px solid #1a1a1a" : "none" }}>
                        <span style={{ fontSize: 12, color: "#555" }}>{formatDate(m.date)}</span>
                        {m.peso && <span style={{ fontSize: 14, fontWeight: 600, color: "#ccc" }}>{m.peso} kg</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!lastMeasure && !showMeasureForm && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#333" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📏</div>
              <div style={{ fontSize: 14 }}>Nenhuma medição registrada.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Clique em "+ Registrar" para começar.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

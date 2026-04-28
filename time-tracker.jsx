// Time Tracker Widget — syncs via local API (http://127.0.0.1:57321)
import { React, run } from 'uebersicht';

const API = 'http://127.0.0.1:57321';

export const className = `
  position: fixed;
  top: 20px;
  left: 20px;
  width: 340px;
  font-family: -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  z-index: 9999;
  pointer-events: all;
  -webkit-app-region: no-drag;
`;

// Refresh every second
export const refreshFrequency = 1000;

// Shell: fetch state from API, emit JSON
export const command = `curl -s http://127.0.0.1:57321/state 2>/dev/null || echo '{"error":true}'`;

const C = {
  bg:         '#0c0d10',
  bgElev:     '#15171c',
  bgElev2:    '#1c1f26',
  line:       '#262932',
  lineSoft:   '#1f222a',
  text:       '#e8e6e1',
  textDim:    '#8a8c93',
  textMute:   '#5a5c63',
  accent:     '#f4a261',
  accentSoft: 'rgba(244,162,97,0.12)',
  accentLine: 'rgba(244,162,97,0.35)',
  green:      '#7eb88f',
  red:        '#d97757',
};

const pad = n => String(n).padStart(2, '0');

const formatElapsed = ms => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

const formatHM = ms => {
  const totalMin = Math.floor(ms / 60000);
  return `${Math.floor(totalMin / 60)}:${pad(totalMin % 60)}`;
};

const isSameDay = ts => {
  const d = new Date(ts), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
};

function todayMs(sessions, active) {
  let sum = (sessions || [])
    .filter(s => isSameDay(s.start))
    .reduce((acc, s) => acc + (s.end - s.start), 0);
  if (active && isSameDay(active.start)) sum += Date.now() - active.start;
  return sum;
}

async function postState(data) {
  try {
    await fetch(`${API}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch(e) { console.error('widget postState failed', e); }
}

export const render = ({ output }) => {
  let state = { projects: [], sessions: [], activeSession: null, selectedProjectId: null };
  try { state = JSON.parse(output); } catch {}
  if (state.error) {
    return (
      <div style={{ background: C.bgElev, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px', color: C.textMute, fontSize: 12, textAlign: 'center' }}>
        Server offline<br/>
        <span style={{ fontSize: 10 }}>Run: node server.js</span>
      </div>
    );
  }

  const { projects, sessions, activeSession, selectedProjectId } = state;
  const getProj = id => (projects || []).find(p => p.id === id);
  const activeProj   = activeSession   ? getProj(activeSession.projectId)   : null;
  const selectedProj = selectedProjectId ? getProj(selectedProjectId) : null;
  const elapsed  = activeSession ? Date.now() - activeSession.start : 0;
  const todaySum = todayMs(sessions, activeSession);
  const now      = new Date();
  const timeStr  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const secStr   = `:${pad(now.getSeconds())}`;

  const punchIn = () => {
    if (!selectedProjectId || !getProj(selectedProjectId)) return;
    postState({ ...state, activeSession: { projectId: selectedProjectId, start: Date.now() } });
  };

  const punchOut = () => {
    if (!activeSession) return;
    const newSess = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      projectId: activeSession.projectId,
      start: activeSession.start,
      end: Date.now(),
    };
    const newSessions = (sessions || []).concat(
      newSess.end - newSess.start >= 1000 ? [newSess] : []
    );
    postState({ ...state, sessions: newSessions, activeSession: null });
  };

  const selectProj = id => {
    postState({ ...state, selectedProjectId: id });
  };

  return (
    <div style={{
      background: C.bgElev,
      border: `1px solid ${C.line}`,
      borderRadius: 18,
      padding: '18px 16px',
      boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #f4a261, #d97757)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#1a1208', fontWeight: 900,
          }}>⏱</div>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Time Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: C.textMute }}>Today: {formatHM(todaySum)}</span>
          <button
            onClick={() => run('open http://127.0.0.1:57321')}
            title="פתח אפליקציה"
            style={{
              background: 'transparent', border: `1px solid ${C.lineSoft}`,
              borderRadius: 6, padding: '2px 6px', color: C.textMute,
              cursor: 'pointer', fontSize: 11, lineHeight: 1.4,
              transition: 'all 0.15s',
            }}
          >↗</button>
        </div>
      </div>

      {/* Clock / Elapsed */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        {activeSession ? (
          <>
            <div style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 44, fontWeight: 700,
              letterSpacing: '-0.04em', lineHeight: 1,
              color: activeProj ? activeProj.color : C.accent,
              fontVariantNumeric: 'tabular-nums',
            }}>{formatElapsed(elapsed)}</div>
            <div style={{ fontSize: 11, color: C.textMute, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              {activeProj ? activeProj.name : 'Working'}
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 46, fontWeight: 400,
              letterSpacing: '-0.04em', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: C.text,
            }}>
              {timeStr}<span style={{ color: C.accent }}>{secStr}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMute, marginTop: 5 }}>Not working</div>
          </>
        )}
      </div>

      {/* Project picker — dropdown, only when not active */}
      {!activeSession && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Project</div>
          <div style={{ position: 'relative' }}>
            {selectedProj && (
              <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                width: 8, height: 8, borderRadius: '50%',
                background: selectedProj.color, pointerEvents: 'none', zIndex: 1,
              }} />
            )}
            <select
              value={selectedProjectId || ''}
              onChange={e => selectProj(e.target.value)}
              style={{
                width: '100%', appearance: 'none', WebkitAppearance: 'none',
                background: C.bgElev2, border: `1px solid ${selectedProjectId ? C.accentLine : C.lineSoft}`,
                color: selectedProjectId ? C.text : C.textMute,
                fontFamily: 'inherit', fontSize: 13,
                padding: '9px 28px 9px 28px',
                borderRadius: 10, cursor: 'pointer', direction: 'rtl',
                outline: 'none',
              }}
            >
              <option value="" disabled style={{ background: C.bgElev2 }}>Select project…</option>
              {(projects || []).map(p => (
                <option key={p.id} value={p.id} style={{ background: C.bgElev2 }}>{p.name}</option>
              ))}
            </select>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: C.textMute, fontSize: 10, pointerEvents: 'none',
            }}>▾</span>
          </div>
        </div>
      )}

      {/* Punch button */}
      <button
        onClick={activeSession ? punchOut : punchIn}
        disabled={!activeSession && !selectedProjectId}
        style={{
          width: '100%', padding: '12px', borderRadius: 12, border: 'none',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          background: activeSession
            ? 'linear-gradient(135deg, #d97757, #b85e3f)'
            : 'linear-gradient(135deg, #f4a261, #e08a45)',
          color: activeSession ? '#fff' : '#1a1208',
          boxShadow: activeSession
            ? '0 8px 20px -6px rgba(217,119,87,0.55)'
            : '0 8px 20px -6px rgba(244,162,97,0.55)',
          opacity: (!activeSession && !selectedProjectId) ? 0.45 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <span>{activeSession ? '⏹' : '▶'}</span>
        <span>{activeSession ? 'Stop' : (selectedProj ? `Start — ${selectedProj.name}` : 'Select project')}</span>
      </button>

    </div>
  );
};

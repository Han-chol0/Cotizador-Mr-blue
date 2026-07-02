import { useState, useEffect } from "react";

// ─── Paleta Mr. Blue ─────────────────────────────────────────────────────────
const C = {
  cyan: "#0095D4", navy: "#1E3A5F", coral: "#EE8B77",
  bg: "#F7F8FA", card: "#FFFFFF", border: "#E2E6EA",
  text: "#1A2332", muted: "#6B7A8D",
  green: "#27AE60", amber: "#F39C12", red: "#E74C3C",
  purple: "#7C4DFF",
};

const inputStyle = {
  width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`,
  borderRadius: 7, padding: "9px 12px", fontSize: 14,
  fontFamily: "Inter, sans-serif", color: C.text, background: C.card, outline: "none",
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase",
  letterSpacing: "0.07em", marginBottom: 4, display: "block",
};
const cardStyle = {
  background: C.card, border: `1.5px solid ${C.border}`,
  borderRadius: 10, padding: "18px 20px", marginBottom: 16,
};
const btn = (bg, full) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: full ? "11px 0" : "7px 14px",
  fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
  fontSize: full ? 14 : 12, cursor: "pointer",
  width: full ? "100%" : "auto",
});

// ─── Tipos de máquina ────────────────────────────────────────────────────────
const TIPOS_MAQUINA = ["Offset", "Digital", "Serigrafía", "Flexografía", "Huecograbado", "Otro"];
const COLORES_OPT   = ["1 color", "2 colores", "4 colores (CMYK)", "5+ colores", "Digital full color"];

// ─── Tamaños estándar de pliego en cm ───────────────────────────────────────
const STANDARD_SHEETS = [
  { label: "56×86 cm",  w: 56, h: 86  },
  { label: "60×90 cm",  w: 60, h: 90  },
  { label: "61×86 cm",  w: 61, h: 86  },
  { label: "65×95 cm",  w: 65, h: 95  },
  { label: "70×95 cm",  w: 70, h: 95  },
  { label: "70×100 cm", w: 70, h: 100 },
];

// ─── Utilidades de storage (localStorage) ───────────────────────────────────
async function storageGet(key) {
  try {
    const raw = localStorage.getItem("mrblue_" + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function storageSet(key, val) {
  try {
    if (val === null) { localStorage.removeItem("mrblue_" + key); return; }
    localStorage.setItem("mrblue_" + key, JSON.stringify(val));
  } catch {}
}

// ─── Cálculo de imposición ───────────────────────────────────────────────────
function calcImposition(sheetW, sheetH, pieceW, pieceH, margin = 0.5) {
  const usableW = sheetW - margin * 2, usableH = sheetH - margin * 2;
  const fitH = Math.floor(usableW / pieceW) * Math.floor(usableH / pieceH);
  const fitV = Math.floor(usableW / pieceH) * Math.floor(usableH / pieceW);
  const orientation = fitH >= fitV ? "horizontal" : "vertical";
  const colsH = Math.floor(usableW / pieceW), rowsH = Math.floor(usableH / pieceH);
  const colsV = Math.floor(usableW / pieceH), rowsV = Math.floor(usableH / pieceW);
  return {
    piecesPerSheet: Math.max(fitH, fitV), orientation,
    cols: orientation === "horizontal" ? colsH : colsV,
    rows: orientation === "horizontal" ? rowsH : rowsV,
  };
}

// ─── Filtra pliegos según máquina ────────────────────────────────────────────
function filterSheetsByMachine(machine) {
  if (!machine) return STANDARD_SHEETS.map(s => ({ ...s, compatible: true }));
  return STANDARD_SHEETS.map(s => {
    const fitW = s.w >= machine.minW && s.w <= machine.maxW;
    const fitH = s.h >= machine.minH && s.h <= machine.maxH;
    return { ...s, compatible: fitW && fitH };
  });
}

// ─── Grid Preview ─────────────────────────────────────────────────────────────
function GridPreview({ cols, rows, sheetW, sheetH }) {
  const scale = Math.min(130 / sheetW, 80 / sheetH);
  const sw = sheetW * scale, sh = sheetH * scale;
  const pw = (sheetW / cols) * scale, ph = (sheetH / rows) * scale;
  return (
    <svg width={sw} height={sh} style={{ display: "block", border: `1.5px solid ${C.navy}`, borderRadius: 3, flexShrink: 0 }}>
      <rect width={sw} height={sh} fill="#EAF4FB" />
      {Array.from({ length: cols }).map((_, c) =>
        Array.from({ length: rows }).map((_, r) => (
          <rect key={`${c}-${r}`} x={c * pw + 1} y={r * ph + 1} width={pw - 2} height={ph - 2}
            fill={C.cyan} fillOpacity={0.28} stroke={C.cyan} strokeWidth={0.8} rx={1} />
        ))
      )}
    </svg>
  );
}

function Stat({ label, value, bold, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontWeight: bold ? 700 : 500, color: accent ? C.cyan : C.text, fontFamily: bold ? "'Space Grotesk',sans-serif" : "inherit", fontSize: bold ? 15 : 13 }}>{value}</div>
    </div>
  );
}

// ─── Resultado por tamaño de pliego ──────────────────────────────────────────
function SheetResult({ sheet, result, qty, mermaPercent, pricePerKg, gramaje, compatible, showIncompatible }) {
  if (!compatible && !showIncompatible) return null;

  const totalRaw = result.piecesPerSheet > 0 ? Math.ceil(qty / result.piecesPerSheet) : null;
  const totalConMerma = totalRaw ? Math.ceil(totalRaw * (1 + mermaPercent / 100)) : null;
  const mermaExtra = totalConMerma && totalRaw ? totalConMerma - totalRaw : 0;
  const areaM2 = (sheet.w * sheet.h) / 10000;
  const totalKg = totalConMerma ? totalConMerma * (areaM2 * gramaje) / 1000 : null;
  const totalCost = totalKg && pricePerKg ? totalKg * pricePerKg : null;
  const score = result.piecesPerSheet;
  const badgeColor = score >= 8 ? C.green : score >= 4 ? C.amber : C.coral;

  return (
    <div style={{
      background: compatible ? C.card : "#F8F8F8",
      border: `1.5px solid ${compatible ? C.border : "#DDD"}`,
      borderRadius: 10, padding: "14px 16px",
      opacity: compatible ? 1 : 0.5,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compatible && score > 0 ? 10 : 0, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: compatible ? C.navy : C.muted }}>{sheet.label}</span>
          {!compatible && (
            <span style={{ background: "#DDD", color: "#888", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
              Fuera de rango
            </span>
          )}
        </div>
        {compatible && (
          <span style={{ background: badgeColor, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
            {score > 0 ? `${score} pzas/pliego` : "No cabe"}
          </span>
        )}
      </div>
      {compatible && score > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <GridPreview cols={result.cols} rows={result.rows} sheetW={sheet.w} sheetH={sheet.h} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", flex: 1 }}>
            <Stat label="Orientación" value={result.orientation === "horizontal" ? "↔ Horizontal" : "↕ Vertical"} />
            <Stat label="Cols × Filas" value={`${result.cols} × ${result.rows}`} />
            <Stat label="Pliegos netos" value={totalRaw?.toLocaleString("es-MX") ?? "—"} />
            <Stat label="Merma +" value={mermaExtra > 0 ? `+${mermaExtra}` : "0"} />
            <Stat label="Pliegos totales" value={totalConMerma?.toLocaleString("es-MX") ?? "—"} bold />
            <Stat label="Peso estimado" value={totalKg ? `${totalKg.toFixed(1)} kg` : "—"} />
            {totalCost && <Stat label="Costo papel" value={`$${totalCost.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} bold accent />}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Administración de proveedores y máquinas
// ═══════════════════════════════════════════════════════════════════════════════

// Procesos que puede cotizar un proveedor (mismos que hoja de costos)
const PROCESOS_PROVEEDOR = [
  { key: "impresion",    label: "Impresión",       grupo: "Base"       },
  { key: "papel",        label: "Papel",           grupo: "Base"       },
  { key: "flete",        label: "Flete",           grupo: "Base"       },
  { key: "pantone",      label: "Tintas Pantone",  grupo: "Impresión"  },
  { key: "alzado",       label: "Alzado",          grupo: "Acabados"   },
  { key: "corte",        label: "Corte",           grupo: "Acabados"   },
  { key: "barniz_uv",    label: "Barniz U.V.",     grupo: "Acabados"   },
  { key: "serigrafia",   label: "Serigrafía",      grupo: "Acabados"   },
  { key: "laminado",     label: "Laminado",        grupo: "Acabados"   },
  { key: "suaje",        label: "Suaje",           grupo: "Acabados"   },
  { key: "hotmelt",      label: "Hotmelt",         grupo: "Acabados"   },
  { key: "pasta_dura",   label: "Pasta Dura",      grupo: "Acabados"   },
  { key: "plecado",      label: "Plecado",         grupo: "Acabados"   },
  { key: "doblez",       label: "Doblez",          grupo: "Acabados"   },
  { key: "engrapado",    label: "Engrapado",       grupo: "Acabados"   },
  { key: "rustica",      label: "Rústica Cosida",  grupo: "Acabados"   },
  { key: "wireo",        label: "Wire-O",          grupo: "Acabados"   },
  { key: "hotstamping",  label: "Hotstamping",     grupo: "Acabados"   },
  { key: "empaque",      label: "Empaque especial",grupo: "Empaque"    },
  { key: "promocionales",label: "Promocionales",   grupo: "Empaque"    },
];

const GRUPOS_COLOR = { "Base": C.cyan, "Impresión": C.navy, "Acabados": "#7C4DFF", "Empaque": C.coral };

function fmtP(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Editor de precios de un proveedor ────────────────────────────────────────
function FichaPrecios({ prov, onSave }) {
  // precios: { [key]: { precio_millar, rango_min, rango_max, notas, historial: [{precio, fecha, qty}] } }
  const initPrecios = () => {
    const base = {};
    PROCESOS_PROVEEDOR.forEach(p => {
      base[p.key] = prov.precios?.[p.key] || { precio_millar: "", rango_min: "", rango_max: "", notas: "", historial: [] };
    });
    return base;
  };

  const [precios, setPrecios] = useState(initPrecios);
  const [grupoAbierto, setGrupoAbierto] = useState("Base");
  const [saved, setSaved] = useState(false);

  const update = (key, field, val) =>
    setPrecios(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));

  const guardar = () => {
    onSave({ ...prov, precios });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const grupos = [...new Set(PROCESOS_PROVEEDOR.map(p => p.grupo))];

  return (
    <div style={{ marginTop: 14 }}>
      {/* Tabs de grupo */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {grupos.map(g => (
          <button key={g} onClick={() => setGrupoAbierto(g)} style={{
            background: grupoAbierto === g ? (GRUPOS_COLOR[g] || C.navy) : C.bg,
            color: grupoAbierto === g ? "#fff" : C.muted,
            border: `1.5px solid ${grupoAbierto === g ? (GRUPOS_COLOR[g] || C.navy) : C.border}`,
            borderRadius: 20, padding: "4px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>{g}</button>
        ))}
      </div>

      {/* Encabezado columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px", gap: "0 8px",
        padding: "0 4px 6px", fontSize: 10, fontWeight: 700, color: C.muted,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <div>Proceso</div>
        <div style={{ textAlign: "right" }}>$/Millar</div>
        <div style={{ textAlign: "right" }}>Tiraje mín</div>
        <div style={{ textAlign: "right" }}>Tiraje máx</div>
      </div>

      {PROCESOS_PROVEEDOR.filter(p => p.grupo === grupoAbierto).map(p => {
        const d = precios[p.key];
        const hist = d.historial || [];
        const ultimo = hist.length > 0 ? hist[hist.length - 1] : null;
        const variacion = hist.length > 1
          ? ((parseFloat(hist[hist.length-1].precio) - parseFloat(hist[hist.length-2].precio)) / parseFloat(hist[hist.length-2].precio) * 100)
          : null;

        return (
          <div key={p.key} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, marginBottom: 6, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px", gap: "0 8px", padding: "10px 12px", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{p.label}</div>
                {ultimo && (
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    Último: ${fmtP(ultimo.precio)}/millar
                    {variacion !== null && (
                      <span style={{ marginLeft: 6, color: variacion > 0 ? C.red : C.green, fontWeight: 700 }}>
                        {variacion > 0 ? "▲" : "▼"}{Math.abs(variacion).toFixed(1)}%
                      </span>
                    )}
                    {" · "}{new Date(ultimo.fecha).toLocaleDateString("es-MX")}
                  </div>
                )}
              </div>
              <div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>$</span>
                  <input value={d.precio_millar} onChange={e => update(p.key, "precio_millar", e.target.value)}
                    type="number" step="0.01" placeholder="0.00"
                    style={{ ...inputStyle, paddingLeft: 18, fontSize: 12, textAlign: "right", padding: "6px 8px 6px 18px" }} />
                </div>
              </div>
              <input value={d.rango_min} onChange={e => update(p.key, "rango_min", e.target.value)}
                type="number" placeholder="1,000" title="Tiraje mínimo"
                style={{ ...inputStyle, fontSize: 12, textAlign: "right", padding: "6px 8px" }} />
              <input value={d.rango_max} onChange={e => update(p.key, "rango_max", e.target.value)}
                type="number" placeholder="50,000" title="Tiraje máximo"
                style={{ ...inputStyle, fontSize: 12, textAlign: "right", padding: "6px 8px" }} />
            </div>
            {/* Notas */}
            <div style={{ padding: "0 12px 8px" }}>
              <input value={d.notas} onChange={e => update(p.key, "notas", e.target.value)}
                placeholder="Notas (incluye setup, planchas, condiciones especiales…)"
                style={{ ...inputStyle, fontSize: 11, padding: "4px 8px", color: C.muted }} />
            </div>
            {/* Historial mini */}
            {hist.length > 0 && (
              <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {hist.slice(-4).map((h, i) => (
                  <span key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 10, color: C.muted }}>
                    ${fmtP(h.precio)} · {new Date(h.fecha).toLocaleDateString("es-MX")}
                    {h.qty ? ` · ${parseInt(h.qty).toLocaleString("es-MX")} pzas` : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={guardar} style={{ ...btn(saved ? C.green : C.cyan), marginTop: 8 }}>
        {saved ? "✓ Precios guardados" : "Guardar precios"}
      </button>
    </div>
  );
}

// ── Función para registrar precio recibido en historial ──────────────────────
async function registrarPrecioEnFicha(proveedorId, procesoKey, precio, qty, fecha) {
  const proveedores = await storageGet("proveedores_db") || [];
  const updated = proveedores.map(p => {
    if (p.id !== proveedorId) return p;
    const precios = { ...p.precios } || {};
    const proceso = precios[procesoKey] || { precio_millar: "", rango_min: "", rango_max: "", notas: "", historial: [] };
    const historial = [...(proceso.historial || []), { precio, fecha: fecha || new Date().toISOString(), qty }];
    // Actualiza también el precio_millar con el más reciente
    precios[procesoKey] = { ...proceso, precio_millar: precio, historial };
    return { ...p, precios };
  });
  await storageSet("proveedores_db", updated);
  return updated;
}

const emptyMachine = () => ({
  id: crypto.randomUUID(), nombre: "", tipo: "Offset",
  minW: "", minH: "", maxW: "", maxH: "",
  colores: [], tiraje_minimo: "", notas: "",
});

function MachineForm({ machine, onChange, onSave, onCancel }) {
  const toggle = (color) => {
    const next = machine.colores.includes(color)
      ? machine.colores.filter(c => c !== color)
      : [...machine.colores, color];
    onChange({ ...machine, colores: next });
  };
  return (
    <div style={{ background: "#F0F7FF", border: `1.5px solid ${C.cyan}`, borderRadius: 10, padding: "16px 18px", marginBottom: 12 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 12 }}>
        {machine.nombre ? `Editando: ${machine.nombre}` : "Nueva máquina"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Nombre / Modelo</label>
          <input value={machine.nombre} onChange={e => onChange({ ...machine, nombre: e.target.value })}
            placeholder="Ej: Heidelberg SM52, Komori 528…" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select value={machine.tipo} onChange={e => onChange({ ...machine, tipo: e.target.value })}
            style={{ ...inputStyle, appearance: "none" }}>
            {TIPOS_MAQUINA.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tiraje mínimo</label>
          <input value={machine.tiraje_minimo} type="number"
            onChange={e => onChange({ ...machine, tiraje_minimo: e.target.value })}
            placeholder="Ej: 500" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pliego mínimo Ancho (cm)</label>
          <input value={machine.minW} type="number" step="0.1"
            onChange={e => onChange({ ...machine, minW: e.target.value })}
            placeholder="Ej: 32" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pliego mínimo Alto (cm)</label>
          <input value={machine.minH} type="number" step="0.1"
            onChange={e => onChange({ ...machine, minH: e.target.value })}
            placeholder="Ej: 45" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pliego máximo Ancho (cm)</label>
          <input value={machine.maxW} type="number" step="0.1"
            onChange={e => onChange({ ...machine, maxW: e.target.value })}
            placeholder="Ej: 72" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pliego máximo Alto (cm)</label>
          <input value={machine.maxH} type="number" step="0.1"
            onChange={e => onChange({ ...machine, maxH: e.target.value })}
            placeholder="Ej: 102" style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Colores que imprime</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {COLORES_OPT.map(c => (
              <button key={c} onClick={() => toggle(c)} style={{
                background: machine.colores.includes(c) ? C.navy : C.bg,
                color: machine.colores.includes(c) ? "#fff" : C.muted,
                border: `1.5px solid ${machine.colores.includes(c) ? C.navy : C.border}`,
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Notas</label>
          <input value={machine.notas} onChange={e => onChange({ ...machine, notas: e.target.value })}
            placeholder="Velocidad, observaciones, etc." style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onSave} style={btn(C.cyan)}>Guardar máquina</button>
        <button onClick={onCancel} style={{ ...btn(C.muted), background: "none", color: C.muted, border: `1.5px solid ${C.border}` }}>Cancelar</button>
      </div>
    </div>
  );
}

function AdminProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editingMachine, setEditingMachine] = useState(null);
  const [newProvNombre, setNewProvNombre]   = useState("");
  const [expanded, setExpanded]   = useState({});   // { id: 'maquinas'|'precios'|false }

  useEffect(() => {
    storageGet("proveedores_db").then(d => { setProveedores(d || []); setLoading(false); });
  }, []);

  const save = async (list) => { setProveedores(list); await storageSet("proveedores_db", list); };

  const addProveedor = async () => {
    if (!newProvNombre.trim()) return;
    await save([...proveedores, { id: crypto.randomUUID(), nombre: newProvNombre.trim(), maquinas: [], precios: {} }]);
    setNewProvNombre("");
  };

  const deleteProveedor = (id) => save(proveedores.filter(p => p.id !== id));

  const saveMachine = async (provId, machine) => {
    const list = proveedores.map(p => {
      if (p.id !== provId) return p;
      const exists = p.maquinas.find(m => m.id === machine.id);
      const maquinas = exists ? p.maquinas.map(m => m.id === machine.id ? machine : m) : [...p.maquinas, machine];
      return { ...p, maquinas };
    });
    await save(list);
    setEditingMachine(null);
  };

  const deleteMachine = (provId, machineId) =>
    save(proveedores.map(p => p.id !== provId ? p : { ...p, maquinas: p.maquinas.filter(m => m.id !== machineId) }));

  const savePrecios = async (provActualizado) => {
    await save(proveedores.map(p => p.id === provActualizado.id ? provActualizado : p));
  };

  const toggleSection = (provId, section) =>
    setExpanded(e => ({ ...e, [provId]: e[provId] === section ? false : section }));

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando…</div>;

  return (
    <div>
      {/* Agregar proveedor */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 12 }}>
          Proveedores registrados
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newProvNombre} onChange={e => setNewProvNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addProveedor()}
            placeholder="Nombre del proveedor…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addProveedor} style={btn(C.cyan)}>+ Agregar</button>
        </div>
      </div>

      {proveedores.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>
          Sin proveedores. Agrega el primero arriba.
        </div>
      )}

      {proveedores.map(prov => {
        const preciosConDatos = PROCESOS_PROVEEDOR.filter(p => parseFloat(prov.precios?.[p.key]?.precio_millar) > 0).length;
        const maqCount = prov.maquinas?.length ?? 0;

        return (
          <div key={prov.id} style={{ ...cardStyle, marginBottom: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: C.navy }}>{prov.nombre}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {maqCount === 0 ? "Sin máquinas" : `${maqCount} máquina${maqCount > 1 ? "s" : ""}`}
                  {preciosConDatos > 0 && <span style={{ marginLeft: 8, color: C.green }}>· {preciosConDatos} proceso{preciosConDatos > 1 ? "s" : ""} con precio</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => toggleSection(prov.id, "maquinas")}
                  style={{ ...btn(expanded[prov.id] === "maquinas" ? C.navy : C.bg),
                    color: expanded[prov.id] === "maquinas" ? "#fff" : C.muted,
                    border: `1.5px solid ${expanded[prov.id] === "maquinas" ? C.navy : C.border}` }}>
                  🖨 Máquinas
                </button>
                <button onClick={() => toggleSection(prov.id, "precios")}
                  style={{ ...btn(expanded[prov.id] === "precios" ? C.cyan : C.bg),
                    color: expanded[prov.id] === "precios" ? "#fff" : C.muted,
                    border: `1.5px solid ${expanded[prov.id] === "precios" ? C.cyan : C.border}` }}>
                  💰 Precios
                </button>
                <button onClick={() => deleteProveedor(prov.id)}
                  style={{ ...btn(C.red), background: "none", color: C.red, border: `1.5px solid ${C.red}` }}>
                  Eliminar
                </button>
              </div>
            </div>

            {/* Sección: Máquinas */}
            {expanded[prov.id] === "maquinas" && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button onClick={() => { setEditingMachine({ provId: prov.id, machine: emptyMachine() }); }}
                    style={btn(C.navy)}>+ Agregar máquina</button>
                </div>

                {editingMachine?.provId === prov.id && (
                  <MachineForm machine={editingMachine.machine}
                    onChange={m => setEditingMachine({ ...editingMachine, machine: m })}
                    onSave={() => saveMachine(prov.id, editingMachine.machine)}
                    onCancel={() => setEditingMachine(null)} />
                )}

                {prov.maquinas.length === 0 && !editingMachine && (
                  <div style={{ color: C.muted, fontSize: 12, padding: "6px 0" }}>Sin máquinas registradas.</div>
                )}

                {prov.maquinas.map(m => (
                  <div key={m.id} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>{m.nombre || "Sin nombre"}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                          {m.tipo}
                          {m.minW && m.maxW ? ` · ${m.minW}×${m.minH} – ${m.maxW}×${m.maxH} cm` : ""}
                          {m.tiraje_minimo ? ` · Mín. ${parseInt(m.tiraje_minimo).toLocaleString("es-MX")}` : ""}
                        </div>
                        {m.colores?.length > 0 && (
                          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                            {m.colores.map(c => (
                              <span key={c} style={{ background: C.navy, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{c}</span>
                            ))}
                          </div>
                        )}
                        {m.notas && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m.notas}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditingMachine({ provId: prov.id, machine: { ...m } })} style={btn(C.amber)}>Editar</button>
                        <button onClick={() => deleteMachine(prov.id, m.id)}
                          style={{ ...btn(C.red), background: "none", color: C.red, border: `1.5px solid ${C.red}` }}>Quitar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sección: Precios por proceso */}
            {expanded[prov.id] === "precios" && (
              <FichaPrecios prov={prov} onSave={savePrecios} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Calculadora con selector de proveedor/máquina
// ═══════════════════════════════════════════════════════════════════════════════
function Calculadora({ onCalcDone }) {
  const [pw, setPw] = useState("10");
  const [ph, setPh] = useState("7");
  const [extW, setExtW] = useState("");
  const [extH, setExtH] = useState("");
  const [qty, setQty] = useState("1000");
  const [merma, setMerma] = useState("5");
  const [gramaje, setGramaje] = useState("300");
  const [pricePerKg, setPricePerKg] = useState("");
  const [results, setResults] = useState(null);
  const [showIncompatible, setShowIncompatible] = useState(false);

  // Proveedor/máquina
  const [proveedores, setProveedores] = useState([]);
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState("");

  useEffect(() => {
    storageGet("proveedores_db").then(d => setProveedores(d || []));
  }, []);

  const selectedProv = proveedores.find(p => p.id === selectedProvId);
  const selectedMachine = selectedProv?.maquinas.find(m => m.id === selectedMachineId) || null;

  const calcular = () => {
    const pw_ = parseFloat(pw), ph_ = parseFloat(ph), qty_ = parseInt(qty);
    const extW_ = parseFloat(extW) || null, extH_ = parseFloat(extH) || null;
    const merma_ = parseFloat(merma) || 0, gramaje_ = parseFloat(gramaje) || 300, pkkg = parseFloat(pricePerKg) || 0;
    if (!pw_ || !ph_ || !qty_) return;
    const impW = extW_ || pw_, impH = extH_ || ph_;

    const sheetsWithCompat = filterSheetsByMachine(
      selectedMachine && selectedMachine.minW
        ? { minW: parseFloat(selectedMachine.minW), minH: parseFloat(selectedMachine.minH),
            maxW: parseFloat(selectedMachine.maxW), maxH: parseFloat(selectedMachine.maxH) }
        : null
    );

    const raw = sheetsWithCompat.map(({ label, w, h, compatible }) => ({
      sheet: { label, w, h }, compatible,
      result: calcImposition(w, h, impW, impH),
    })).sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      return b.result.piecesPerSheet - a.result.piecesPerSheet;
    });

    const res = { pw: pw_, ph: ph_, extW: extW_, extH: extH_, qty: qty_, merma: merma_, gramaje: gramaje_, pricePerKg: pkkg, raw, machine: selectedMachine };
    setResults(res);
    onCalcDone(res);
  };

  const compatibles = results?.raw.filter(r => r.compatible) ?? [];
  const best = compatibles[0] ?? results?.raw[0];
  const bestTotal = best?.result.piecesPerSheet > 0
    ? Math.ceil(Math.ceil(results.qty / best.result.piecesPerSheet) * (1 + results.merma / 100)) : null;

  const incompatiblesCount = results?.raw.filter(r => !r.compatible).length ?? 0;

  return (
    <div>
      {/* Selector Proveedor → Máquina */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 12 }}>
          Proveedor y máquina <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}>(opcional — filtra tamaños de pliego)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
          <div>
            <label style={labelStyle}>Proveedor</label>
            <select value={selectedProvId}
              onChange={e => { setSelectedProvId(e.target.value); setSelectedMachineId(""); }}
              style={{ ...inputStyle, appearance: "none" }}>
              <option value="">— Sin filtro —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Máquina</label>
            <select value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}
              disabled={!selectedProv || selectedProv.maquinas.length === 0}
              style={{ ...inputStyle, appearance: "none", opacity: !selectedProv ? 0.5 : 1 }}>
              <option value="">— Todas las máquinas —</option>
              {(selectedProv?.maquinas ?? []).map(m => (
                <option key={m.id} value={m.id}>{m.nombre} ({m.tipo})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info de máquina seleccionada */}
        {selectedMachine && (
          <div style={{ marginTop: 10, background: "#EAF4FB", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: C.navy }}>
            <strong>{selectedMachine.nombre}</strong> · {selectedMachine.tipo}
            {selectedMachine.minW ? ` · Pliego ${selectedMachine.minW}×${selectedMachine.minH} – ${selectedMachine.maxW}×${selectedMachine.maxH} cm` : ""}
            {selectedMachine.tiraje_minimo ? ` · Tiraje mín. ${parseInt(selectedMachine.tiraje_minimo).toLocaleString("es-MX")}` : ""}
            {selectedMachine.colores.length > 0 && <span> · {selectedMachine.colores.join(", ")}</span>}
          </div>
        )}

        {selectedProv && selectedProv.maquinas.length === 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.amber }}>
            ⚠ Este proveedor no tiene máquinas registradas. Ve a la pestaña Proveedores para agregar.
          </div>
        )}
      </div>

      {/* Datos del producto */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 14 }}>Datos del producto</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          <div>
            <label style={labelStyle}>Tamaño final Ancho (cm)</label>
            <input value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} type="number" step="0.1" />
          </div>
          <div>
            <label style={labelStyle}>Tamaño final Alto (cm)</label>
            <input value={ph} onChange={e => setPh(e.target.value)} style={inputStyle} type="number" step="0.1" />
          </div>
          <div>
            <label style={labelStyle}>Tamaño extendido Ancho (cm) <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>opcional</span></label>
            <input value={extW} onChange={e => setExtW(e.target.value)} style={inputStyle} type="number" step="0.1" placeholder={pw || "ej: 12"} />
          </div>
          <div>
            <label style={labelStyle}>Tamaño extendido Alto (cm) <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>opcional</span></label>
            <input value={extH} onChange={e => setExtH(e.target.value)} style={inputStyle} type="number" step="0.1" placeholder={ph || "ej: 9"} />
          </div>
          {[["Número de piezas", qty, setQty, "1"], ["Merma (%)", merma, setMerma, "0.5"], ["Gramaje (g/m²)", gramaje, setGramaje, "1"]].map(([lbl, val, set, step]) => (
            <div key={lbl}>
              <label style={labelStyle}>{lbl}</label>
              <input value={val} onChange={e => set(e.target.value)} style={inputStyle} type="number" step={step} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Precio/kg papel ($) <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>opcional</span></label>
            <input value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} style={inputStyle} type="number" step="0.01" placeholder="42.50" />
          </div>
        </div>
        <button onClick={calcular} style={{ ...btn(C.cyan, true), marginTop: 16 }}>
          Calcular imposición →
        </button>
      </div>

      {/* Resultados */}
      {results && (
        <>
          {/* Barra resumen */}
          <div style={{ background: C.navy, borderRadius: 10, padding: "12px 18px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              ["Mejor opción", best?.sheet.label ?? "—"],
              ["Pzas/pliego", best?.result.piecesPerSheet ?? "—"],
              ["Pliegos totales", bestTotal?.toLocaleString("es-MX") ?? "—"],
              ...(results.machine ? [["Máquina", results.machine.nombre]] : []),
              ...(results.extW && results.extH ? [["Extendido", `${results.extW}×${results.extH} cm`]] : []),
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: "#8BBDD6", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{String(v)}</div>
              </div>
            ))}
          </div>

          {/* Aviso pliegos compatibles */}
          {selectedMachine && (
            <div style={{ background: "#EAF4FB", border: `1.5px solid ${C.cyan}`, borderRadius: 8, padding: "9px 14px", marginBottom: 12, fontSize: 12, color: C.navy, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span>
                <strong>{compatibles.length}</strong> tamaño{compatibles.length !== 1 ? "s" : ""} compatible{compatibles.length !== 1 ? "s" : ""} con {selectedMachine.nombre}
                {incompatiblesCount > 0 && ` · ${incompatiblesCount} descartado${incompatiblesCount > 1 ? "s" : ""}`}
              </span>
              {incompatiblesCount > 0 && (
                <button onClick={() => setShowIncompatible(s => !s)}
                  style={{ background: "none", border: `1px solid ${C.cyan}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, color: C.cyan, cursor: "pointer", fontWeight: 700 }}>
                  {showIncompatible ? "Ocultar descartados" : "Ver descartados"}
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {results.raw.map(({ sheet, result, compatible }) => (
              <SheetResult key={sheet.label} sheet={sheet} result={result}
                qty={results.qty} mermaPercent={results.merma}
                pricePerKg={results.pricePerKg} gramaje={results.gramaje}
                compatible={compatible} showIncompatible={showIncompatible} />
            ))}
          </div>

          <div style={{ background: "#FFF7F5", border: `1.5px solid ${C.coral}`, borderRadius: 8, padding: "9px 13px", fontSize: 11.5, color: C.muted }}>
            💡 La imposición usa el Tamaño extendido si se captura, o el Tamaño final si no. Margen de Pinza + Rebase: 0.5 cm por lado. Mayor rendimiento aparece primero.
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Badge de estado
// ═══════════════════════════════════════════════════════════════════════════════
function StatusBadge({ status }) {
  const map = {
    enviado:    { label: "Enviado",       bg: C.amber, icon: "⏳" },
    respondido: { label: "Respondido",    bg: C.green, icon: "✓"  },
    vencido:    { label: "Sin respuesta", bg: C.red,   icon: "⚠"  },
  };
  const s = map[status] || map.enviado;
  return (
    <span style={{ background: s.bg, color: "#fff", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {s.icon} {s.label}
    </span>
  );
}

function diasDesde(isoDate) { return Math.floor((Date.now() - new Date(isoDate)) / 86400000); }

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Seguimiento
// ═══════════════════════════════════════════════════════════════════════════════
function RegistrarRespuesta({ sol, onGuardar, onCancelar }) {
  // Panel para capturar precios que mandó el proveedor al responder
  const [precios, setPrecios] = useState({});
  const [procesosActivos, setProcesosActivos] = useState(["impresion", "papel", "flete"]);
  const [guardando, setGuardando] = useState(false);

  const toggleProceso = (key) =>
    setProcesosActivos(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const updatePrecio = (key, val) => setPrecios(prev => ({ ...prev, [key]: val }));

  const guardar = async () => {
    setGuardando(true);
    // Buscar id del proveedor en proveedores_db por nombre
    const proveedoresDb = await storageGet("proveedores_db") || [];
    const provMatch = proveedoresDb.find(p => p.nombre === sol.proveedor);

    if (provMatch) {
      for (const key of procesosActivos) {
        const precio = precios[key];
        if (precio && parseFloat(precio) > 0) {
          await registrarPrecioEnFicha(provMatch.id, key, precio, sol.qty, new Date().toISOString());
        }
      }
    }
    onGuardar();
    setGuardando(false);
  };

  const grupos = [...new Set(PROCESOS_PROVEEDOR.map(p => p.grupo))];

  return (
    <div style={{ marginTop: 12, background: "#F0FFF4", border: `1.5px solid ${C.green}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
        Registrar precios recibidos de {sol.proveedor}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
        Activa los procesos que cotizaron y captura el precio por millar. Estos datos se guardarán en su ficha histórica.
      </div>

      {/* Selector de procesos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
        {PROCESOS_PROVEEDOR.map(p => (
          <button key={p.key} onClick={() => toggleProceso(p.key)} style={{
            background: procesosActivos.includes(p.key) ? (GRUPOS_COLOR[p.grupo] || C.navy) : C.bg,
            color: procesosActivos.includes(p.key) ? "#fff" : C.muted,
            border: `1.5px solid ${procesosActivos.includes(p.key) ? (GRUPOS_COLOR[p.grupo] || C.navy) : C.border}`,
            borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>{p.label}</button>
        ))}
      </div>

      {/* Captura de precios */}
      {procesosActivos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {procesosActivos.map(key => {
            const proc = PROCESOS_PROVEEDOR.find(p => p.key === key);
            if (!proc) return null;
            return (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{proc.label}</div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>$</span>
                  <input value={precios[key] || ""} onChange={e => updatePrecio(key, e.target.value)}
                    type="number" step="0.01" placeholder="0.00"
                    style={{ ...inputStyle, paddingLeft: 20, fontSize: 13, textAlign: "right", padding: "7px 8px 7px 20px" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={guardar} disabled={guardando} style={btn(guardando ? C.muted : C.green)}>
          {guardando ? "Guardando…" : "✓ Guardar y marcar respondido"}
        </button>
        <button onClick={onCancelar} style={{ ...btn(C.muted), background: "none", color: C.muted, border: `1.5px solid ${C.border}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Seguimiento() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordatorioActivo, setRecordatorioActivo] = useState(null);
  const [recordatorioTexto, setRecordatorioTexto] = useState("");
  const [loadingRec, setLoadingRec] = useState(false);
  const [registrandoRespuesta, setRegistrandoRespuesta] = useState(null); // sol.id

  useEffect(() => {
    storageGet("solicitudes").then(d => { setSolicitudes(d || []); setLoading(false); });
  }, []);

  const guardar = async (list) => { setSolicitudes(list); await storageSet("solicitudes", list); };

  const marcarRespondido = (id) => {
    guardar(solicitudes.map(s => s.id === id ? { ...s, status: "respondido", respondido_at: new Date().toISOString() } : s));
    setRegistrandoRespuesta(null);
  };
  const eliminar = (id) => guardar(solicitudes.filter(s => s.id !== id));

  const generarRecordatorio = async (sol) => {
    setLoadingRec(true); setRecordatorioTexto("");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content:
        "Escribe un recordatorio CORTO para un proveedor de impresión que no ha respondido una solicitud de cotización enviada hace " + diasDesde(sol.fechaEnvio) + " días. Proveedor: " + sol.proveedor + ". Producto: " + sol.producto + ". Menos de 5 líneas. Sin firmas largas."
      }] }),
    });
    const data = await res.json();
    setRecordatorioTexto(data.content?.map(b => b.text || "").join("") || "Error.");
    setLoadingRec(false);
  };

  if (loading) return <div style={{ color: C.muted, padding: 20, textAlign: "center" }}>Cargando…</div>;
  const vencidas = solicitudes.filter(s => s.status !== "respondido" && diasDesde(s.fechaEnvio) >= 2);

  return (
    <div>
      {vencidas.length > 0 && (
        <div style={{ background: "#FFF3CD", border: `1.5px solid ${C.amber}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
          ⚠ <strong>{vencidas.length} proveedor{vencidas.length > 1 ? "es" : ""}</strong> sin respuesta después de 2+ días.
        </div>
      )}
      {solicitudes.length === 0
        ? <div style={{ color: C.muted, textAlign: "center", padding: "30px 0", fontSize: 13 }}>Sin solicitudes registradas aún.</div>
        : solicitudes.map(sol => {
          const dias = diasDesde(sol.fechaEnvio);
          const st = sol.status === "respondido" ? "respondido" : dias >= 2 ? "vencido" : "enviado";
          return (
            <div key={sol.id} style={{ background: C.card, border: `1.5px solid ${st === "vencido" ? C.red : st === "respondido" ? C.green : C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>{sol.proveedor}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{sol.producto} · {sol.qty?.toLocaleString("es-MX")} pzas</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Enviado {new Date(sol.fechaEnvio).toLocaleDateString("es-MX")} · hace {dias} día{dias !== 1 ? "s" : ""}
                    {sol.respondido_at && <span style={{ color: C.green }}> · Respondido {new Date(sol.respondido_at).toLocaleDateString("es-MX")}</span>}
                  </div>
                </div>
                <StatusBadge status={st} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {st !== "respondido" && <>
                  <button onClick={() => setRegistrandoRespuesta(registrandoRespuesta === sol.id ? null : sol.id)}
                    style={btn(C.green)}>✓ Registrar respuesta</button>
                  <button onClick={() => { setRecordatorioActivo(sol.id === recordatorioActivo ? null : sol.id); generarRecordatorio(sol); }}
                    style={btn(C.navy)}>↺ Recordatorio</button>
                </>}
                {st === "respondido" && (
                  <button onClick={() => setRegistrandoRespuesta(registrandoRespuesta === sol.id ? null : sol.id)}
                    style={{ ...btn(C.cyan), fontSize: 11 }}>+ Agregar precios</button>
                )}
                {sol.waLink && <a href={sol.waLink} target="_blank" rel="noreferrer" style={{ ...btn("#25D366"), textDecoration: "none" }}>WhatsApp ↗</a>}
                <button onClick={() => eliminar(sol.id)} style={{ ...btn(C.red), background: "none", color: C.red, border: `1.5px solid ${C.red}` }}>Eliminar</button>
              </div>

              {/* Panel registro de respuesta */}
              {registrandoRespuesta === sol.id && (
                <RegistrarRespuesta
                  sol={sol}
                  onGuardar={() => marcarRespondido(sol.id)}
                  onCancelar={() => setRegistrandoRespuesta(null)}
                />
              )}

              {/* Panel recordatorio */}
              {recordatorioActivo === sol.id && (
                <div style={{ marginTop: 12, background: "#F0F7FF", border: `1.5px solid ${C.cyan}`, borderRadius: 8, padding: 12, fontSize: 13 }}>
                  {loadingRec ? <span style={{ color: C.muted }}>Generando…</span> : <>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{recordatorioTexto}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => navigator.clipboard.writeText(recordatorioTexto)} style={btn(C.cyan)}>Copiar</button>
                      <a href={"https://wa.me/?text=" + encodeURIComponent(recordatorioTexto)} target="_blank" rel="noreferrer" style={{ ...btn("#25D366"), textDecoration: "none" }}>WA ↗</a>
                    </div>
                  </>}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE SERVICIO y TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
const TIPOS_SERVICIO = [
  "Impresión offset",
  "Papel / Sustrato",
  "Barniz UV",
  "Laminado",
  "Troquel / Suaje",
  "Encuadernación",
  "Foil / Relieve",
  "Otro",
];

const VARIABLES = [
  { key: "{producto}",         label: "Producto",           ejemplo: "Caja plegadiza 4/0" },
  { key: "{medida_final}",     label: "Medida final",        ejemplo: "10×7 cm" },
  { key: "{medida_extendida}", label: "Medida extendida",    ejemplo: "12×9 cm" },
  { key: "{cantidad}",         label: "Cantidad",            ejemplo: "1,000 piezas" },
  { key: "{pliego}",           label: "Tamaño de pliego",    ejemplo: "70×95 cm" },
  { key: "{pliegos_totales}",  label: "Pliegos totales",     ejemplo: "1,053" },
  { key: "{gramaje}",          label: "Gramaje",             ejemplo: "300 g/m²" },
  { key: "{merma}",            label: "% Merma",             ejemplo: "5%" },
  { key: "{fecha}",            label: "Fecha",               ejemplo: "28/06/2026" },
];

const DEFAULT_TEMPLATES = {
  "Impresión offset": `Buen día,

Les escribo para solicitar cotización de impresión offset con las siguientes especificaciones:

Producto: {producto}
Medida final: {medida_final}
Medida extendida: {medida_extendida}
Cantidad: {cantidad}
Tamaño de pliego: {pliego}
Pliegos totales (incluye {merma} merma): {pliegos_totales}
Gramaje del sustrato: {gramaje}

Favor de cotizar incluyendo: precio por millar o pieza, tiempo de entrega y si el precio incluye barniz UV o plastificado.

Quedo en espera de su cotización.
Mr. Blue Laboratorios Creativos`,

  "Papel / Sustrato": `Buen día,

Solicito cotización de papel/sustrato para producción offset:

Producto destino: {producto}
Gramaje requerido: {gramaje}
Tamaño de pliego: {pliego}
Cantidad de pliegos: {pliegos_totales}
Fecha de solicitud: {fecha}

Favor de indicar precio por kg o por millar de pliegos, disponibilidad inmediata y tiempo de entrega.

Gracias,
Mr. Blue Laboratorios Creativos`,

  "Barniz UV": `Buen día,

Les solicito cotización de servicio de barniz UV para el siguiente trabajo:

Producto: {producto}
Medida final: {medida_final}
Cantidad: {cantidad}
Pliegos a barnizar: {pliegos_totales}
Fecha de solicitud: {fecha}

Requiero cotización de barniz UV total y selectivo por separado, con tiempo de entrega estimado.

Mr. Blue Laboratorios Creativos`,

  "Laminado": `Buen día,

Solicito cotización de laminado para:

Producto: {producto}
Medida final: {medida_final}
Cantidad: {cantidad}
Pliegos: {pliegos_totales}
Fecha: {fecha}

Favor cotizar laminado mate y brillante por separado, indicando precio por millar de pliegos.

Mr. Blue Laboratorios Creativos`,

  "Troquel / Suaje": `Buen día,

Necesito cotización de troquel/suaje para:

Producto: {producto}
Medida extendida: {medida_extendida}
Cantidad: {cantidad}
Fecha de solicitud: {fecha}

¿Cuentan con el troquel o requieren fabricación? Favor de incluir costo de suaje si aplica.

Mr. Blue Laboratorios Creativos`,

  "Encuadernación": `Buen día,

Solicito cotización de encuadernación para:

Producto: {producto}
Medida final: {medida_final}
Cantidad: {cantidad}
Fecha: {fecha}

Favor de cotizar engrapado y pegado perfecto por separado, con tiempo de entrega.

Mr. Blue Laboratorios Creativos`,

  "Foil / Relieve": `Buen día,

Requiero cotización de foil metálico / relieve (embossing) para:

Producto: {producto}
Medida final: {medida_final}
Cantidad: {cantidad}
Pliegos: {pliegos_totales}
Fecha: {fecha}

Favor indicar colores de foil disponibles y si cuentan con el cliché o se fabrica aparte.

Mr. Blue Laboratorios Creativos`,

  "Otro": `Buen día,

Solicito cotización para el siguiente trabajo:

Producto: {producto}
Medida final: {medida_final}
Medida extendida: {medida_extendida}
Cantidad: {cantidad}
Pliego: {pliego}
Pliegos totales: {pliegos_totales}
Gramaje: {gramaje}
Merma: {merma}
Fecha: {fecha}

Quedo en espera de su propuesta.
Mr. Blue Laboratorios Creativos`,
};

// ── Resuelve variables en un template ────────────────────────────────────────
function resolveTemplate(tpl, vars) {
  return tpl
    .replace(/{producto}/g,         vars.producto         || "—")
    .replace(/{medida_final}/g,      vars.medida_final      || "—")
    .replace(/{medida_extendida}/g,  vars.medida_extendida  || "—")
    .replace(/{cantidad}/g,          vars.cantidad          || "—")
    .replace(/{pliego}/g,            vars.pliego            || "—")
    .replace(/{pliegos_totales}/g,   vars.pliegos_totales   || "—")
    .replace(/{gramaje}/g,           vars.gramaje           || "—")
    .replace(/{merma}/g,             vars.merma             || "—")
    .replace(/{fecha}/g,             vars.fecha             || "—");
}

// ── Módulo: Editor de templates ──────────────────────────────────────────────
function AdminTemplates() {
  const [templates, setTemplates] = useState({});
  const [selectedTipo, setSelectedTipo] = useState(TIPOS_SERVICIO[0]);
  const [texto, setTexto] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storageGet("templates_servicio").then(d => {
      const t = d || DEFAULT_TEMPLATES;
      setTemplates(t);
      setTexto(t[TIPOS_SERVICIO[0]] || DEFAULT_TEMPLATES[TIPOS_SERVICIO[0]] || "");
      setLoading(false);
    });
  }, []);

  const switchTipo = (tipo) => {
    setSelectedTipo(tipo);
    setTexto(templates[tipo] || DEFAULT_TEMPLATES[tipo] || "");
    setSaved(false);
  };

  const guardar = async () => {
    const updated = { ...templates, [selectedTipo]: texto };
    setTemplates(updated);
    await storageSet("templates_servicio", updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const restaurar = () => {
    setTexto(DEFAULT_TEMPLATES[selectedTipo] || "");
    setSaved(false);
  };

  const insertVar = (v) => setTexto(t => t + v);

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando…</div>;

  return (
    <div>
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 4 }}>
          Templates de solicitud de cotización
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Edita el texto de cada template. Usa las variables entre llaves — se reemplazan automáticamente al generar el mensaje.
        </div>

        {/* Selector de tipo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {TIPOS_SERVICIO.map(t => (
            <button key={t} onClick={() => switchTipo(t)} style={{
              background: selectedTipo === t ? C.navy : C.bg,
              color: selectedTipo === t ? "#fff" : C.muted,
              border: `1.5px solid ${selectedTipo === t ? C.navy : C.border}`,
              borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>

        {/* Variables disponibles */}
        <div style={{ background: "#F0F7FF", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Variables disponibles — clic para insertar al final
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {VARIABLES.map(v => (
              <button key={v.key} onClick={() => insertVar(v.key)} title={`Ejemplo: ${v.ejemplo}`} style={{
                background: C.cyan, color: "#fff", border: "none",
                borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace",
              }}>{v.key}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            Hover sobre cada variable para ver un ejemplo del valor que tomará.
          </div>
        </div>

        {/* Editor */}
        <label style={labelStyle}>Template: {selectedTipo}</label>
        <textarea
          value={texto}
          onChange={e => { setTexto(e.target.value); setSaved(false); }}
          style={{ ...inputStyle, height: 260, resize: "vertical", fontSize: 13, lineHeight: 1.7, fontFamily: "monospace" }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={guardar} style={btn(C.cyan)}>
            {saved ? "✓ Guardado" : "Guardar template"}
          </button>
          <button onClick={restaurar} style={{ ...btn(C.muted), background: "none", color: C.muted, border: `1.5px solid ${C.border}` }}>
            Restaurar original
          </button>
          <span style={{ fontSize: 11, color: C.muted }}>
            Los cambios se guardan por tipo de servicio de forma independiente.
          </span>
        </div>
      </div>

      {/* Preview */}
      <div style={{ ...cardStyle, borderColor: C.border }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
          Vista previa con datos de ejemplo
        </div>
        <div style={{ background: C.bg, borderRadius: 7, padding: "14px 16px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: C.text, fontFamily: "Inter, sans-serif" }}>
          {resolveTemplate(texto, {
            producto: "Caja plegadiza 4/0",
            medida_final: "10×7 cm",
            medida_extendida: "12×9 cm",
            cantidad: "1,000 piezas",
            pliego: "70×95 cm",
            pliegos_totales: "1,053",
            gramaje: "300 g/m²",
            merma: "5%",
            fecha: new Date().toLocaleDateString("es-MX"),
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Envío de solicitud
// ═══════════════════════════════════════════════════════════════════════════════
function EnvioSolicitud({ calcData }) {
  const [proveedores, setProveedores] = useState([{ nombre: "", email: "", telefono: "" }]);
  const [desc, setDesc] = useState("");
  const [producto, setProducto] = useState("");
  const [tipoServicio, setTipoServicio] = useState(TIPOS_SERVICIO[0]);
  const [resendKey, setResendKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [mensajeGenerado, setMensajeGenerado] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  const addProv = () => setProveedores([...proveedores, { nombre: "", email: "", telefono: "" }]);
  const updateProv = (i, f, v) => { const p = [...proveedores]; p[i][f] = v; setProveedores(p); };
  const removeProv = (i) => setProveedores(proveedores.filter((_, idx) => idx !== i));

  const best = calcData?.raw?.find(r => r.compatible !== false) ?? calcData?.raw?.[0];
  const bestLabel = best?.sheet.label ?? "—";
  const bestTotal = best?.result.piecesPerSheet > 0 && calcData
    ? Math.ceil(Math.ceil(calcData.qty / best.result.piecesPerSheet) * (1 + calcData.merma / 100)) : null;

  const buildVars = () => ({
    producto:         producto || desc || "—",
    medida_final:     calcData ? calcData.pw + "×" + calcData.ph + " cm" : "—",
    medida_extendida: calcData && calcData.extW ? calcData.extW + "×" + calcData.extH + " cm" : "—",
    cantidad:         calcData ? calcData.qty.toLocaleString("es-MX") + " piezas" : "—",
    pliego:           bestLabel,
    pliegos_totales:  bestTotal ? bestTotal.toLocaleString("es-MX") : "—",
    gramaje:          calcData ? calcData.gramaje + " g/m²" : "—",
    merma:            calcData ? calcData.merma + "%" : "—",
    fecha:            new Date().toLocaleDateString("es-MX"),
  });

  const aplicarTemplate = async () => {
    setLoadingMsg(true); setMensajeGenerado("");
    const savedTemplates = await storageGet("templates_servicio") || DEFAULT_TEMPLATES;
    const tpl = savedTemplates[tipoServicio] || DEFAULT_TEMPLATES[tipoServicio] || "";
    setMensajeGenerado(resolveTemplate(tpl, buildVars()));
    setLoadingMsg(false);
  };

  const _legacyGenerarMensaje = async () => {
    setLoadingMsg(true); setMensajeGenerado("");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 600, messages: [{ role: "user", content:
        `Eres el asistente de cotizaciones de Mr. Blue Laboratorios Creativos (CDMX). Genera un mensaje profesional y directo para solicitar cotización a un proveedor de impresión offset. Tuteo formal. Sin introducciones largas.

PRODUCTO: ${producto || desc}
DESCRIPCIÓN: ${desc}
MEDIDA FINAL: ${calcData ? `${calcData.pw}×${calcData.ph} cm` : "—"}
${calcData?.extW ? `MEDIDA EXTENDIDA: ${calcData.extW}×${calcData.extH} cm` : ""}
CANTIDAD: ${calcData ? calcData.qty.toLocaleString("es-MX") : "—"} piezas
MEJOR PLIEGO: ${bestLabel}
PLIEGOS (con merma ${calcData?.merma ?? 5}%): ${bestTotal?.toLocaleString("es-MX") ?? "—"}
GRAMAJE: ${calcData?.gramaje ?? "—"} g/m²
${calcData?.machine ? `MÁQUINA SUGERIDA: ${calcData.machine.nombre}` : ""}

Solicita: precio por millar o pieza, tiempo de entrega, si incluye barniz UV/plastificado.`
      }] }),
    });
    const data = await res.json();
    setMensajeGenerado(data.content?.map(b => b.text || "").join("") || "Error.");
    setLoadingMsg(false);
  };

  const enviarTodo = async () => {
    if (!mensajeGenerado || proveedores.every(p => !p.nombre)) return;
    setEnviando(true);
    const res = [];
    for (const prov of proveedores) {
      if (!prov.nombre) continue;
      const entry = { proveedor: prov.nombre, canales: [], waLink: null };
      if (prov.email && resendKey && fromEmail) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
          body: JSON.stringify({ from: fromEmail, to: prov.email, subject: `Solicitud de cotización – ${producto || "Producto offset"} | Mr. Blue`, text: mensajeGenerado }),
        }).catch(() => null);
        entry.canales.push(r?.ok ? "✓ Correo enviado" : "✗ Error al enviar correo");
      } else if (prov.email) {
        entry.canales.push("— Correo: configura API key en ⚙");
      }
      if (prov.telefono) {
        const num = prov.telefono.replace(/\D/g, "");
        entry.waLink = `https://wa.me/${num.startsWith("52") ? num : "52" + num}?text=${encodeURIComponent(mensajeGenerado)}`;
        entry.canales.push("↗ Link WhatsApp listo");
      }
      res.push(entry);
      const existing = await storageGet("solicitudes") || [];
      existing.unshift({ id: crypto.randomUUID(), proveedor: prov.nombre, email: prov.email, telefono: prov.telefono, producto: producto || "Sin nombre", qty: calcData?.qty, fechaEnvio: new Date().toISOString(), status: "enviado", waLink: entry.waLink });
      await storageSet("solicitudes", existing);
    }
    setResultados(res);
    setEnviando(false);
  };

  return (
    <div>
      <div style={{ ...cardStyle, borderColor: showConfig ? C.cyan : C.border }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>⚙ Configuración de envío</span>
          <button onClick={() => setShowConfig(!showConfig)} style={{ background: "none", border: "none", cursor: "pointer", color: C.cyan, fontSize: 13, fontWeight: 700 }}>{showConfig ? "Cerrar ▲" : "Configurar ▼"}</button>
        </div>
        {showConfig && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>API Key de Resend</label>
              <input value={resendKey} onChange={e => setResendKey(e.target.value)} type="password" placeholder="re_xxxxxxxxxxxx" style={inputStyle} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Plan gratuito en <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: C.cyan }}>resend.com</a>: 3,000 correos/mes</div>
            </div>
            <div>
              <label style={labelStyle}>Correo remitente (verificado en Resend)</label>
              <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="cotizaciones@mrblue.com.mx" style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 14 }}>Producto y tipo de servicio</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Nombre del producto</label>
            <input value={producto} onChange={e => setProducto(e.target.value)} placeholder="Ej: Caja plegadiza 4/0, Folleto 4/4…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Descripción del correo del cliente</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Pega aquí la descripción del cliente…" style={{ ...inputStyle, height: 70, resize: "vertical" }} />
          </div>

          {/* Selector de tipo de servicio / template */}
          <div>
            <label style={labelStyle}>Template de solicitud</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TIPOS_SERVICIO.map(t => (
                <button key={t} onClick={() => setTipoServicio(t)} style={{
                  background: tipoServicio === t ? C.navy : C.bg,
                  color: tipoServicio === t ? "#fff" : C.muted,
                  border: `1.5px solid ${tipoServicio === t ? C.navy : C.border}`,
                  borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {calcData && (
            <div style={{ background: "#EAF4FB", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: C.navy }}>
              📐 {calcData.pw}×{calcData.ph} cm{calcData.extW ? ` · ext: ${calcData.extW}×${calcData.extH} cm` : ""} · {calcData.qty.toLocaleString("es-MX")} pzas · {bestLabel} · {bestTotal?.toLocaleString("es-MX") ?? "—"} pliegos · {calcData.gramaje} g/m²{calcData.machine ? ` · ${calcData.machine.nombre}` : ""}
            </div>
          )}

          <button onClick={aplicarTemplate} disabled={loadingMsg} style={btn(loadingMsg ? C.muted : C.navy, true)}>
            {loadingMsg ? "Aplicando…" : `✦ Aplicar template "${tipoServicio}"`}
          </button>
        </div>
      </div>

      {mensajeGenerado && (
        <div style={{ ...cardStyle, borderColor: C.cyan }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>Mensaje generado</span>
            <button onClick={() => navigator.clipboard.writeText(mensajeGenerado)} style={btn(C.cyan)}>Copiar</button>
          </div>
          <textarea value={mensajeGenerado} onChange={e => setMensajeGenerado(e.target.value)} style={{ ...inputStyle, height: 160, resize: "vertical", fontSize: 13, lineHeight: 1.6 }} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Editable antes de enviar.</div>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>Proveedores destinatarios</span>
          <button onClick={addProv} style={btn(C.cyan)}>+ Agregar</button>
        </div>
        {proveedores.map((p, i) => (
          <div key={i} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Proveedor {i + 1}</span>
              {proveedores.length > 1 && <button onClick={() => removeProv(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontWeight: 700, fontSize: 13 }}>✕</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 10px" }}>
              {[["Nombre", "nombre", "Imprenta López"], ["Correo", "email", "ventas@imprenta.mx"], ["WhatsApp", "telefono", "5512345678"]].map(([lbl, fld, ph]) => (
                <div key={fld}>
                  <label style={labelStyle}>{lbl}</label>
                  <input value={p[fld]} onChange={e => updateProv(i, fld, e.target.value)} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {mensajeGenerado && proveedores.some(p => p.nombre) && (
        <button onClick={enviarTodo} disabled={enviando} style={{ ...btn(enviando ? C.muted : C.coral, true), marginBottom: 16 }}>
          {enviando ? "Enviando…" : `✉ Enviar a ${proveedores.filter(p => p.nombre).length} proveedor${proveedores.filter(p => p.nombre).length > 1 ? "es" : ""}`}
        </button>
      )}

      {resultados.length > 0 && (
        <div style={{ ...cardStyle, borderColor: C.green }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 12 }}>Resultado</div>
          {resultados.map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{r.proveedor}</div>
              {r.canales.map((c, j) => <div key={j} style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{c}</div>)}
              {r.waLink && <a href={r.waLink} target="_blank" rel="noreferrer" style={{ ...btn("#25D366"), display: "inline-block", marginTop: 6, textDecoration: "none" }}>Abrir WhatsApp ↗</a>}
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Registradas en Seguimiento.</div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("calc");
  const [calcData, setCalcData] = useState(null);

  const tabs = [
    { key: "calc",      label: "📐 Pliegos"         },
    { key: "envio",     label: "✉ Enviar solicitud" },
    { key: "seg",       label: "📋 Seguimiento"      },
    { key: "admin",     label: "🏭 Proveedores"      },
    { key: "templates", label: "📝 Templates"        },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background: C.navy, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 7, height: 26, background: C.cyan, borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 16 }}>Mr. Blue · Cotizador Offset</div>
          <div style={{ fontSize: 11, color: "#8BBDD6" }}>Pliegos · Proveedores · Seguimiento</div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.card, paddingLeft: 16, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", whiteSpace: "nowrap",
            borderBottom: tab === t.key ? `3px solid ${C.cyan}` : "3px solid transparent",
            padding: "11px 16px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13,
            color: tab === t.key ? C.cyan : C.muted, cursor: "pointer", marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "20px 14px" }}>
        {tab === "calc" && (
          <>
            <Calculadora onCalcDone={setCalcData} />
            {calcData && (
              <button onClick={() => setTab("envio")} style={{ ...btn(C.coral, true), marginTop: 4 }}>
                Continuar → Enviar solicitud a proveedores
              </button>
            )}
          </>
        )}
        {tab === "envio"     && <EnvioSolicitud calcData={calcData} />}
        {tab === "seg"       && <Seguimiento />}
        {tab === "admin"     && <AdminProveedores />}
        {tab === "templates" && <AdminTemplates />}
      </div>
    </div>
  );
}

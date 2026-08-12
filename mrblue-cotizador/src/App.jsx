import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Cliente Supabase ────────────────────────────────────────────────────────
// Toma las variables de entorno del proyecto en Vercel (prefijo VITE_ si usas Vite;
// cambia a import.meta.env / process.env según tu bundler).
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

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

// ─── Utilidades de storage ───────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ─── Leer cotización desde URL (?cot=BASE64) ─────────────────────────────────
function parseCotFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("cot");
    if (!raw) return null;
    const json = atob(decodeURIComponent(raw));
    const data = JSON.parse(json);
    window.history.replaceState({}, "", window.location.pathname);
    return data;
  } catch { return null; }
}

function toBool(v) { return v === true || v === "true" || v === 1 || v === "1"; }
function toStr(v)  { return v != null ? String(v).trim() : ""; }

function mapClickUpToCot(raw) {
  const base = emptyCotizacion();
  // Los campos pueden venir ya con nombres del cotizador (desde cotizar.py)
  // o con nombres de ClickUp (desde Make.com). Soportamos ambos.
  return {
    ...base,
    // ── Datos del proyecto ──────────────────────────────────────────────────
    contacto:              "Remedios Flores",  // fijo por ahora
    fecha_respuesta:       toStr(raw.fecha_respuesta || raw.fecha_limite) || "",
    nombre_proyecto:       toStr(raw.nombre_proyecto || raw.proyecto || raw.name) || "",
    cantidad:              toStr(raw.cantidad || raw.cantidad_pz)         || "",
    tipo_producto:         toStr(raw.tipo_producto || raw.producto)       || "",
    prioridad:             toStr(raw.prioridad)                           || base.prioridad,
    detalles:              toStr(raw.detalles || raw.observaciones)       || "",
    // ── Especificaciones técnicas ──────────────────────────────────────────
    papel_acabado_gramaje: toStr(raw.papel_acabado_gramaje || raw.papel || raw.papel_gramaje) || "",
    tamano_extendido:      toStr(raw.tamano_extendido || raw.size_extendido) || "",
    tamano_final:          toStr(raw.tamano_final || raw.size_final)     || "",
    num_tintas:            toStr(raw.num_tintas || raw.tintas)           || "",
    tintas_frente:         toStr(raw.tintas_frente)                      || "",
    tintas_vuelta:         toStr(raw.tintas_vuelta)                      || "",
    lleva_pantone:         toBool(raw.lleva_pantone || raw.pantone),
    pantones:              toStr(raw.pantones)                           || "",
    son_promocionales:     toBool(raw.son_promocionales || raw.promocionales),
    // ── Empaque ────────────────────────────────────────────────────────────
    tipo_empaque_envio:    toStr(raw.tipo_empaque_envio || raw.empaque_envio || raw.tipo_empaque) || "",
    comentarios_empaque:   toStr(raw.comentarios_empaque)                || "",
    direccion:             toStr(raw.direccion)                          || base.direccion,
    // ── Acabados ───────────────────────────────────────────────────────────
    acabados: {
      corte:       toBool(raw.corte),
      alzado:      toBool(raw.alzado),
      suaje:       toBool(raw.suaje),
      serigrafia:  toBool(raw.serigrafia),
      doblez:      toBool(raw.doblez),
      rustica:     toBool(raw.rustica),
      hotmelt:     toBool(raw.hotmelt),
      wireo:       toBool(raw.wireo),
      engrapado:   toBool(raw.engrapado),
      plecado:     toBool(raw.plecado),
      ensobretado: toBool(raw.ensobretado),
      pasta_dura:  toBool(raw.pasta_dura),
      empaque_esp: toBool(raw.empaque_esp),
      hotstamping: toBool(raw.hotstamping),
    },
    laminado:          toBool(raw.laminado),
    tipo_laminado:     toStr(raw.tipo_laminado)     || "",
    caras_laminado:    toStr(raw.caras_laminado)    || "",
    barniz_uv:         toBool(raw.barniz_uv),
    tipo_barniz:       toStr(raw.tipo_barniz)       || "",
    hotstamping_color: toStr(raw.hotstamping_color) || "",
    // ── Meta ───────────────────────────────────────────────────────────────
    folio:             toStr(raw.folio)              || "",
    _from_clickup:     true,
    _clickup_task_id:  toStr(raw.task_id)           || null,
  };
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
function SheetResult({ sheet, result, qty, mermaPercent, pricePerKg, gramaje, compatible, showIncompatible, isSelected, isBest, onSelect }) {
  if (!compatible && !showIncompatible) return null;

  const totalRaw = result.piecesPerSheet > 0 ? Math.ceil(qty / result.piecesPerSheet) : null;
  const totalConMerma = totalRaw ? Math.ceil(totalRaw * (1 + mermaPercent / 100)) : null;
  const mermaExtra = totalConMerma && totalRaw ? totalConMerma - totalRaw : 0;
  const areaM2 = (sheet.w * sheet.h) / 10000;
  const totalKg = totalConMerma ? totalConMerma * (areaM2 * gramaje) / 1000 : null;
  const totalCost = totalKg && pricePerKg ? totalKg * pricePerKg : null;
  const score = result.piecesPerSheet;
  const badgeColor = score >= 8 ? C.green : score >= 4 ? C.amber : C.coral;
  const borderColor = isSelected ? C.cyan : compatible ? C.border : "#DDD";
  const bgColor = isSelected ? "#EAF4FB" : compatible ? C.card : "#F8F8F8";

  return (
    <div
      onClick={compatible && score > 0 ? onSelect : undefined}
      style={{
        background: bgColor,
        border: (isSelected ? "2.5px" : "1.5px") + " solid " + borderColor,
        borderRadius: 10, padding: "14px 16px",
        opacity: compatible ? 1 : 0.45,
        cursor: compatible && score > 0 ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
      }}
    >
      {isSelected && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 22, height: 22, borderRadius: "50%",
          background: C.cyan, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#fff", fontWeight: 700,
        }}>✓</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compatible && score > 0 ? 10 : 0, flexWrap: "wrap", gap: 6, paddingRight: isSelected ? 30 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: compatible ? C.navy : C.muted }}>{sheet.label}</span>
          {isBest && compatible && score > 0 && (
            <span style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>⭐ Más eficiente</span>
          )}
          {!compatible && (
            <span style={{ background: "#DDD", color: "#888", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>Fuera de rango</span>
          )}
        </div>
        {compatible && (
          <span style={{ background: isSelected ? C.cyan : badgeColor, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
            {score > 0 ? score + " pzas/pliego" : "No cabe"}
          </span>
        )}
      </div>
      {compatible && score > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <GridPreview cols={result.cols} rows={result.rows} sheetW={sheet.w} sheetH={sheet.h} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", flex: 1 }}>
            <Stat label="Orientación" value={result.orientation === "horizontal" ? "\u2194 Horizontal" : "\u2195 Vertical"} />
            <Stat label="Cols x Filas" value={result.cols + " x " + result.rows} />
            <Stat label="Pliegos netos" value={totalRaw?.toLocaleString("es-MX") ?? "\u2014"} />
            <Stat label="Merma +" value={mermaExtra > 0 ? "+" + mermaExtra : "0"} />
            <Stat label="Pliegos totales" value={totalConMerma?.toLocaleString("es-MX") ?? "\u2014"} bold />
            <Stat label="Peso estimado" value={totalKg ? totalKg.toFixed(1) + " kg" : "\u2014"} />
            {totalCost && <Stat label="Costo papel" value={"$" + totalCost.toLocaleString("es-MX", { minimumFractionDigits: 2 })} bold accent />}
          </div>
        </div>
      )}
      {compatible && score > 0 && !isSelected && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted, textAlign: "right" }}>Clic para seleccionar</div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Administración de proveedores y máquinas
// ═══════════════════════════════════════════════════════════════════════════════

// ── Catálogo de servicios: ahora vive en Supabase (tabla servicios_catalogo),
// no en el código. Agregar/editar/quitar categorías o servicios se hace desde
// el Table Editor de Supabase y aparece aquí automáticamente.
async function loadServiciosCatalogo() {
  const { data, error } = await supabase
    .from("servicios_catalogo")
    .select("id, nombre, categoria, unidad_precio")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}

// Crea un proceso nuevo directo en servicios_catalogo (desde el botón "+ Agregar
// proceso" de la ficha de un proveedor). Así queda disponible de inmediato para
// todos los proveedores y para la selección automática en 💵 Cotizar.
async function crearServicioCatalogo({ nombre, categoria, unidad_precio }) {
  const { data, error } = await supabase
    .from("servicios_catalogo")
    .insert({ nombre, categoria, unidad_precio, activo: true })
    .select("id, nombre, categoria, unidad_precio")
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

// Paleta que se va asignando en orden a cada categoría que aparezca en el catálogo,
// para que categorías nuevas (agregadas en Supabase) también tengan color sin tocar código.
const PALETA_CATEGORIAS = [C.cyan, C.navy, "#7C4DFF", C.coral, C.green, C.amber, C.purple];
function colorForCategoria(categorias, cat) {
  const idx = categorias.indexOf(cat);
  return idx >= 0 ? PALETA_CATEGORIAS[idx % PALETA_CATEGORIAS.length] : C.muted;
}

const nuevoEscalon = () => ({ id: null, tiraje_min: "", tiraje_max: "", precio: "", tiempo_horas: "", notas: "" });

// Elige el escalón de precio que corresponde a una cantidad dada.
// escalones: [{ tiraje_min, tiraje_max, precio }], tiraje_max vacío/null = "en adelante".
// Formatea horas decimales como "2h 30min" o "45 min" — usado en Cotizar y Enviar solicitud.
function formatoHoras(h) {
  if (h == null) return null;
  if (h < 1) return Math.ceil(h * 60) + " min";
  const horas = Math.floor(h);
  const min = Math.round((h - horas) * 60);
  return horas + "h" + (min > 0 ? " " + min + "min" : "");
}

// Cuando un proveedor tiene varias máquinas con precios distintos para el mismo
// servicio (ej. Impresión en su prensa chica vs. la grande), los escalones se
// guardan bajo una llave compuesta "servicioId__m__maquinaId". Sin máquina
// específica (precio general del proveedor) se usa la llave simple de siempre.
function claveEscalon(servicioId, maquinaId) {
  return maquinaId ? `${servicioId}__m__${maquinaId}` : servicioId;
}
function parseClaveEscalon(clave) {
  const i = clave.indexOf("__m__");
  return i === -1 ? { servicioId: clave, maquinaId: null } : { servicioId: clave.slice(0, i), maquinaId: clave.slice(i + 5) };
}

function seleccionarEscalon(escalones, qty) {
  const q = Math.max(0, parseFloat(qty) || 0);
  const activos = (escalones || []).filter(e => e.precio !== "" && e.precio != null);
  if (!activos.length) return null;
  const ordenados = [...activos].sort((a, b) => (parseFloat(a.tiraje_min) || 0) - (parseFloat(b.tiraje_min) || 0));
  let match = ordenados.find(e => {
    const min = parseFloat(e.tiraje_min) || 0;
    const max = e.tiraje_max === "" || e.tiraje_max == null ? Infinity : parseFloat(e.tiraje_max);
    return q >= min && q <= max;
  });
  if (!match) match = q < (parseFloat(ordenados[0].tiraje_min) || 0) ? ordenados[0] : ordenados[ordenados.length - 1];
  return match;
}

// La cantidad de referencia para elegir escalón, según la unidad del servicio.
// IMPORTANTE: para "por_millar" los escalones se capturan en PLIEGOS/PIEZAS REALES
// (ej. "Desde 1 Hasta 1000", "Desde 1001 Hasta 2000"), no en "número de millar" —
// así que aquí solo se redondea al millar cerrado, sin dividir entre 1000.
function qtyRefParaEscalon(unidad_precio, qty) {
  if (unidad_precio === "por_millar") return Math.ceil((parseFloat(qty) || 0) / 1000) * 1000;
  if (unidad_precio === "fijo") return 0;
  return qty; // por_pieza, unidad, por_kg, por_m2 (el escalón se busca por cantidad de piezas/pliegos)
}

// Costo real para una cantidad dada, según la unidad del servicio.
// Devuelve null si no se puede calcular automáticamente (por_kg necesita el peso real).
// areaM2PorUnidad: solo aplica a "por_m2" — el área (en m²) de UNA pieza o UN pliego,
// según a qué se le esté aplicando el barniz/laminado.
function costoServicioPorCantidad(unidad_precio, precio, qty, areaM2PorUnidad) {
  const p = parseFloat(precio) || 0;
  const q = Math.max(0, parseFloat(qty) || 0);
  if (unidad_precio === "por_millar") return Math.ceil(q / 1000) * p;
  if (unidad_precio === "por_pieza" || unidad_precio === "unidad") return q * p;
  if (unidad_precio === "fijo") return p;
  if (unidad_precio === "por_m2") return areaM2PorUnidad > 0 ? q * areaM2PorUnidad * p : null;
  return null;
}

// Compara dos listas de escalones ignorando el campo `id` (que solo existe en los ya guardados).
function escalonesIguales(a, b) {
  const norm = arr => (arr || [])
    .map(e => `${e.tiraje_min ?? ""}|${e.tiraje_max ?? ""}|${e.precio ?? ""}|${e.tiempo_horas ?? ""}|${e.notas ?? ""}`)
    .sort();
  const na = norm(a), nb = norm(b);
  return na.length === nb.length && na.every((v, i) => v === nb[i]);
}

// Quita acentos y pasa a minúsculas, para que buscar "cuche" encuentre "Couché".

function normalizarTexto(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ── Cronograma general: lista de trabajos activos, guardada en localStorage ──
// (igual que el resto del historial de este Cotizador, vive en este navegador).
const CRONOGRAMA_KEY = "mrblue_cronograma_trabajos";
function loadCronogramaTrabajos() {
  try { return JSON.parse(localStorage.getItem(CRONOGRAMA_KEY) || "[]"); } catch { return []; }
}
function saveCronogramaTrabajos(lista) {
  localStorage.setItem(CRONOGRAMA_KEY, JSON.stringify(lista));
}
// Agrega o actualiza (por id) un trabajo en el cronograma general.
function upsertCronogramaTrabajo(trabajo) {
  const lista = loadCronogramaTrabajos();
  const idx = lista.findIndex(t => t.id === trabajo.id);
  if (idx >= 0) lista[idx] = trabajo; else lista.push(trabajo);
  saveCronogramaTrabajos(lista);
  return lista;
}

// ── Historial de precios cotizados: cada vez que guardas una cotización con
// precios en 💵 Cotizar queda un registro aquí, ligado al mismo cot_id/folio de
// la solicitud — así puedes ver cómo cambiaron los precios de un mismo trabajo
// con el tiempo. Vive en localStorage, igual que el resto del historial.
const HISTORIAL_PRECIOS_KEY = "mrblue_historial_precios";
function loadHistorialPrecios() {
  try { return JSON.parse(localStorage.getItem(HISTORIAL_PRECIOS_KEY) || "[]"); } catch { return []; }
}
function guardarSnapshotPrecio(entrada) {
  const lista = loadHistorialPrecios();
  lista.push(entrada);
  localStorage.setItem(HISTORIAL_PRECIOS_KEY, JSON.stringify(lista));
  return lista;
}
function historialPreciosDe(cotId) {
  return loadHistorialPrecios().filter(h => h.cot_id === cotId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// ── Tabla de merma para cotizar (Anexo 6, Manual de Procedimientos — Proceso Comercial) ──
// Para tirajes chicos es un número fijo de hojas; para los demás rangos es un %, y
// cuando el rango trae "X% al Y%" se interpola en línea recta dentro del rango.
const TABLA_MERMA_IMPRESION = [
  { min: 0,      max: 3000,    tipo: "hojas", val: 300 },
  { min: 3001,   max: 10000,   tipo: "pct",   val: 8 },
  { min: 10001,  max: 20000,   tipo: "pct_rango", desde: 8,   hasta: 6 },
  { min: 20001,  max: 40000,   tipo: "pct",   val: 5 },
  { min: 40001,  max: 60000,   tipo: "pct",   val: 4 },
  { min: 60001,  max: 100000,  tipo: "pct_rango", desde: 4,   hasta: 2 },
  { min: 100001, max: 300000,  tipo: "pct_rango", desde: 2.5, hasta: 1.5 }, // 300,000 es un techo razonable para interpolar; de ahí en adelante se queda en 1.5%
];

// Devuelve { tipo: 'hojas'|'pct', valor } — hojas = número fijo de pliegos extra;
// pct = porcentaje a aplicar sobre el tiraje.
function mermaBaseImpresion(tiraje) {
  const q = Math.max(0, parseFloat(tiraje) || 0);
  const fila = TABLA_MERMA_IMPRESION.find(f => q >= f.min && q <= f.max) || TABLA_MERMA_IMPRESION[TABLA_MERMA_IMPRESION.length - 1];
  if (fila.tipo === "hojas") return { tipo: "hojas", valor: fila.val };
  if (fila.tipo === "pct") return { tipo: "pct", valor: fila.val };
  // pct_rango: interpola en línea recta entre desde→hasta según dónde cae q en el rango
  const t = fila.max > fila.min ? Math.min(1, Math.max(0, (q - fila.min) / (fila.max - fila.min))) : 0;
  const valor = fila.desde + (fila.hasta - fila.desde) * t;
  return { tipo: "pct", valor: Math.round(valor * 100) / 100 };
}

function fmtP(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Editor de precios de un proveedor ────────────────────────────────────────
// El catálogo de servicios/procesos se lee de Supabase (servicios_catalogo),
// así que agregar o quitar servicios ahí se refleja aquí sin tocar código.
function FichaPrecios({ prov, onSave }) {
  // precios: { [servicio_id]: { escalones: [{id, tiraje_min, tiraje_max, precio, notas}], historial: [...] } }
  const [catalogo, setCatalogo] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [precios, setPrecios] = useState({});
  const [saved, setSaved] = useState(false);
  const [maquinaSelPorServicio, setMaquinaSelPorServicio] = useState({}); // { [servicioId]: maquinaId | null(=General) }

  // ── Formulario "+ Agregar proceso" (nombre, categoría, unidad, precio, horas) ──
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formCategoriaNueva, setFormCategoriaNueva] = useState("");
  const [formUnidad, setFormUnidad] = useState("por_millar");
  const [formPrecio, setFormPrecio] = useState("");
  const [formHoras, setFormHoras] = useState("");
  const [formNotas, setFormNotas] = useState("");
  const [formError, setFormError] = useState("");
  const [guardandoProceso, setGuardandoProceso] = useState(false);

  useEffect(() => {
    let vivo = true;
    setLoadingCat(true);
    loadServiciosCatalogo().then(cat => {
      if (!vivo) return;
      setCatalogo(cat);
      const base = {};
      cat.forEach(s => {
        const existentes = prov.precios?.[s.id]?.escalones || [];
        base[s.id] = {
          escalones: existentes.length ? existentes.map(e => ({ ...e })) : [nuevoEscalon()],
          historial: prov.precios?.[s.id]?.historial || [],
        };
      });
      // Conserva también los precios específicos por máquina (llave "servicioId__m__maquinaId")
      Object.keys(prov.precios || {}).forEach(k => {
        if (k.includes("__m__")) {
          base[k] = {
            escalones: (prov.precios[k].escalones || []).map(e => ({ ...e })),
            historial: prov.precios[k].historial || [],
          };
        }
      });
      setPrecios(base);
      const categorias = [...new Set(cat.map(s => s.categoria))];
      setFormCategoria(categorias[0] || "__nueva__");
      setLoadingCat(false);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prov.id]);

  const updateEscalon = (sid, idx, field, val) =>
    setPrecios(prev => {
      const base = prev[sid] || { escalones: [nuevoEscalon()], historial: [] };
      return { ...prev, [sid]: { ...base, escalones: base.escalones.map((e, i) => i === idx ? { ...e, [field]: val } : e) } };
    });
  const addEscalon = (sid) =>
    setPrecios(prev => {
      const base = prev[sid] || { escalones: [nuevoEscalon()], historial: [] };
      return { ...prev, [sid]: { ...base, escalones: [...base.escalones, nuevoEscalon()] } };
    });
  const removeEscalon = (sid, idx) =>
    setPrecios(prev => {
      const base = prev[sid] || { escalones: [nuevoEscalon()], historial: [] };
      return { ...prev, [sid]: { ...base, escalones: base.escalones.filter((_, i) => i !== idx) } };
    });

  const guardar = () => {
    onSave({ ...prov, precios });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Importar CSV: llena el primer escalón de cada servicio (sin tiraje), comparando por nombre.
  // Formato esperado: nombre,precio (una fila por servicio). No se guarda hasta darle "Guardar precios".
  const [importInfo, setImportInfo] = useState(null); // { matched, total }
  const onImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const filas = parseCsvPrecios(String(ev.target.result || ""));
      let matched = 0;
      setPrecios(prev => {
        const next = { ...prev };
        filas.forEach(({ nombre, precio }) => {
          const s = catalogo.find(c => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
          if (!s) return;
          matched++;
          const actuales = next[s.id]?.escalones || [nuevoEscalon()];
          const primero = { ...actuales[0], precio };
          next[s.id] = { escalones: [primero, ...actuales.slice(1)], historial: next[s.id]?.historial || [] };
        });
        return next;
      });
      setImportInfo({ matched, total: filas.length });
      setTimeout(() => setImportInfo(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const categorias = [...new Set(catalogo.map(s => s.categoria))];
  const tieneAlgunPrecio = (s) =>
    Object.keys(precios).some(k => (k === s.id || k.startsWith(s.id + "__m__")) && (precios[k].escalones || []).some(e => parseFloat(e.precio) > 0));

  // ── Agregar proceso manualmente: si el nombre ya existe en el catálogo lo
  // reutiliza (evita duplicados); si no, lo crea en servicios_catalogo al vuelo
  // para que también quede disponible en 💵 Cotizar.
  const agregarProceso = async () => {
    const nombre = formNombre.trim();
    if (!nombre) { setFormError("Escribe el nombre del proceso."); return; }
    const categoriaFinal = (formCategoria === "__nueva__" ? formCategoriaNueva : formCategoria).trim();
    if (!categoriaFinal) { setFormError("Elige o escribe una categoría."); return; }

    setFormError("");
    setGuardandoProceso(true);

    let servicio = catalogo.find(c => normalizarTexto(c.nombre) === normalizarTexto(nombre));
    if (!servicio) {
      servicio = await crearServicioCatalogo({ nombre, categoria: categoriaFinal, unidad_precio: formUnidad });
      if (!servicio) {
        setFormError("No se pudo crear el proceso. Intenta de nuevo.");
        setGuardandoProceso(false);
        return;
      }
      setCatalogo(prev => [...prev, servicio].sort((a, b) =>
        a.categoria === b.categoria ? a.nombre.localeCompare(b.nombre) : a.categoria.localeCompare(b.categoria)));
    }

    setPrecios(prev => {
      const actuales = (prev[servicio.id]?.escalones || []).filter(e => e.precio !== "" && e.precio != null);
      const nuevoEsc = { ...nuevoEscalon(), precio: formPrecio, tiempo_horas: formHoras, notas: formNotas };
      return { ...prev, [servicio.id]: { escalones: [nuevoEsc, ...actuales], historial: prev[servicio.id]?.historial || [] } };
    });

    setFormNombre(""); setFormCategoriaNueva(""); setFormPrecio(""); setFormHoras(""); setFormNotas("");
    setMostrandoForm(false);
    setGuardandoProceso(false);
  };

  if (loadingCat) return <div style={{ color: C.muted, padding: "10px 4px", fontSize: 12 }}>Cargando catálogo…</div>;

  const unidadLabel = { por_millar: "$ / millar", por_pieza: "$ / pieza", unidad: "$ / unidad", por_kg: "$ / kg", por_m2: "$ / m²", fijo: "$ (costo único)" };
  const rangoUnidadLabel = { por_millar: "pliegos/piezas reales — ej. 1 a 1000, 1001 a 2000…", por_pieza: "piezas", unidad: "unidades", por_kg: "kg", por_m2: "pliegos o piezas (el precio ya se multiplica por su área en m²)" };

  const procesosProveedor = catalogo.filter(s => tieneAlgunPrecio(s));
  const hayImpresionVisible = procesosProveedor.some(s => s.categoria === "impresion");

  return (
    <div style={{ marginTop: 14 }}>
      {/* Importar CSV con nombre,precio — llena los campos de abajo sin guardar todavía */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ ...btn(C.muted), background: "none", color: C.muted, border: `1.5px solid ${C.border}`, cursor: "pointer" }}>
          📥 Importar CSV (nombre,precio)
          <input type="file" accept=".csv" onChange={onImportCsv} style={{ display: "none" }} />
        </label>
        {importInfo && (
          <span style={{ fontSize: 11, color: importInfo.matched > 0 ? C.green : C.red, fontWeight: 700 }}>
            {importInfo.matched} de {importInfo.total} filas coincidieron con el catálogo{importInfo.matched < importInfo.total ? " (revisa nombres exactos para las demás)" : ""}
          </span>
        )}
      </div>

      {/* Agregar proceso manualmente (nombre, tiempo y precio) */}
      <div style={{ marginBottom: 14 }}>
        {!mostrandoForm && (
          <button onClick={() => setMostrandoForm(true)} style={btn(C.navy)}>+ Agregar proceso</button>
        )}

        {mostrandoForm && (
          <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: 14, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Nuevo proceso</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Nombre del proceso</label>
                <input value={formNombre} onChange={e => setFormNombre(e.target.value)}
                  list="mrb-procesos-existentes" placeholder="Ej. Barniz UV mate" style={inputStyle} />
                <datalist id="mrb-procesos-existentes">
                  {catalogo.map(s => <option key={s.id} value={s.nombre} />)}
                </datalist>
              </div>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select value={formCategoria} onChange={e => setFormCategoria(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="__nueva__">+ Nueva categoría…</option>
                </select>
                {formCategoria === "__nueva__" && (
                  <input value={formCategoriaNueva} onChange={e => setFormCategoriaNueva(e.target.value)}
                    placeholder="Nombre de la categoría" style={{ ...inputStyle, marginTop: 6 }} />
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={labelStyle}>Unidad de precio</label>
                <select value={formUnidad} onChange={e => setFormUnidad(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  {Object.entries(unidadLabel).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Precio</label>
                <input value={formPrecio} onChange={e => setFormPrecio(e.target.value)}
                  type="number" step="0.01" placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Horas (opcional)</label>
                <input value={formHoras} onChange={e => setFormHoras(e.target.value)}
                  type="number" step="0.5" placeholder="—" style={inputStyle} />
              </div>
            </div>

            <input value={formNotas} onChange={e => setFormNotas(e.target.value)}
              placeholder="Notas (incluye setup, planchas, condiciones especiales…)"
              style={{ ...inputStyle, marginBottom: 10 }} />

            {formError && <div style={{ color: C.red, fontSize: 11.5, marginBottom: 8 }}>{formError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={agregarProceso} disabled={guardandoProceso} style={btn(C.cyan)}>
                {guardandoProceso ? "Agregando…" : "Agregar"}
              </button>
              <button onClick={() => { setMostrandoForm(false); setFormError(""); }}
                style={{ ...btn(C.bg), color: C.muted, border: `1.5px solid ${C.border}` }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {hayImpresionVisible && (
        <div style={{ background: "#EAF4FB", border: `1.5px solid ${C.cyan}`, borderRadius: 8, padding: "9px 12px", fontSize: 11.5, color: C.text, marginBottom: 12 }}>
          💡 Captura el precio <b>por color</b> (ej. GP Impresores: $600/millar por color), no el total. El sistema multiplica automáticamente por el número de colores según el nombre del servicio ("4/0" = 4 colores, "4/4" = 8 colores).
        </div>
      )}

      {procesosProveedor.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12, padding: "10px 4px" }}>
          Este proveedor todavía no tiene procesos con precio. Usa "+ Agregar proceso" para capturar el primero.
        </div>
      )}

      {procesosProveedor.map(s => {
        const maquinaSel = maquinaSelPorServicio[s.id] ?? null; // null = "General"
        const claveActiva = claveEscalon(s.id, maquinaSel);
        const d = precios[claveActiva] || { escalones: [nuevoEscalon()], historial: [] };
        const esFijo = s.unidad_precio === "fijo";

        return (
          <div key={s.id} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, marginBottom: 10, overflow: "hidden" }}>
            <div style={{ padding: "9px 12px 4px", fontWeight: 700, fontSize: 13, color: C.text }}>
              {s.nombre}
              <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginLeft: 8, textTransform: "capitalize" }}>{s.categoria}</span>
              {esFijo && <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginLeft: 6 }}>(costo único por proyecto)</span>}
            </div>

            {prov.maquinas && prov.maquinas.length > 1 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "4px 12px 8px" }}>
                <button onClick={() => setMaquinaSelPorServicio(prev => ({ ...prev, [s.id]: null }))}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, cursor: "pointer",
                    background: maquinaSel === null ? C.navy : C.card, color: maquinaSel === null ? "#fff" : C.muted,
                    border: `1.5px solid ${maquinaSel === null ? C.navy : C.border}` }}>General (cualquier máquina)</button>
                {prov.maquinas.map(m => (
                  <button key={m.id} onClick={() => setMaquinaSelPorServicio(prev => ({ ...prev, [s.id]: m.id }))}
                    style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 20, cursor: "pointer",
                      background: maquinaSel === m.id ? C.cyan : C.card, color: maquinaSel === m.id ? "#fff" : C.muted,
                      border: `1.5px solid ${maquinaSel === m.id ? C.cyan : C.border}` }}>
                    {m.nombre || "Máquina sin nombre"}
                    {(precios[claveEscalon(s.id, m.id)]?.escalones || []).some(e => parseFloat(e.precio) > 0) ? " ✓" : ""}
                  </button>
                ))}
              </div>
            )}

            {!esFijo && (
              <div style={{ padding: "0 12px", fontSize: 10.5, color: C.muted }}>
                "Desde"/"Hasta" son {rangoUnidadLabel[s.unidad_precio] || "cantidad real"} — no "número de millar".
              </div>
            )}
            {!esFijo && (
              <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 70px 32px", gap: "0 8px",
                padding: "0 12px 4px", fontSize: 10, fontWeight: 700, color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <div>Desde</div><div>Hasta</div><div>{unidadLabel[s.unidad_precio] || "$"}</div><div>Horas</div><div />
              </div>
            )}

            {d.escalones.map((e, idx) => (
              <div key={idx} style={{ display: "grid",
                gridTemplateColumns: esFijo ? "1fr 70px 32px" : "80px 80px 1fr 70px 32px",
                gap: 8, padding: "4px 12px", alignItems: "center" }}>
                {!esFijo && <>
                  <input value={e.tiraje_min} onChange={ev => updateEscalon(claveActiva, idx, "tiraje_min", ev.target.value)}
                    type="number" placeholder="1" title="Cantidad mínima"
                    style={{ ...inputStyle, fontSize: 12, textAlign: "right", padding: "6px 8px" }} />
                  <input value={e.tiraje_max} onChange={ev => updateEscalon(claveActiva, idx, "tiraje_max", ev.target.value)}
                    type="number" placeholder="en adelante" title="Cantidad máxima (vacío = en adelante)"
                    style={{ ...inputStyle, fontSize: 12, textAlign: "right", padding: "6px 8px" }} />
                </>}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>$</span>
                  <input value={e.precio} onChange={ev => updateEscalon(claveActiva, idx, "precio", ev.target.value)}
                    type="number" step="0.01" placeholder="0.00"
                    style={{ ...inputStyle, paddingLeft: 18, fontSize: 12, textAlign: "right", padding: "6px 8px 6px 18px" }} />
                </div>
                <input value={e.tiempo_horas} onChange={ev => updateEscalon(claveActiva, idx, "tiempo_horas", ev.target.value)}
                  type="number" step="0.5" placeholder="—" title="Tiempo estimado (horas) para este escalón"
                  style={{ ...inputStyle, fontSize: 12, textAlign: "right", padding: "6px 8px" }} />
                <button onClick={() => removeEscalon(claveActiva, idx)} title="Quitar escalón"
                  style={{ border: `1px solid ${C.red}`, color: C.red, background: "none", borderRadius: 7, cursor: "pointer", height: 28 }}>×</button>
              </div>
            ))}

            <div style={{ padding: "4px 12px 8px" }}>
              {!esFijo && (
                <button onClick={() => addEscalon(claveActiva)} style={{ ...btn(C.card, true), color: C.navy, border: `1.5px dashed ${C.border}`, fontSize: 11, padding: "5px 10px" }}>
                  + Agregar escalón
                </button>
              )}
              <input value={d.escalones[0]?.notas || ""} onChange={ev => updateEscalon(claveActiva, 0, "notas", ev.target.value)}
                placeholder="Notas (incluye setup, planchas, condiciones especiales…)"
                style={{ ...inputStyle, fontSize: 11, padding: "4px 8px", color: C.muted, marginTop: 6 }} />
            </div>

            {/* Historial mini */}
            {(d.historial || []).length > 0 && (
              <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.historial.slice(-4).map((h, i) => (
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

// ── Capa de datos: Proveedores, Máquinas y Tarifas (Supabase) ────────────────
// Reconstruye la misma forma que usaba proveedores_db en window.storage:
//   [{ id, nombre, maquinas:[...], precios:{ [servicio_id]: { escalones:[{tiraje_min,tiraje_max,precio,notas}], historial:[] } } }]
// para no tener que tocar los componentes que ya consumen ese shape.
// precios ahora se indexa por el id real del servicio en servicios_catalogo,
// así que no depende de una lista fija de "claves" escrita en el código.

async function loadProveedoresDB() {
  const { data: provs, error: e1 } = await supabase
    .from("proveedores").select("id, nombre, tipo, calificacion, merma_personalizada, email, whatsapp, contacto_nombre").order("nombre");
  if (e1) { console.error(e1); return []; }

  const { data: maqs } = await supabase.from("maquinas").select("*");
  const { data: tarifas } = await supabase
    .from("tarifas")
    .select("id, proveedor_id, servicio_id, maquina_id, precio, tiempo_horas, notas_precio, tiraje_min, tiraje_max, qty_referencia, activo, created_at")
    .order("tiraje_min", { ascending: true, nullsFirst: true });

  return (provs || []).map(p => {
    const maquinas = (maqs || [])
      .filter(m => m.proveedor_id === p.id)
      .map(m => ({
        id: m.id, nombre: m.nombre, tipo: m.tipo,
        minW: m.min_w ?? "", minH: m.min_h ?? "",
        maxW: m.max_w ?? "", maxH: m.max_h ?? "",
        colores: m.colores || [], tiraje_minimo: m.tiraje_minimo ?? "", notas: m.notas || "",
        pliegoEstandarW: m.pliego_estandar_w ?? "", pliegoEstandarH: m.pliego_estandar_h ?? "",
        velocidadHora: m.velocidad_hora ?? "",
      }));

    // precios[claveEscalon(servicio_id, maquina_id)] = { escalones: [{id, tiraje_min, tiraje_max, precio, notas}], historial: [...] }
    // Sin máquina específica = precio general del proveedor (llave = servicio_id solo).
    const precios = {};
    (tarifas || []).filter(t => t.proveedor_id === p.id && t.servicio_id).forEach(t => {
      const clave = claveEscalon(t.servicio_id, t.maquina_id);
      if (!precios[clave]) precios[clave] = { escalones: [], historial: [] };
      precios[clave].historial.push({
        id: t.id, precio: t.precio, fecha: t.created_at, qty: t.qty_referencia,
        tiraje_min: t.tiraje_min, tiraje_max: t.tiraje_max, activo: t.activo,
      });
      // activo === null cubre filas de antes de la migración (se tratan como vigentes)
      if (t.activo !== false) {
        precios[clave].escalones.push({
          id: t.id, tiraje_min: t.tiraje_min ?? "", tiraje_max: t.tiraje_max ?? "",
          precio: t.precio, tiempo_horas: t.tiempo_horas ?? "", notas: t.notas_precio || "",
        });
      }
    });

    return { id: p.id, nombre: p.nombre, tipo: p.tipo || "Otro", calificacion: p.calificacion || 0, mermaPersonalizada: p.merma_personalizada ?? "", email: p.email || "", whatsapp: p.whatsapp || "", contactoNombre: p.contacto_nombre || "", maquinas, precios };
  });
}

const TIPOS_PROVEEDOR = ["Impresores", "Papel", "Acabados Manuales", "Suaje", "Laminado", "Barniz", "Hotstamping", "Hotmelt", "Cajas", "Serigrafía", "Maquila de sobre", "Tintas Especiales", "Fletes", "Otro"];
const TIPO_PROVEEDOR_COLOR = {
  "Impresores": C.navy, "Papel": C.cyan, "Acabados Manuales": "#7C4DFF", "Suaje": C.amber,
  "Laminado": "#5B7BA8", "Barniz": "#A85B7B", "Hotstamping": "#B8860B", "Hotmelt": "#8B5E3C",
  "Cajas": "#6B8E23", "Serigrafía": "#4682B4", "Maquila de sobre": "#708090", "Tintas Especiales": "#C71585",
  "Fletes": C.coral, "Otro": C.muted,
};

async function addProveedorDB(nombre, tipo) {
  const { data, error } = await supabase.from("proveedores").insert({ nombre, tipo: tipo || "Otro" }).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

async function updateProveedorTipoDB(id, tipo) {
  const { error } = await supabase.from("proveedores").update({ tipo }).eq("id", id);
  if (error) console.error(error);
}

async function updateProveedorCalificacionDB(id, calificacion) {
  const { error } = await supabase.from("proveedores").update({ calificacion }).eq("id", id);
  if (error) console.error(error);
}

async function updateProveedorMermaDB(id, merma_personalizada) {
  const { error } = await supabase.from("proveedores").update({ merma_personalizada }).eq("id", id);
  if (error) console.error(error);
}

async function updateProveedorContactoDB(id, campo, valor) {
  const { error } = await supabase.from("proveedores").update({ [campo]: valor || null }).eq("id", id);
  if (error) console.error(error);
}

async function loadEntregasProveedor(proveedorId) {
  const { data, error } = await supabase.from("entregas").select("*")
    .eq("proveedor_id", proveedorId).order("fecha_real", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// Registra una entrega y recalcula la calificación del proveedor (promedio de todas sus entregas).
async function registrarEntregaDB({ proveedorId, trabajoNombre, fechaPrometida, fechaReal, calificacion, notas }) {
  const aTiempo = fechaPrometida ? new Date(fechaReal) <= new Date(fechaPrometida) : null;
  const { error: eIns } = await supabase.from("entregas").insert({
    proveedor_id: proveedorId, trabajo_nombre: trabajoNombre,
    fecha_prometida: fechaPrometida || null, fecha_real: fechaReal,
    calificacion, a_tiempo: aTiempo, notas: notas || null,
  });
  if (eIns) { console.error(eIns); return; }

  const entregas = await loadEntregasProveedor(proveedorId);
  const promedio = entregas.length ? entregas.reduce((s, e) => s + Number(e.calificacion), 0) / entregas.length : calificacion;
  await updateProveedorCalificacionDB(proveedorId, Math.round(promedio * 10) / 10);
}

async function deleteProveedorDB(id) {
  const { error } = await supabase.from("proveedores").delete().eq("id", id);
  if (error) console.error(error);
}

async function saveMachineDB(provId, machine) {
  const row = {
    id: machine.id, proveedor_id: provId, nombre: machine.nombre, tipo: machine.tipo,
    min_w: machine.minW || null, min_h: machine.minH || null,
    max_w: machine.maxW || null, max_h: machine.maxH || null,
    colores: machine.colores, tiraje_minimo: machine.tiraje_minimo || null, notas: machine.notas,
    pliego_estandar_w: machine.pliegoEstandarW || null, pliego_estandar_h: machine.pliegoEstandarH || null,
    velocidad_hora: machine.velocidadHora || null,
  };
  const { error } = await supabase.from("maquinas").upsert(row);
  if (error) console.error(error);
}

async function deleteMachineDB(machineId) {
  const { error } = await supabase.from("maquinas").delete().eq("id", machineId);
  if (error) console.error(error);
}

// ── Archivos de proveedor (listas de precios en PDF/Excel) ───────────────────
// Usa el bucket público "proveedor-archivos" en Supabase Storage.
const BUCKET_ARCHIVOS = "proveedor-archivos";

async function uploadArchivoProveedor(provId, file) {
  const path = `${provId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from(BUCKET_ARCHIVOS).upload(path, file);
  if (upErr) { console.error(upErr); return null; }
  const { data: pub } = supabase.storage.from(BUCKET_ARCHIVOS).getPublicUrl(path);
  const { error: insErr } = await supabase.from("proveedor_archivos").insert({
    proveedor_id: provId, nombre_archivo: file.name, url: pub.publicUrl,
  });
  if (insErr) { console.error(insErr); return null; }
  return pub.publicUrl;
}

async function loadArchivosProveedor(provId) {
  const { data, error } = await supabase
    .from("proveedor_archivos").select("*").eq("proveedor_id", provId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function deleteArchivoProveedor(archivoId, url) {
  // Intenta borrar el objeto del storage a partir de la URL pública; si falla, igual borra el registro.
  try {
    const marker = `/${BUCKET_ARCHIVOS}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      const path = url.slice(idx + marker.length);
      await supabase.storage.from(BUCKET_ARCHIVOS).remove([path]);
    }
  } catch (e) { console.error(e); }
  const { error } = await supabase.from("proveedor_archivos").delete().eq("id", archivoId);
  if (error) console.error(error);
}

// Parser CSV simple: espera columnas "nombre,precio" (con encabezado o sin él).
// No requiere librerías externas — suficiente para listas simples exportadas de Excel.
function parseCsvPrecios(text) {
  const lineas = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const filas = [];
  for (let linea of lineas) {
    const cols = linea.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) continue;
    const nombre = cols[0];
    const precio = parseFloat(cols[1].replace(/[^0-9.]/g, ""));
    if (!nombre || Number.isNaN(precio)) continue;
    if (/^(nombre|servicio|producto)$/i.test(nombre)) continue; // salta encabezado
    filas.push({ nombre, precio });
  }
  return filas;
}

// Guarda solo los precios que realmente cambiaron respecto a `previos`, insertando
// una fila nueva en `tarifas` por cada uno (así se conserva el historial completo).
// `precios` viene indexado por servicio_id real, así que se inserta directo.
// Guarda los escalones de precio por servicio. Para cada servicio cuyo set de
// escalones cambió respecto a `previos`: desactiva (activo=false) los escalones
// vigentes anteriores —sin borrarlos, para conservar el historial— e inserta el
// set nuevo completo con activo=true. Si un servicio se quitó por completo de la
// ficha, sus escalones anteriores también se desactivan.
async function savePreciosDB(provId, precios, previos) {
  const todasLasLlaves = new Set([...Object.keys(precios || {}), ...Object.keys(previos || {})]);
  for (const clave of todasLasLlaves) {
    const nuevos = (precios?.[clave]?.escalones || []).filter(e => e.precio !== "" && e.precio != null);
    const anteriores = previos?.[clave]?.escalones || [];
    if (escalonesIguales(nuevos, anteriores)) continue;

    const idsAnteriores = anteriores.map(e => e.id).filter(Boolean);
    if (idsAnteriores.length) {
      const { error: eOff } = await supabase.from("tarifas").update({ activo: false }).in("id", idsAnteriores);
      if (eOff) console.error(eOff);
    }

    if (nuevos.length) {
      const { servicioId, maquinaId } = parseClaveEscalon(clave);
      const rows = nuevos.map(e => ({
        proveedor_id: provId, servicio_id: servicioId, maquina_id: maquinaId,
        precio: parseFloat(e.precio),
        tiraje_min: e.tiraje_min === "" ? null : parseFloat(e.tiraje_min),
        tiraje_max: e.tiraje_max === "" ? null : parseFloat(e.tiraje_max),
        tiempo_horas: e.tiempo_horas === "" || e.tiempo_horas == null ? null : parseFloat(e.tiempo_horas),
        notas_precio: e.notas || null,
        activo: true,
      }));
      const { error: eIns } = await supabase.from("tarifas").insert(rows);
      if (eIns) console.error(eIns);
    }
  }
}

async function registrarPrecioEnFicha(proveedorId, servicioId, precio, qty, fecha) {
  const { error } = await supabase.from("tarifas").insert({
    proveedor_id: proveedorId, servicio_id: servicioId,
    precio: parseFloat(precio),
    qty_referencia: qty ? parseInt(qty) : null,
    activo: true,
  });
  if (error) console.error(error);
}

const emptyMachine = () => ({
  id: crypto.randomUUID(), nombre: "", tipo: "Offset",
  minW: "", minH: "", maxW: "", maxH: "",
  colores: [], tiraje_minimo: "", notas: "",
  pliegoEstandarW: "", pliegoEstandarH: "", velocidadHora: "",
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
        <div>
          <label style={labelStyle}>Pliego estándar preferido — Ancho (cm)</label>
          <input value={machine.pliegoEstandarW} type="number" step="0.1"
            onChange={e => onChange({ ...machine, pliegoEstandarW: e.target.value })}
            placeholder="Ej: 56" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pliego estándar preferido — Alto (cm)</label>
          <input value={machine.pliegoEstandarH} type="number" step="0.1"
            onChange={e => onChange({ ...machine, pliegoEstandarH: e.target.value })}
            placeholder="Ej: 87" style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Velocidad (pliegos por hora)</label>
          <input value={machine.velocidadHora} type="number" step="1"
            onChange={e => onChange({ ...machine, velocidadHora: e.target.value })}
            placeholder="Ej: 5000" style={inputStyle} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Se usa para estimar el tiempo de producción en las cotizaciones.</div>
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

// ── Archivos de un proveedor: subir PDF/Excel de su lista de precios y verla después ──
function HistorialEntregas({ proveedorId }) {
  const [entregas, setEntregas] = useState(null); // null = cargando

  useEffect(() => { loadEntregasProveedor(proveedorId).then(setEntregas); }, [proveedorId]);

  if (entregas === null) return <div style={{ color: C.muted, fontSize: 12, padding: "10px 0" }}>Cargando…</div>;

  if (entregas.length === 0) {
    return (
      <div style={{ marginTop: 14, color: C.muted, fontSize: 12.5 }}>
        Todavía no hay entregas registradas para este proveedor. Se registran desde 📅 Cronograma cuando marcas un trabajo como entregado.
      </div>
    );
  }

  const promedio = entregas.reduce((s, e) => s + Number(e.calificacion), 0) / entregas.length;
  const aTiempoCount = entregas.filter(e => e.a_tiempo === true).length;
  const conDatoPuntualidad = entregas.filter(e => e.a_tiempo != null).length;
  const pctATiempo = conDatoPuntualidad ? Math.round((aTiempoCount / conDatoPuntualidad) * 100) : null;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 700 }}>Calificación promedio</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F5A623" }}>{"★".repeat(Math.round(promedio))}{"☆".repeat(5 - Math.round(promedio))} <span style={{ fontSize: 12, color: C.text }}>({promedio.toFixed(1)})</span></div>
        </div>
        {pctATiempo != null && (
          <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 700 }}>Entregas a tiempo</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: pctATiempo >= 80 ? C.green : pctATiempo >= 50 ? C.amber : C.coral }}>{pctATiempo}%</div>
          </div>
        )}
        <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 700 }}>Total de entregas</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{entregas.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entregas.map(e => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{e.trabajo_nombre || "Sin nombre"}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {new Date(e.fecha_real).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                {e.notas ? " · " + e.notas : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#F5A623", fontSize: 13 }}>{"★".repeat(e.calificacion)}{"☆".repeat(5 - e.calificacion)}</div>
              {e.a_tiempo != null && (
                <div style={{ fontSize: 10, fontWeight: 700, color: e.a_tiempo ? C.green : C.coral }}>{e.a_tiempo ? "A tiempo" : "Tarde"}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchivosProveedor({ provId }) {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const recargar = async () => { setArchivos(await loadArchivosProveedor(provId)); setLoading(false); };
  useEffect(() => { recargar(); }, [provId]);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setSubiendo(true);
    const url = await uploadArchivoProveedor(provId, file);
    setSubiendo(false);
    e.target.value = "";
    if (!url) { setError("No se pudo subir el archivo. Revisa que el bucket 'proveedor-archivos' exista y sea público."); return; }
    await recargar();
  };

  const borrar = async (id, url) => { await deleteArchivoProveedor(id, url); await recargar(); };

  const extIcon = (nombre) => {
    const ext = (nombre || "").split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📕";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
    return "📄";
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        Sube la lista de precios del proveedor (PDF, Excel o CSV) para tenerla a la mano y consultarla cuando la necesites.
      </div>

      <label style={{ ...btn(subiendo ? C.muted : C.amber), display: "inline-block", cursor: subiendo ? "default" : "pointer" }}>
        {subiendo ? "Subiendo…" : "📎 Subir archivo"}
        <input type="file" onChange={onFileChange} disabled={subiendo}
          accept=".pdf,.xls,.xlsx,.csv" style={{ display: "none" }} />
      </label>

      {error && <div style={{ marginTop: 8, fontSize: 12, color: C.red }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ color: C.muted, fontSize: 12 }}>Cargando…</div>
        ) : archivos.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12 }}>Sin archivos subidos todavía.</div>
        ) : (
          archivos.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <a href={a.url} target="_blank" rel="noreferrer" style={{ color: C.navy, fontSize: 13, fontWeight: 600, textDecoration: "none", flex: 1 }}>
                {extIcon(a.nombre_archivo)} {a.nombre_archivo}
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{new Date(a.created_at).toLocaleDateString("es-MX")}</span>
                <button onClick={() => borrar(a.id, a.url)}
                  style={{ background: "none", border: "none", color: C.red, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// Input pequeño con guardado en blur, para no disparar recargas de toda la lista mientras escribes.
function MermaProveedorInput({ provId, valorInicial, onSaved }) {
  const [valor, setValor] = useState(valorInicial ?? "");
  const [guardado, setGuardado] = useState(false);
  useEffect(() => { setValor(valorInicial ?? ""); }, [valorInicial]);

  const guardar = async () => {
    const num = valor === "" ? null : parseFloat(valor);
    await updateProveedorMermaDB(provId, num);
    onSaved?.(num);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  return (
    <input value={valor} onChange={e => setValor(e.target.value)} onBlur={guardar}
      type="number" step="0.5" placeholder="usar tabla"
      style={{ width: 70, padding: "3px 6px", fontSize: 11, borderRadius: 5,
        border: `1.5px solid ${guardado ? C.green : C.border}`, background: C.bg, color: C.text }} />
  );
}

function ContactoProveedorInput({ provId, campo, valorInicial, placeholder, width, onSaved }) {
  const [valor, setValor] = useState(valorInicial || "");
  const [guardado, setGuardado] = useState(false);
  useEffect(() => { setValor(valorInicial || ""); }, [valorInicial]);

  const guardar = async () => {
    const limpio = valor.trim();
    await updateProveedorContactoDB(provId, campo, limpio);
    onSaved?.(limpio);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1500);
  };

  return (
    <input value={valor} onChange={e => setValor(e.target.value)} onBlur={guardar}
      placeholder={placeholder}
      style={width === "100%"
        ? { ...inputStyle, border: `1.5px solid ${guardado ? C.green : C.border}` }
        : { width: width || 160, padding: "3px 6px", fontSize: 11, borderRadius: 5,
            border: `1.5px solid ${guardado ? C.green : C.border}`, background: C.bg, color: C.text }} />
  );
}

function AdminProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editingMachine, setEditingMachine] = useState(null);
  const [newProvNombre, setNewProvNombre]   = useState("");
  const [newProvTipo, setNewProvTipo]       = useState(TIPOS_PROVEEDOR[0]);
  const [filtroTipo, setFiltroTipo]         = useState("Todos");
  const [expanded, setExpanded]   = useState({});   // { id: 'maquinas'|'precios'|false }

  const recargar = async () => { setProveedores(await loadProveedoresDB()); setLoading(false); };

  useEffect(() => { recargar(); }, []);

  const addProveedor = async () => {
    if (!newProvNombre.trim()) return;
    const creado = await addProveedorDB(newProvNombre.trim(), newProvTipo);
    setNewProvNombre("");
    if (creado) await recargar();
  };

  const cambiarTipo = async (id, tipo) => { await updateProveedorTipoDB(id, tipo); await recargar(); };

  const deleteProveedor = async (id) => { await deleteProveedorDB(id); await recargar(); };

  const saveMachine = async (provId, machine) => {
    await saveMachineDB(provId, machine.id ? machine : { ...machine, id: crypto.randomUUID() });
    setEditingMachine(null);
    await recargar();
  };

  const deleteMachine = async (provId, machineId) => { await deleteMachineDB(machineId); await recargar(); };

  const savePrecios = async (provActualizado) => {
    const anterior = proveedores.find(p => p.id === provActualizado.id);
    await savePreciosDB(provActualizado.id, provActualizado.precios, anterior?.precios);
    await recargar();
  };

  const toggleSection = (provId, section) =>
    setExpanded(e => ({ ...e, [provId]: e[provId] === section ? false : section }));

  // Actualiza un solo campo de un proveedor en memoria, sin volver a pedirle todo a
  // Supabase — así los inputs de guardado-al-vuelo (merma, contacto) no se ven
  // "borrados" al cerrar y reabrir su sección.
  const actualizarProveedorLocal = (provId, patch) =>
    setProveedores(prev => prev.map(p => p.id === provId ? { ...p, ...patch } : p));

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando…</div>;

  return (
    <div>
      {/* Agregar proveedor */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 12 }}>
          Proveedores registrados
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={newProvNombre} onChange={e => setNewProvNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addProveedor()}
            placeholder="Nombre del proveedor…" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <select value={newProvTipo} onChange={e => setNewProvTipo(e.target.value)}
            style={{ ...inputStyle, width: 150, appearance: "none" }}>
            {TIPOS_PROVEEDOR.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={addProveedor} style={btn(C.cyan)}>+ Agregar</button>
        </div>
      </div>

      {/* Filtro por tipo */}
      {proveedores.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {["Todos", ...TIPOS_PROVEEDOR].map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} style={{
              background: filtroTipo === t ? (TIPO_PROVEEDOR_COLOR[t] || C.navy) : C.bg,
              color: filtroTipo === t ? "#fff" : C.muted,
              border: `1.5px solid ${filtroTipo === t ? (TIPO_PROVEEDOR_COLOR[t] || C.navy) : C.border}`,
              borderRadius: 20, padding: "5px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>{t}</button>
          ))}
        </div>
      )}

      {proveedores.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>
          Sin proveedores. Agrega el primero arriba.
        </div>
      )}

      {proveedores.length > 0 && proveedores.filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo).length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>
          Sin proveedores de tipo "{filtroTipo}".
        </div>
      )}

      {proveedores.filter(p => filtroTipo === "Todos" || p.tipo === filtroTipo).map(prov => {
        const preciosConDatos = Object.values(prov.precios || {}).filter(d => (d?.escalones || []).some(e => parseFloat(e.precio) > 0)).length;
        const maqCount = prov.maquinas?.length ?? 0;

        return (
          <div key={prov.id} style={{ ...cardStyle, marginBottom: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: C.navy }}>{prov.nombre}</div>
                  <select value={prov.tipo || "Otro"} onChange={e => cambiarTipo(prov.id, e.target.value)}
                    style={{
                      background: TIPO_PROVEEDOR_COLOR[prov.tipo] || C.muted, color: "#fff", border: "none",
                      borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", appearance: "none",
                    }}>
                    {TIPOS_PROVEEDOR.map(t => <option key={t} value={t} style={{ color: C.text, background: C.card }}>{t}</option>)}
                  </select>
                  <span title={prov.calificacion > 0 ? "Calificación calculada de sus entregas registradas" : "Sin entregas registradas todavía"}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} style={{ color: n <= Math.round(prov.calificacion || 0) ? "#F5A623" : C.border, fontSize: 15 }}>★</span>
                    ))}
                    {prov.calificacion > 0 && <span style={{ fontSize: 10.5, color: C.muted, marginLeft: 3 }}>({prov.calificacion})</span>}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {maqCount === 0 ? "Sin máquinas" : `${maqCount} máquina${maqCount > 1 ? "s" : ""}`}
                  {preciosConDatos > 0 && <span style={{ marginLeft: 8, color: C.green }}>· {preciosConDatos} proceso{preciosConDatos > 1 ? "s" : ""} con precio</span>}
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 11, color: C.muted }}>Merma personalizada de este proveedor:</label>
                  <MermaProveedorInput provId={prov.id} valorInicial={prov.mermaPersonalizada} onSaved={v => actualizarProveedorLocal(prov.id, { mermaPersonalizada: v ?? "" })} />
                  <span style={{ fontSize: 11, color: C.muted }}>%</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => toggleSection(prov.id, "contacto")}
                  style={{ ...btn(expanded[prov.id] === "contacto" ? C.purple : C.bg),
                    color: expanded[prov.id] === "contacto" ? "#fff" : C.muted,
                    border: `1.5px solid ${expanded[prov.id] === "contacto" ? C.purple : C.border}` }}>
                  📇 Contacto{(prov.email || prov.whatsapp || prov.contactoNombre) && <span style={{ marginLeft: 3 }}>✓</span>}
                </button>
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
                <button onClick={() => toggleSection(prov.id, "archivos")}
                  style={{ ...btn(expanded[prov.id] === "archivos" ? C.amber : C.bg),
                    color: expanded[prov.id] === "archivos" ? "#fff" : C.muted,
                    border: `1.5px solid ${expanded[prov.id] === "archivos" ? C.amber : C.border}` }}>
                  📎 Archivos
                </button>
                <button onClick={() => toggleSection(prov.id, "entregas")}
                  style={{ ...btn(expanded[prov.id] === "entregas" ? "#F5A623" : C.bg),
                    color: expanded[prov.id] === "entregas" ? "#fff" : C.muted,
                    border: `1.5px solid ${expanded[prov.id] === "entregas" ? "#F5A623" : C.border}` }}>
                  📊 Entregas
                </button>
                <button onClick={() => deleteProveedor(prov.id)}
                  style={{ ...btn(C.red), background: "none", color: C.red, border: `1.5px solid ${C.red}` }}>
                  Eliminar
                </button>
              </div>
            </div>

            {/* Sección: Contacto */}
            {expanded[prov.id] === "contacto" && (
              <div style={{ marginTop: 14, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Contacto de este proveedor</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                  <div>
                    <label style={labelStyle}>Nombre de contacto (persona)</label>
                    <ContactoProveedorInput provId={prov.id} campo="contacto_nombre" valorInicial={prov.contactoNombre} placeholder="Ej. Remedios Flores" width="100%" onSaved={v => actualizarProveedorLocal(prov.id, { contactoNombre: v })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Correo</label>
                    <ContactoProveedorInput provId={prov.id} campo="email" valorInicial={prov.email} placeholder="ventas@proveedor.com" width="100%" onSaved={v => actualizarProveedorLocal(prov.id, { email: v })} />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <ContactoProveedorInput provId={prov.id} campo="whatsapp" valorInicial={prov.whatsapp} placeholder="5512345678" width="100%" onSaved={v => actualizarProveedorLocal(prov.id, { whatsapp: v })} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Este nombre es el que se copia en ✉ Enviar solicitud al elegir este proveedor.</div>
              </div>
            )}

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

            {/* Sección: Archivos (listas de precios en PDF/Excel/CSV) */}
            {expanded[prov.id] === "archivos" && (
              <ArchivosProveedor provId={prov.id} />
            )}

            {/* Sección: Historial de entregas y calificaciones */}
            {expanded[prov.id] === "entregas" && (
              <HistorialEntregas proveedorId={prov.id} />
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
function Calculadora({ onCalcDone, cotizacion }) {
  // Pre-fill from cotizacion if available
  const [pw, setPw]   = useState(() => { if (cotizacion?.tamano_final) { const p = cotizacion.tamano_final.split(/[xX×]/); return p[0]?.trim() || "10"; } return "10"; });
  const [ph, setPh]   = useState(() => { if (cotizacion?.tamano_final) { const p = cotizacion.tamano_final.split(/[xX×]/); return p[1]?.trim() || "7"; } return "7"; });
  const [extW, setExtW] = useState(() => { if (cotizacion?.tamano_extendido) { const p = cotizacion.tamano_extendido.split(/[xX×]/); return p[0]?.trim() || ""; } return ""; });
  const [extH, setExtH] = useState(() => { if (cotizacion?.tamano_extendido) { const p = cotizacion.tamano_extendido.split(/[xX×]/); return p[1]?.trim() || ""; } return ""; });
  const [sizeFinal, setSizeFinal] = useState(() => cotizacion?.tamano_final || (pw && ph ? pw + "×" + ph : ""));
  const [sizeExt,   setSizeExt]   = useState(() => cotizacion?.tamano_extendido || "");
  const [qty, setQty] = useState(() => cotizacion?.cantidad || "1000");
  const [merma, setMerma] = useState("5");
  const [mermaAuto, setMermaAuto] = useState(true); // true = se calcula sola con la tabla de merma; false = la editaste a mano
  const [gramaje, setGramaje] = useState(() => {
    if (cotizacion?.papel_acabado_gramaje) {
      // Extrae todos los números del texto (ej: "Sbs 12\nsbs 10 puntos" → ["12","10"])
      const nums = cotizacion.papel_acabado_gramaje.match(/\b(\d+)\b/g);
      if (nums && nums.length > 0) {
        // Filtra números raros (años, IDs) — gramaje suele estar entre 8 y 600
        const valid = nums.filter(n => { const v = parseInt(n); return v >= 8 && v <= 600; });
        if (valid.length > 0) return valid[0];
      }
    }
    return "300";
  });
  const [pricePerKg, setPricePerKg] = useState("0");
  const [papelNombre, setPapelNombre] = useState(() => cotizacion?.papel_acabado_gramaje ? cotizacion.papel_acabado_gramaje.replace(/\n/g, " · ").trim() : "");
  const [results, setResults] = useState(null);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [selectedSheetLabel, setSelectedSheetLabel] = useState(null);

  const calcular = () => {
    const pw_ = parseFloat(pw), ph_ = parseFloat(ph), qty_ = parseInt(qty);
    const extW_ = parseFloat(extW) || null, extH_ = parseFloat(extH) || null;
    const gramaje_ = parseFloat(gramaje) || 300, pkkg = parseFloat(pricePerKg) || 0;
    if (!pw_ || !ph_ || !qty_) return;
    const impW = extW_ || pw_, impH = extH_ || ph_;

    const sheetsWithCompat = filterSheetsByMachine(null);

    const raw = sheetsWithCompat.map(({ label, w, h, compatible }) => ({
      sheet: { label, w, h }, compatible,
      result: calcImposition(w, h, impW, impH),
    })).sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      return b.result.piecesPerSheet - a.result.piecesPerSheet;
    });

    // Auto-select the best compatible sheet (se necesita antes: la tabla de merma se
    // consulta con PLIEGOS, no con piezas — "300001-en adelante" etc. es "hojas de impresión")
    const autoSelect = raw.find(r => r.compatible !== false && r.result.piecesPerSheet > 0);
    const pliegosNetosEst = autoSelect?.result.piecesPerSheet > 0 ? Math.ceil(qty_ / autoSelect.result.piecesPerSheet) : qty_;

    let merma_ = parseFloat(merma) || 0;
    if (mermaAuto) {
      const tabla = mermaBaseImpresion(pliegosNetosEst);
      if (tabla.tipo === "pct") {
        merma_ = tabla.valor;
      } else {
        merma_ = pliegosNetosEst > 0 ? Math.round((tabla.valor / pliegosNetosEst) * 10000) / 100 : 0;
      }
      setMerma(String(merma_));
    }

    const res = { pw: pw_, ph: ph_, extW: extW_, extH: extH_, qty: qty_, merma: merma_, gramaje: gramaje_, pricePerKg: pkkg, papelNombre, raw };
    setResults(res);
    const autoLabel = autoSelect?.sheet.label ?? null;
    setSelectedSheetLabel(autoLabel);
    onCalcDone({ ...res, selectedSheet: autoSelect ? { ...autoSelect.sheet, ...autoSelect.result } : null });
  };

  const compatibles = results?.raw.filter(r => r.compatible) ?? [];
  const autoB = compatibles[0] ?? results?.raw[0];
  // Use selected sheet if set, otherwise fall back to best
  const selectedRow = results?.raw.find(r => r.sheet.label === selectedSheetLabel);
  const best = selectedRow ?? autoB;
  const bestTotal = best?.result.piecesPerSheet > 0
    ? Math.ceil(Math.ceil(results.qty / best.result.piecesPerSheet) * (1 + results.merma / 100)) : null;

  const incompatiblesCount = results?.raw.filter(r => !r.compatible).length ?? 0;

  // When user picks a sheet, update parent calcData
  const selectSheet = (row) => {
    setSelectedSheetLabel(row.sheet.label);
    onCalcDone({ ...results, selectedSheet: { ...row.sheet, ...row.result } });
  };

  return (
    <div>
      {/* Datos del producto */}
      <div style={cardStyle}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 14 }}>Datos del producto</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          <div>
            <label style={labelStyle}>Tamaño final</label>
            <input value={sizeFinal} onChange={e => {
                setSizeFinal(e.target.value);
                const p = e.target.value.split(/[xX×]/);
                setPw(p[0]?.trim() || ""); setPh(p[1]?.trim() || "");
              }}
              style={inputStyle} placeholder="Ej: 21×29 cm" />
          </div>
          <div>
            <label style={labelStyle}>Tamaño extendido <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>opcional</span></label>
            <input value={sizeExt} onChange={e => {
                setSizeExt(e.target.value);
                const p = e.target.value.split(/[xX×]/);
                setExtW(p[0]?.trim() || ""); setExtH(p[1]?.trim() || "");
              }}
              style={inputStyle} placeholder="Ej: 21.7×29.5 cm" />
          </div>
          <div>
            <label style={labelStyle}>Número de piezas</label>
            <input value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} type="number" step="1" />
          </div>
          <div>
            <label style={labelStyle}>Merma (%) {mermaAuto && <span style={{ color: C.green, fontWeight: 400 }}>· según tabla</span>}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={merma} onChange={e => { setMerma(e.target.value); setMermaAuto(false); }} style={inputStyle} type="number" step="0.5" />
              {!mermaAuto && (
                <button onClick={() => setMermaAuto(true)} title="Volver a calcular con la tabla de merma"
                  style={{ ...btn(C.bg, true), color: C.navy, border: `1.5px solid ${C.border}`, padding: "0 10px", whiteSpace: "nowrap" }}>↺ tabla</button>
              )}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Gramaje / Puntos</label>
            <input value={gramaje} onChange={e => setGramaje(e.target.value)}
              style={inputStyle} type="number" step="1"
              placeholder={cotizacion?.papel_acabado_gramaje ? cotizacion.papel_acabado_gramaje.replace(/\n/g, " · ").trim() : "300"} />
          </div>
          <div>
            <label style={labelStyle}>Tipo de papel (para mandarle al papelero)</label>
            <input value={papelNombre} onChange={e => setPapelNombre(e.target.value)}
              style={inputStyle} placeholder="Ej: SBS 10 puntos, Bond 90g, Sulfatada 12 pts" />
            {cotizacion?.papel_acabado_gramaje && papelNombre !== cotizacion.papel_acabado_gramaje.replace(/\n/g, " · ").trim() && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                📄 De la solicitud: {cotizacion.papel_acabado_gramaje.replace(/\n/g, " · ").trim().slice(0, 80)}
              </div>
            )}
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
          <div style={{ background: C.navy, borderRadius: 10, padding: "12px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: selectedSheetLabel && selectedSheetLabel !== autoB?.sheet.label ? 10 : 0 }}>
              {[
                ["Seleccionado", best?.sheet.label ?? "—"],
                ["Pzas/pliego",  best?.result.piecesPerSheet ?? "—"],
                ["Pliegos totales", bestTotal?.toLocaleString("es-MX") ?? "—"],
                ...(results.machine ? [["Máquina", results.machine.nombre]] : []),
                ...(results.extW && results.extH ? [["Extendido", results.extW + "×" + results.extH + " cm"]] : []),
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "#8BBDD6", textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{String(v)}</div>
                </div>
              ))}
            </div>
            {selectedSheetLabel && selectedSheetLabel !== autoB?.sheet.label && (
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#8BBDD6", display: "flex", alignItems: "center", gap: 8 }}>
                <span>⭐ Más eficiente: <strong style={{ color: "#fff" }}>{autoB?.sheet.label}</strong> ({autoB?.result.piecesPerSheet} pzas/pliego)</span>
                <button onClick={() => selectSheet(autoB)} style={{ background: "none", border: "1px solid #8BBDD6", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#8BBDD6", cursor: "pointer", fontWeight: 700 }}>
                  Usar ésta
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {results.raw.map((row) => (
              <SheetResult key={row.sheet.label} sheet={row.sheet} result={row.result}
                qty={results.qty} mermaPercent={results.merma}
                pricePerKg={results.pricePerKg} gramaje={results.gramaje}
                compatible={row.compatible} showIncompatible={showIncompatible}
                isSelected={row.sheet.label === selectedSheetLabel}
                isBest={row.sheet.label === autoB?.sheet.label}
                onSelect={() => selectSheet(row)} />
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
// MÓDULO: Cotizador con precios reales de proveedores
// ═══════════════════════════════════════════════════════════════════════════════
// Junta la cantidad/imposición (pestaña Pliegos) con las tarifas vigentes de cada
// proveedor (Supabase) para armar el costo y el precio de venta. El margen se
// aplica sobre venta (precio = costo / (1 - margen)), igual que la base de Excel.

function Cotizador({ cotizacion, calcData, onTiempoEstimado, onProveedoresUsados }) {
  const [proveedores, setProveedores] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const trabajoIdRef = useRef(crypto.randomUUID()); // id estable si la cotización no tiene cot_id todavía
  const [guardadoCronograma, setGuardadoCronograma] = useState(false);
  const [guardadoPrecio, setGuardadoPrecio] = useState(false);

  // Cantidad de piezas y pliegos necesarios (editable por si no vienen de Pliegos)
  const qtyDefault = parseInt(calcData?.qty) || parseInt(cotizacion?.cantidad) || 0;
  const sel = calcData?.selectedSheet;
  const mermaPct = parseFloat(calcData?.merma) || 0;
  const pliegosCalc = sel && qtyDefault
    ? Math.ceil(Math.ceil(qtyDefault / sel.piecesPerSheet) * (1 + mermaPct / 100))
    : 0;

  const [qtyManual, setQtyManual] = useState("");
  const [pliegosManual, setPliegosManual] = useState("");
  const qty = parseInt(qtyManual) > 0 ? parseInt(qtyManual) : qtyDefault;
  const pliegosBase = parseInt(pliegosManual) > 0 ? parseInt(pliegosManual) : pliegosCalc;

  // Selecciones de la cotización
  const [papelServicioId, setPapelServicioId] = useState("");
  const [papelProvId, setPapelProvId] = useState("");
  const [impServicioId, setImpServicioId] = useState("");
  const [impProvId, setImpProvId] = useState("");
  const [tintasFrente, setTintasFrente] = useState(() => cotizacion?.tintas_frente || "");
  const [tintasVuelta, setTintasVuelta] = useState(() => cotizacion?.tintas_vuelta || "");
  const [llevaPantone, setLlevaPantone] = useState(() => !!cotizacion?.lleva_pantone);
  const coloresIniciales = ["#8899AA", "#D4A017", "#5B7BA8", "#A85B7B", "#5BA870"];
  const [pantonesList, setPantonesList] = useState(() =>
    cotizacion?.pantones
      ? [{ id: crypto.randomUUID(), codigo: cotizacion.pantones, color: coloresIniciales[0] }]
      : []);
  const [colorExtraServicioId, setColorExtraServicioId] = useState("");
  const [colorExtraProvId, setColorExtraProvId] = useState("");
  const [barnizServicioId, setBarnizServicioId] = useState("");
  const [barnizProvId, setBarnizProvId] = useState("");
  const [acabados, setAcabados] = useState([]); // [{key, servicioId, provId, base}]
  const [costosFijosSel, setCostosFijosSel] = useState({}); // { [servicioId]: provId }
  const [flete, setFlete] = useState("");
  const [cargoUrgenciaPct, setCargoUrgenciaPct] = useState("");
  const [precioRealProveedor, setPrecioRealProveedor] = useState("");
  const [extras, setExtras] = useState("");
  const [margen, setMargen] = useState("35");

  // Merma extra por acabado: +50 pliegos por cada proceso de acabado que lleve el
  // trabajo (barniz máquina, laminado, cualquier acabado manual), según tu tabla.
  const extraMermaAcabados = (barnizServicioId ? 50 : 0) + acabados.filter(a => a.nombre).length * 50;
  const pliegos = pliegosBase + extraMermaAcabados;

  useEffect(() => {
    Promise.all([loadProveedoresDB(), loadServiciosCatalogo()]).then(([p, c]) => {
      setProveedores(p); setCatalogo(c); setLoading(false);
    });
  }, []);

  const servicioPorId = (id) => catalogo.find(s => s.id === id);

  // "provId" en Cotizar en realidad puede ser un proveedor solo (precio general) o
  // un proveedor + una de sus máquinas específicas, combinados en un solo id con
  // el mismo truco que usamos para guardar precios: "proveedorId__m__maquinaId".
  const combinarProvMaquina = (proveedorId, maquinaId) => claveEscalon(proveedorId, maquinaId);
  const separarProvMaquina = (id) => { const r = parseClaveEscalon(id || ""); return { proveedorId: r.servicioId, maquinaId: r.maquinaId }; };

  // Todas las opciones de precio de un proveedor para un servicio: la general
  // (sin máquina específica) más una por cada máquina que tenga precio propio.
  const opcionesPrecio = (prov, servicioId) =>
    Object.keys(prov?.precios || {})
      .filter(k => k === servicioId || k.startsWith(servicioId + "__m__"))
      .map(k => ({ maquinaId: parseClaveEscalon(k).maquinaId, escalones: prov.precios[k].escalones || [] }))
      .filter(op => op.escalones.length > 0);

  // Costo + escalón para UNA combinación proveedor+máquina específica (ya no "la más barata de todas" —
  // eso ahora lo decide el usuario eligiendo la fila que quiera en el comparador).
  const costoYEscalonDe = (provIdCompuesto, servicioId, cantidadReal, coloresOverride, areaM2PorUnidad) => {
    const { proveedorId, maquinaId } = separarProvMaquina(provIdCompuesto);
    const p = proveedores.find(x => x.id === proveedorId);
    const s = servicioPorId(servicioId);
    // Imanes/sustratos rígidos se cobran por pieza, no por pliego — aunque se elijan
    // desde el selector de Papel (que normalmente calcula sobre pliegos).
    const cantidadEfectiva = (s?.categoria === "magnetico" || s?.categoria === "sustrato_rigido") ? qty : cantidadReal;
    const escalones = p?.precios?.[claveEscalon(servicioId, maquinaId)]?.escalones || [];
    if (!escalones.length) return null;
    const escalon = seleccionarEscalon(escalones, qtyRefParaEscalon(s?.unidad_precio, cantidadEfectiva));
    if (!escalon) return null;
    const colores = coloresOverride != null ? coloresOverride : 1;
    const precioEfectivo = (parseFloat(escalon.precio) || 0) * colores;
    const costo = costoServicioPorCantidad(s?.unidad_precio, precioEfectivo, cantidadEfectiva, areaM2PorUnidad);
    return costo != null ? { costo, escalon } : null;
  };

  const costoDe = (provIdCompuesto, servicioId, cantidadReal, coloresOverride, areaM2PorUnidad) =>
    costoYEscalonDe(provIdCompuesto, servicioId, cantidadReal, coloresOverride, areaM2PorUnidad)?.costo ?? null;

  // Área (m²) de UN pliego o UNA pieza, para servicios que se cobran "por_m2" (ej. barniz, laminado).
  const areaM2Para = (base) => {
    if (base === "pliegos") {
      const sh = calcData?.selectedSheet;
      return sh?.w && sh?.h ? (parseFloat(sh.w) / 100) * (parseFloat(sh.h) / 100) : null;
    }
    const w = parseFloat(calcData?.extW) || parseFloat(calcData?.pw);
    const h = parseFloat(calcData?.extH) || parseFloat(calcData?.ph);
    return w && h ? (w / 100) * (h / 100) : null;
  };

  // Tiempo (horas) capturado para el escalón que aplica, si el proveedor lo cargó
  // para esa combinación exacta de proveedor + máquina.
  const tiempoDe = (provIdCompuesto, servicioId, cantidadReal) => {
    const h = parseFloat(costoYEscalonDe(provIdCompuesto, servicioId, cantidadReal)?.escalon?.tiempo_horas);
    return h > 0 ? h : null;
  };

  // Proveedores que ya tienen precio para ese servicio, con el costo ya calculado
  // para `cantidadReal`, ordenados del más barato al más caro.
  // ¿Este proveedor ya tiene otro trabajo guardado que se cruza con el rango de fechas dado?
  // Devuelve el nombre del trabajo en conflicto, o null si está libre.
  const proveedorOcupadoEn = (provId, rango) => {
    if (!rango || !rango.inicio || !rango.fin) return null;
    const miId = cotizacion?.cot_id || trabajoIdRef.current;
    const otros = loadCronogramaTrabajos().filter(t => t.id !== miId && (t.proveedoresUsados || []).some(pu => pu.id === provId));
    const conflicto = otros.find(t => {
      const ti = new Date(t.fechaInicio + "T08:00:00").getTime();
      const tf = new Date(t.fechaEntregaEstimada).getTime();
      return ti < rango.fin && tf > rango.inicio; // se traslapan
    });
    return conflicto ? conflicto.nombre : null;
  };

  const provsConPrecio = (servicioId, cantidadReal, rangoFechas, areaM2PorUnidad) =>
    proveedores.flatMap(p =>
      opcionesPrecio(p, servicioId).map(op => {
        const idCompuesto = combinarProvMaquina(p.id, op.maquinaId);
        const r = costoYEscalonDe(idCompuesto, servicioId, cantidadReal, undefined, areaM2PorUnidad);
        if (!r) return null;
        const maquina = op.maquinaId ? p.maquinas?.find(m => m.id === op.maquinaId) : null;
        return {
          id: idCompuesto, proveedorId: p.id, maquinaId: op.maquinaId,
          nombre: p.nombre + (maquina ? " · " + (maquina.nombre || "máquina") : ""),
          tipo: p.tipo, calificacion: p.calificacion || 0,
          precio: r.costo,
          tiempo: parseFloat(r.escalon?.tiempo_horas) > 0 ? parseFloat(r.escalon.tiempo_horas) : null,
          notasEscalon: r.escalon?.notas || "",
          maquinaInfo: maquina || null,
          ocupado: rangoFechas ? proveedorOcupadoEn(p.id, rangoFechas) : null,
        };
      })
    ).filter(p => p != null && p.precio > 0)
      .sort((a, b) => a.precio - b.precio);


  const nombreServicio = (id) => catalogo.find(s => s.id === id)?.nombre || "—";
  const nombreProv = (idCompuesto) => {
    const { proveedorId, maquinaId } = separarProvMaquina(idCompuesto);
    const p = proveedores.find(x => x.id === proveedorId);
    if (!p) return "—";
    const maquina = maquinaId ? p.maquinas?.find(m => m.id === maquinaId) : null;
    return p.nombre + (maquina ? " · " + (maquina.nombre || "máquina") : "");
  };

  const serviciosDe = (cats, patronNombre) => catalogo.filter(s =>
    cats.includes(s.categoria) && (!patronNombre || s.nombre.toLowerCase().includes(patronNombre.toLowerCase())));

  // Solo servicios que al menos un proveedor realmente vende (tiene precio cargado).
  // Así el cotizador nunca ofrece papeles/procesos sin proveedor detrás.
  const serviciosDisponibles = (cats, cantidadReal, patronNombre) =>
    serviciosDe(cats, patronNombre).filter(s => provsConPrecio(s.id, cantidadReal).length > 0);

  // Etiqueta para dropdowns: nombre + proveedor más barato + precio + cuántos más lo venden
  const etiquetaServicio = (s, cantidadReal) => {
    const provs = provsConPrecio(s.id, cantidadReal);
    if (!provs.length) return s.nombre;
    const top = provs[0];
    const extra = provs.length > 1 ? ` (+${provs.length - 1} más)` : "";
    return `${s.nombre} — ${top.nombre} $${top.precio.toLocaleString("es-MX")}${extra}`;
  };

  // Al elegir servicio, autoselecciona el proveedor más barato
  const elegirServicio = (servicioId, setServ, setProv, cantidadReal) => {
    setServ(servicioId);
    const provs = provsConPrecio(servicioId, cantidadReal);
    setProv(provs.length ? provs[0].id : "");
  };

  const addAcabado = () =>
    setAcabados(prev => [...prev, { key: Date.now() + Math.random(), servicioId: "", provId: "", base: "piezas", nombre: "", precio: "", horas: "" }]);
  const updAcabado = (key, patch) =>
    setAcabados(prev => prev.map(a => a.key === key ? { ...a, ...patch } : a));
  const delAcabado = (key) => setAcabados(prev => prev.filter(a => a.key !== key));

  // ── Costos ──
  const tf = parseInt(tintasFrente) || 0;
  const tv = parseInt(tintasVuelta) || 0;
  const coloresManual = (tf + tv) > 0 ? (tf + tv) : null; // si ambos están vacíos, usa 1 por defecto
  const cantidadPantones = Math.max(pantonesList.filter(p => p.codigo).length || pantonesList.length, 1);

  const costoPapel = papelProvId && papelServicioId && pliegos
    ? (costoDe(papelProvId, papelServicioId, pliegos) || 0) : 0;
  const costoImp = impProvId && impServicioId && pliegos
    ? (costoDe(impProvId, impServicioId, pliegos, coloresManual != null ? coloresManual : undefined) || 0) : 0;
  const costoColorExtra = colorExtraProvId && colorExtraServicioId && pliegos
    ? (costoDe(colorExtraProvId, colorExtraServicioId, pliegos, cantidadPantones) || 0) : 0;
  const costoBarniz = barnizProvId && barnizServicioId && pliegos
    ? (costoDe(barnizProvId, barnizServicioId, pliegos) || 0) : 0;
  const costoAcabados = acabados.reduce((sum, a) => sum + (parseFloat(a.precio) || 0), 0);
  const costoFlete = parseFloat(flete) || 0;
  const costoExtras = parseFloat(extras) || 0;
  const serviciosFijos = catalogo.filter(s => s.unidad_precio === "fijo" && s.categoria !== "suaje");
  const costoFijosSeleccionados = Object.entries(costosFijosSel).reduce((sum, [sid, pid]) => sum + (costoDe(pid, sid, 0) || 0), 0);
  const subtotalAntesDeUrgencia = costoPapel + costoImp + costoColorExtra + costoBarniz + costoAcabados + costoFijosSeleccionados + costoFlete + costoExtras;
  const costoUrgencia = subtotalAntesDeUrgencia * ((parseFloat(cargoUrgenciaPct) || 0) / 100);
  const costoTotal = subtotalAntesDeUrgencia + costoUrgencia;

  const desgloseArr = [
    papelServicioId && { label: "Papel · " + nombreServicio(papelServicioId), prov: nombreProv(papelProvId), v: costoPapel },
    impServicioId && { label: "Impresión · " + nombreServicio(impServicioId), prov: nombreProv(impProvId), v: costoImp },
    colorExtraServicioId && { label: "Pantone · " + nombreServicio(colorExtraServicioId), prov: nombreProv(colorExtraProvId), v: costoColorExtra },
    barnizServicioId && { label: "Barniz máquina · " + nombreServicio(barnizServicioId), prov: nombreProv(barnizProvId), v: costoBarniz },
    ...acabados.filter(a => a.nombre && parseFloat(a.precio) > 0).map(a => ({
      label: "Acabado · " + a.nombre, prov: "", v: parseFloat(a.precio) || 0,
    })),
    ...Object.entries(costosFijosSel).map(([sid, pid]) => ({
      label: nombreServicio(sid), prov: nombreProv(pid), v: costoDe(pid, sid, 0) || 0,
    })),
    costoFlete > 0 && { label: "Flete", prov: "", v: costoFlete },
    costoExtras > 0 && { label: "Extras", prov: "", v: costoExtras },
    costoUrgencia > 0 && { label: "Cargo por urgencia (+" + cargoUrgenciaPct + "%)", prov: "", v: costoUrgencia },
  ].filter(Boolean);


  // ── Tiempo estimado de producción ──
  // Si elegiste una máquina específica de Impresión, usa su velocidad; si el proveedor
  // se eligió "general" (sin máquina), usa la primera máquina suya con velocidad cargada.
  const maquinaDe = (provIdCompuesto) => {
    const { proveedorId, maquinaId } = separarProvMaquina(provIdCompuesto);
    const p = proveedores.find(x => x.id === proveedorId);
    if (maquinaId) return (p?.maquinas || []).find(m => m.id === maquinaId) || null;
    return (p?.maquinas || []).find(m => parseFloat(m.velocidadHora) > 0) || null;
  };
  const maquinaImp = impProvId ? maquinaDe(impProvId) : null;
  const horasEstimadas = maquinaImp && pliegos && parseFloat(maquinaImp.velocidadHora) > 0
    ? pliegos / parseFloat(maquinaImp.velocidadHora) : null;
  const m = Math.min(Math.max(parseFloat(margen) || 0, 0), 90) / 100;
  const precioVenta = costoTotal > 0 ? costoTotal / (1 - m) : 0;
  const utilidad = precioVenta - costoTotal;

  const precioUnitario = qty > 0 ? precioVenta / qty : 0;
  const precioMillar = precioUnitario * 1000;

  const money = (v) => "$" + (v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Cronograma de producción ──
  // Un paso por cada proceso seleccionado. Impresión se calcula sola (velocidad de
  // máquina); los demás son estimaciones editables porque todavía no hay tiempos
  // capturados por proveedor — captúralos aquí cotización por cotización mientras tanto.
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [duracionesManual, setDuracionesManual] = useState({}); // { [key]: horas }

  const pasosCronograma = [];
  if (papelServicioId) {
    const tCap = tiempoDe(papelProvId, papelServicioId, pliegos);
    pasosCronograma.push({ key: "papel", nombre: "Papel — " + nombreServicio(papelServicioId), horasDefault: tCap ?? 24, editable: tCap == null });
  }
  if (impServicioId) pasosCronograma.push({ key: "impresion", nombre: "Impresión — " + nombreServicio(impServicioId), horasDefault: horasEstimadas ?? 4, editable: horasEstimadas == null });
  if (colorExtraServicioId) {
    const tCap = tiempoDe(colorExtraProvId, colorExtraServicioId, pliegos);
    pasosCronograma.push({ key: "pantone", nombre: "Pantone", horasDefault: tCap ?? 2, editable: tCap == null });
  }
  if (barnizServicioId) {
    const tCap = tiempoDe(barnizProvId, barnizServicioId, pliegos);
    pasosCronograma.push({ key: "barniz", nombre: "Barniz máquina", horasDefault: tCap ?? 3, editable: tCap == null });
  }
  acabados.forEach(a => {
    if (a.nombre) {
      const horasManual = parseFloat(a.horas);
      pasosCronograma.push({ key: "acabado_" + a.key, nombre: a.nombre, horasDefault: horasManual > 0 ? horasManual : 24, editable: !(horasManual > 0) });
    }
  });
  if (pasosCronograma.length > 0) pasosCronograma.push({ key: "entrega", nombre: "Empaque y entrega", horasDefault: 4, editable: true });

  let cursor = fechaInicio ? new Date(fechaInicio + "T08:00:00") : null;
  const pasosConFechas = pasosCronograma.map(p => {
    const horas = duracionesManual[p.key] != null ? duracionesManual[p.key] : p.horasDefault;
    const inicio = cursor ? new Date(cursor) : null;
    if (cursor) cursor = new Date(cursor.getTime() + horas * 3600 * 1000);
    const fin = cursor ? new Date(cursor) : null;
    return { ...p, horas, inicio, fin };
  });
  const horasTotales = pasosConFechas.reduce((s, p) => s + (parseFloat(p.horas) || 0), 0);
  const fechaEntregaEstimada = pasosConFechas.length ? pasosConFechas[pasosConFechas.length - 1].fin : null;
  const fmtFecha = (d) => d ? d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—";

  useEffect(() => {
    if (onTiempoEstimado) {
      onTiempoEstimado(horasEstimadas != null || fechaEntregaEstimada ? {
        horas: horasEstimadas, maquinaNombre: maquinaImp?.nombre || "",
        fechaEntregaEstimada, horasTotales,
      } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horasEstimadas, maquinaImp?.nombre, fechaEntregaEstimada?.getTime(), horasTotales]);

  // Avisa hacia arriba (App → Enviar solicitud) qué proveedores reales quedaron
  // elegidos en esta cotización, con su contacto, para poder mandarles el mensaje.
  const idsProveedoresUsados = [papelProvId, impProvId, colorExtraProvId, barnizProvId,
    ...acabados.map(a => a.provId), ...Object.values(costosFijosSel)]
    .filter(Boolean).map(id => separarProvMaquina(id).proveedorId);
  const idsUnicos = [...new Set(idsProveedoresUsados)].join(",");
  useEffect(() => {
    if (onProveedoresUsados) {
      const lista = idsUnicos ? idsUnicos.split(",").map(id => {
        const p = proveedores.find(x => x.id === id);
        return p ? { id: p.id, nombre: p.nombre, tipo: p.tipo, contactoNombre: p.contactoNombre, email: p.email, whatsapp: p.whatsapp } : null;
      }).filter(Boolean) : [];
      onProveedoresUsados(lista);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsUnicos]);



  const copiarDesglose = () => {
    const lineas = [
      ("COTIZACIÓN " + (cotizacion?.folio || "") + " · " + (cotizacion?.nombre_proyecto || "")).trim(),
      "Cantidad: " + qty.toLocaleString("es-MX") + " pzas · Pliegos (c/merma): " + pliegos.toLocaleString("es-MX"),
      sel ? ("Pliego: " + sel.label + " · " + sel.piecesPerSheet + " pzas/pliego") : null,
      horasEstimadas != null ? ("Tiempo estimado de impresión: " + formatoHoras(horasEstimadas) + " (" + maquinaImp.nombre + ")") : null,
      "",
      papelServicioId ? ("Papel — " + nombreServicio(papelServicioId) + " (" + nombreProv(papelProvId) + "): " + money(costoPapel)) : null,
      impServicioId ? ("Impresión — " + nombreServicio(impServicioId) + " (" + nombreProv(impProvId) + "): " + money(costoImp)) : null,
      colorExtraServicioId ? ("Pantone — " + nombreServicio(colorExtraServicioId) + " (" + nombreProv(colorExtraProvId) + "): " + money(costoColorExtra)) : null,
      barnizServicioId ? ("Barniz máquina — " + nombreServicio(barnizServicioId) + " (" + nombreProv(barnizProvId) + "): " + money(costoBarniz)) : null,
      ...acabados.filter(a => a.nombre && parseFloat(a.precio) > 0).map(a =>
        "Acabado — " + a.nombre + ": " + money(parseFloat(a.precio) || 0)),
      ...Object.entries(costosFijosSel).map(([sid, pid]) =>
        nombreServicio(sid) + " — (" + nombreProv(pid) + "): " + money(costoDe(pid, sid, 0) || 0)),
      costoFlete ? ("Flete: " + money(costoFlete)) : null,
      costoExtras ? ("Extras: " + money(costoExtras)) : null,
      costoUrgencia > 0 ? ("Cargo por urgencia (+" + cargoUrgenciaPct + "%): " + money(costoUrgencia)) : null,
      "",
      "COSTO TOTAL: " + money(costoTotal),
      "Margen: " + (m * 100).toFixed(0) + "% · Utilidad: " + money(utilidad),
      "PRECIO DE VENTA: " + money(precioVenta),
      "Precio unitario: " + money(precioUnitario) + " · Por millar: " + money(precioMillar),
    ].filter(l => l !== null);
    navigator.clipboard?.writeText(lineas.join("\n"));
  };

  // ── Sub-UI: selector servicio + proveedor con comparación de precios ──
  const SelectorCosto = ({ titulo, cats, patronNombre, servicioId, provId, setServ, setProv, costo, unidadNota, cantidadReal }) => {
    const rango = fechaInicio && fechaEntregaEstimada
      ? { inicio: new Date(fechaInicio + "T08:00:00").getTime(), fin: fechaEntregaEstimada.getTime() } : null;
    const provs = servicioId ? provsConPrecio(servicioId, cantidadReal, rango) : [];
    const masRapido = provs.length ? [...provs].filter(p => p.tiempo != null).sort((a, b) => a.tiempo - b.tiempo)[0]?.id : null;
    const opciones = serviciosDisponibles(cats, cantidadReal, patronNombre);
    const [busquedaServ, setBusquedaServ] = useState("");
    const [tarjetaAbierta, setTarjetaAbierta] = useState(null);
    const sugerencias = busquedaServ.length >= 2
      ? opciones.filter(s => normalizarTexto(s.nombre).includes(normalizarTexto(busquedaServ))).slice(0, 12)
      : [];
    const elegirYlimpiar = (sid) => { elegirServicio(sid, setServ, setProv, cantidadReal); setBusquedaServ(""); };

    return (
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>{titulo}</div>
          {costo > 0 && <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{money(costo)}</div>}
        </div>

        {opciones.length > 6 && (
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input value={busquedaServ} onChange={e => setBusquedaServ(e.target.value)}
              placeholder={`🔍 Buscar ${titulo.toLowerCase()} por nombre (ej. "couché 250")…`}
              style={{ ...inputStyle, fontSize: 12.5 }} />
            {sugerencias.length > 0 && (
              <div style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "calc(100% + 2px)",
                background: C.card, border: `1.5px solid ${C.cyan}`, borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                maxHeight: 260, overflowY: "auto" }}>
                {sugerencias.map(s => (
                  <div key={s.id} onClick={() => elegirYlimpiar(s.id)}
                    style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {s.nombre}
                  </div>
                ))}
              </div>
            )}
            {busquedaServ.length >= 2 && sugerencias.length === 0 && (
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Sin resultados para "{busquedaServ}".</div>
            )}
          </div>
        )}

        <select value={servicioId} onChange={e => elegirServicio(e.target.value, setServ, setProv, cantidadReal)}
          style={{ ...inputStyle, appearance: "none", marginBottom: 8 }}>
          <option value="">— {opciones.length > 6 ? "O elige de la lista completa" : "Selecciona " + titulo.toLowerCase()} ({opciones.length} disponibles) —</option>
          {opciones.map(s => <option key={s.id} value={s.id}>{etiquetaServicio(s, cantidadReal)}</option>)}
        </select>

        {opciones.length === 0 && (
          <div style={{ fontSize: 12, color: C.coral }}>
            Ningún proveedor tiene precios de {titulo.toLowerCase()} cargados todavía. Cárgalos en 🏭 Proveedores → Precios.
          </div>
        )}

        {provs.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {provs.map((p, i) => {
              const elegido = provId === p.id;
              const abierto = tarjetaAbierta === p.id;
              const tieneDetalle = true; // ahora siempre hay al menos la info de lo que se está pidiendo
              return (
                <div key={p.id}
                  style={{ background: elegido ? "#EAF4FB" : C.bg, border: "1.5px solid " + (elegido ? C.cyan : C.border),
                    borderRadius: 12, padding: "10px 12px", cursor: "pointer", position: "relative",
                    boxShadow: elegido ? "0 2px 8px rgba(0,150,199,0.15)" : "none" }}
                  onClick={() => setProv(p.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, lineHeight: 1.25 }}>{p.nombre}</div>
                    {elegido && <span style={{ color: C.cyan, fontSize: 16, lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "5px 0" }}>
                    {i === 0 && <span style={{ background: C.green, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 9.5, fontWeight: 700 }}>MÁS BARATO</span>}
                    {masRapido === p.id && i !== 0 && <span style={{ background: C.navy, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 9.5, fontWeight: 700 }}>MÁS RÁPIDO</span>}
                    {p.calificacion > 0 && (
                      <span style={{ color: "#F5A623", fontSize: 11 }} title={p.calificacion + "/5"}>
                        {"★".repeat(Math.round(p.calificacion))}{"☆".repeat(5 - Math.round(p.calificacion))}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 17, color: C.navy }}>{money(p.precio)}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>{unidadNota}</div>
                  {p.tiempo != null && <div style={{ fontSize: 11, color: C.muted }}>⏱ {formatoHoras(p.tiempo)}</div>}
                  {p.ocupado && (
                    <div style={{ fontSize: 10.5, color: C.coral, marginTop: 4 }}>⚠ Ya tiene "{p.ocupado}" en fechas parecidas</div>
                  )}

                  {tieneDetalle && (
                    <button onClick={e => { e.stopPropagation(); setTarjetaAbierta(abierto ? null : p.id); }}
                      style={{ marginTop: 6, border: "none", background: "none", color: C.cyan, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                      {abierto ? "▲ Ocultar info" : "▼ Ver info del pedido"}
                    </button>
                  )}
                  {abierto && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.text }}>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Lo que estás pidiendo</div>
                      <div>{qty.toLocaleString("es-MX")} piezas · {pliegos.toLocaleString("es-MX")} pliegos</div>
                      {(calcData?.pw || calcData?.ph) && <div>Medida final: {calcData.pw}×{calcData.ph} cm</div>}
                      {(calcData?.extW || calcData?.extH) && <div>Medida extendida: {calcData.extW}×{calcData.extH} cm</div>}
                      {calcData?.selectedSheet && <div>Pliego: {calcData.selectedSheet.label || `${calcData.selectedSheet.w}×${calcData.selectedSheet.h} cm`}</div>}
                      {(tintasFrente || tintasVuelta) && <div>Tintas: {tintasFrente || 0} frente + {tintasVuelta || 0} vuelta</div>}
                      {llevaPantone && pantonesList.length > 0 && <div>Pantones: {pantonesList.map(p => p.codigo || "(sin código)").join(", ")}</div>}

                      {(p.maquinaInfo || p.notasEscalon) && (
                        <div style={{ fontWeight: 700, color: C.navy, margin: "8px 0 3px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Lo que ofrece {p.nombre}</div>
                      )}
                      {p.maquinaInfo && (
                        <>
                          {p.maquinaInfo.tipo && <div><b>Tipo:</b> {p.maquinaInfo.tipo}</div>}
                          {(p.maquinaInfo.minW || p.maquinaInfo.maxW) && (
                            <div><b>Pliego:</b> {p.maquinaInfo.minW || "?"}×{p.maquinaInfo.minH || "?"} a {p.maquinaInfo.maxW || "?"}×{p.maquinaInfo.maxH || "?"} cm</div>
                          )}
                          {p.maquinaInfo.tiraje_minimo && <div><b>Tiraje mínimo:</b> {p.maquinaInfo.tiraje_minimo}</div>}
                          {p.maquinaInfo.colores?.length > 0 && <div><b>Colores:</b> {p.maquinaInfo.colores.join(", ")}</div>}
                          {p.maquinaInfo.notas && <div style={{ marginTop: 3, color: C.muted }}>{p.maquinaInfo.notas}</div>}
                        </>
                      )}
                      {p.notasEscalon && <div style={{ marginTop: 3, color: C.muted, fontStyle: "italic" }}>"{p.notasEscalon}"</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>Cargando proveedores y catálogo…</div>;

  return (
    <div>
      {/* Datos base del proyecto */}
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
          Datos del proyecto
          {cotizacion?.nombre_proyecto && <span style={{ fontWeight: 400, color: C.muted, marginLeft: 8, fontSize: 12 }}>{cotizacion.nombre_proyecto}</span>}
        </div>
        {!sel && (
          <div style={{ background: "#FFF9E8", border: "1.5px solid " + C.amber, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: C.text, marginBottom: 10 }}>
            💡 Aún no hay imposición seleccionada en 📐 Pliegos. Puedes capturar los pliegos manualmente abajo, o calcularlos primero.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
          <div>
            <label style={labelStyle}>Cantidad de piezas</label>
            <input type="number" value={qtyManual || (qtyDefault || "")} onChange={e => setQtyManual(e.target.value)}
              placeholder="Ej: 10,000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Pliegos necesarios (con merma)</label>
            <input type="number" value={pliegosManual || (pliegosCalc || "")} onChange={e => setPliegosManual(e.target.value)}
              placeholder="Ej: 1,250" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
          <div>
            <label style={labelStyle}>Tintas frente</label>
            <input type="number" min="0" value={tintasFrente} onChange={e => setTintasFrente(e.target.value)}
              placeholder="Ej: 4" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tintas vuelta</label>
            <input type="number" min="0" value={tintasVuelta} onChange={e => setTintasVuelta(e.target.value)}
              placeholder="Ej: 0" style={inputStyle} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          Total: <b>{tf + tv}</b> tintas (define el costo de Impresión, {tf} + {tv})
          {cotizacion?.num_tintas && ` · Capturado en la solicitud: "${cotizacion.num_tintas}"`}
        </div>

        <div style={{ marginTop: 10, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.text, cursor: "pointer" }}>
            <input type="checkbox" checked={llevaPantone} onChange={e => {
              setLlevaPantone(e.target.checked);
              if (e.target.checked && pantonesList.length === 0) {
                setPantonesList([{ id: crypto.randomUUID(), codigo: "", color: coloresIniciales[0] }]);
              }
            }} style={{ accentColor: C.cyan, width: 15, height: 15 }} />
            🎨 Lleva Pantone
          </label>

          {llevaPantone && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {pantonesList.map((p, idx) => (
                <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={p.codigo}
                    onChange={e => setPantonesList(prev => prev.map(x => x.id === p.id ? { ...x, codigo: e.target.value } : x))}
                    placeholder={`Código del Pantone ${idx + 1} (ej. 186 C)`} style={{ ...inputStyle, fontSize: 12.5, flex: 1 }} />
                  <input type="color" value={p.color}
                    onChange={e => setPantonesList(prev => prev.map(x => x.id === p.id ? { ...x, color: e.target.value } : x))}
                    title="Ajusta el color a ojo — no es el Pantone oficial, solo referencia visual"
                    style={{ width: 40, height: 36, border: `1.5px solid ${C.border}`, borderRadius: 6, padding: 2, cursor: "pointer", background: "none" }} />
                  <button onClick={() => setPantonesList(prev => prev.filter(x => x.id !== p.id))}
                    style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                </div>
              ))}
              <button onClick={() => setPantonesList(prev => [...prev, { id: crypto.randomUUID(), codigo: "", color: coloresIniciales[prev.length % coloresIniciales.length] }])}
                style={{ ...btn(C.card, true), color: C.navy, border: `1.5px dashed ${C.border}`, fontSize: 11, padding: "5px 10px", alignSelf: "flex-start" }}>
                + Agregar otro Pantone
              </button>
              <div style={{ fontSize: 10, color: C.muted }}>El color es tu referencia visual a ojo, no el Pantone oficial certificado.</div>
            </div>
          )}
        </div>

        {sel && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
            Pliego {sel.label} · {sel.piecesPerSheet} pzas/pliego · merma {mermaPct}%
          </div>
        )}
      </div>

      <SelectorCosto titulo="Papel" cats={["papel", "magnetico", "sustrato_rigido"]}
        servicioId={papelServicioId} provId={papelProvId}
        setServ={setPapelServicioId} setProv={setPapelProvId}
        costo={costoPapel} unidadNota="(total)" cantidadReal={pliegos} />

      <SelectorCosto titulo="Impresión" cats={["impresion"]}
        servicioId={impServicioId} provId={impProvId}
        setServ={setImpServicioId} setProv={setImpProvId}
        costo={costoImp} unidadNota="(total)" cantidadReal={pliegos} />
      <div style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 12 }}>
        Colores usados: <b>{coloresManual != null ? coloresManual : 1}</b>
        {coloresManual == null && impServicioId ? " (por defecto 1 — captura \"Número de tintas\" arriba si el trabajo lleva más)" : ""}
        {horasEstimadas != null && (
          <span> · ⏱ Tiempo estimado de impresión: <b>{formatoHoras(horasEstimadas)}</b> ({maquinaImp.nombre}, {parseFloat(maquinaImp.velocidadHora).toLocaleString("es-MX")} pliegos/hora)</span>
        )}
        {impProvId && horasEstimadas == null && (
          <span> · Sin velocidad cargada para esta máquina/proveedor — agrégala en 🏭 Proveedores → Máquinas para ver tiempo estimado.</span>
        )}
        {impProvId && proveedores.find(p => p.id === separarProvMaquina(impProvId).proveedorId)?.mermaPersonalizada !== "" && proveedores.find(p => p.id === separarProvMaquina(impProvId).proveedorId)?.mermaPersonalizada != null && (
          <div style={{ marginTop: 4 }}>
            📐 Este proveedor usa su propia merma: <b>{proveedores.find(p => p.id === separarProvMaquina(impProvId).proveedorId).mermaPersonalizada}%</b> (definida en 🏭 Proveedores) — ajusta "Pliegos necesarios" arriba si quieres aplicarla en vez de la de la tabla.
          </div>
        )}
      </div>

      {llevaPantone && pantonesList.length > 0 && (
        <div style={{ background: "#FFF9E8", border: `1.5px solid ${C.amber}`, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: C.text, marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>🎨 Esta cotización lleva {pantonesList.length} Pantone{pantonesList.length > 1 ? "s" : ""} — selecciona el proveedor abajo para cotizarlo.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pantonesList.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: p.color, border: `1.5px solid ${C.border}`, flexShrink: 0 }} title="Referencia visual a ojo, no el Pantone oficial" />
                <span style={{ fontWeight: 600 }}>{p.codigo || "(sin código)"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SelectorCosto titulo="Tintas Especiales / Pantone" cats={["tintas_especiales"]}
        servicioId={colorExtraServicioId} provId={colorExtraProvId}
        setServ={setColorExtraServicioId} setProv={setColorExtraProvId}
        costo={costoColorExtra} unidadNota="(total)" cantidadReal={pliegos} />
      {colorExtraServicioId && (
        <div style={{ marginTop: -8, marginBottom: 12, fontSize: 12, color: C.muted }}>
          Cuántos Pantones: <b style={{ color: C.text }}>{cantidadPantones}</b>
          {pantonesList.length > 0 ? " (según los que agregaste arriba)" : " (agrega sus códigos arriba para que se calcule solo)"}
        </div>
      )}

      <SelectorCosto titulo="Barniz máquina" cats={["barniz"]}
        servicioId={barnizServicioId} provId={barnizProvId}
        setServ={setBarnizServicioId} setProv={setBarnizProvId}
        costo={costoBarniz} unidadNota="(total)" cantidadReal={pliegos} />

      {/* Acabados (múltiples): elige del catálogo (autocompleta precio) o captura libre */}
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>Acabados</div>
          {costoAcabados > 0 && <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{money(costoAcabados)}</div>}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Elige un producto del catálogo (autocompleta el precio de ese proveedor) o escribe uno libre — ambos campos siguen editables.</div>
        {acabados.map(a => {
          const unidadesA = a.base === "pliegos" ? pliegos : qty;
          const areaA = areaM2Para(a.base);
          const provs = a.servicioId ? provsConPrecio(a.servicioId, unidadesA, null, areaA) : [];
          return (
            <div key={a.key} style={{ background: C.bg, border: "1.5px solid " + C.border, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
                <select value={a.servicioId}
                  onChange={e => {
                    const sid = e.target.value;
                    const s = catalogo.find(c => c.id === sid);
                    const ps = provsConPrecio(sid, unidadesA, null, areaM2Para(a.base));
                    const mejor = ps.length ? ps[0] : null;
                    updAcabado(a.key, {
                      servicioId: sid, provId: mejor ? mejor.id : "",
                      nombre: s ? s.nombre : a.nombre,
                      precio: mejor ? String(mejor.precio) : a.precio,
                    });
                  }}
                  style={{ ...inputStyle, appearance: "none", fontSize: 12 }}>
                  <option value="">— Elegir del catálogo (opcional) —</option>
                  {serviciosDisponibles(["acabado", "otro", "laminado", "barniz", "hotstamping", "hotmelt", "cajas", "serigrafia", "maquila_sobre", "suaje"], unidadesA).map(s =>
                    <option key={s.id} value={s.id}>{etiquetaServicio(s, unidadesA)}</option>)}
                </select>
                <select value={a.provId}
                  onChange={e => {
                    const pid = e.target.value;
                    const p = provs.find(x => x.id === pid);
                    updAcabado(a.key, { provId: pid, precio: p ? String(p.precio) : a.precio });
                  }}
                  disabled={provs.length === 0}
                  style={{ ...inputStyle, appearance: "none", fontSize: 12, opacity: provs.length === 0 ? 0.5 : 1 }}>
                  <option value="">— Proveedor —</option>
                  {provs.map((p, i) => <option key={p.id} value={p.id}>{p.nombre} · {money(p.precio)}{i === 0 ? " ⭐" : ""}</option>)}
                </select>
              </div>
              {a.servicioId && (
                <select value={a.base} onChange={e => updAcabado(a.key, { base: e.target.value })}
                  style={{ ...inputStyle, appearance: "none", fontSize: 11, width: 190, padding: "5px 8px", marginBottom: 6 }}>
                  <option value="piezas">Por millar de piezas</option>
                  <option value="pliegos">Por millar de pliegos</option>
                </select>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 28px", gap: 8, alignItems: "center" }}>
                <input value={a.nombre} onChange={e => updAcabado(a.key, { nombre: e.target.value })}
                  placeholder="Nombre del proceso (ej. Barniz UV mate)" style={{ ...inputStyle, fontSize: 12.5 }} />
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>$</span>
                  <input value={a.precio} onChange={e => updAcabado(a.key, { precio: e.target.value })}
                    type="number" step="0.01" placeholder="Precio"
                    style={{ ...inputStyle, fontSize: 12, paddingLeft: 16, padding: "6px 8px 6px 16px" }} />
                </div>
                <input value={a.horas} onChange={e => updAcabado(a.key, { horas: e.target.value })}
                  type="number" step="0.5" placeholder="Horas" title="Tiempo estimado (horas), para el cronograma"
                  style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }} />
                <button onClick={() => delAcabado(a.key)}
                  style={{ background: "none", border: "none", color: C.red, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              {a.servicioId && provs.length === 0 && (
                <div style={{ fontSize: 11, color: C.coral, marginTop: 6 }}>Sin proveedores con precio para este producto — captura el precio a mano abajo.</div>
              )}
            </div>
          );
        })}
        <button onClick={addAcabado} style={{ ...btn(C.bg), color: C.navy, border: "1.5px dashed " + C.border }}>
          + Agregar acabado
        </button>
      </div>

      {serviciosFijos.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>Costos fijos del proyecto</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {serviciosFijos.map(s => {
              const provsDisp = provsConPrecio(s.id, 0);
              const seleccionado = costosFijosSel[s.id];
              const marcado = seleccionado != null;
              const costoLinea = marcado ? (costoDe(seleccionado, s.id, 0) || 0) : 0;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg,
                  border: `1.5px solid ${marcado ? C.cyan : C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                  <input type="checkbox" checked={marcado} style={{ accentColor: C.cyan, width: 16, height: 16 }}
                    disabled={!marcado && provsDisp.length === 0}
                    onChange={e => {
                      setCostosFijosSel(prev => {
                        const next = { ...prev };
                        if (e.target.checked) {
                          // Prioriza el mismo proveedor de Impresión si ya tiene precio de esto; si no, el más barato.
                          const conImp = provsDisp.find(p => p.id === impProvId);
                          next[s.id] = conImp ? conImp.id : provsDisp[0]?.id;
                        } else {
                          delete next[s.id];
                        }
                        return next;
                      });
                    }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{s.nombre}</div>
                  {marcado && provsDisp.length > 1 && (
                    <select value={seleccionado} onChange={e => setCostosFijosSel(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ ...inputStyle, width: 180, padding: "4px 8px", fontSize: 12 }}>
                      {provsDisp.map(p => <option key={p.id} value={p.id}>{p.nombre} · {money(p.precio)}</option>)}
                    </select>
                  )}
                  {marcado && provsDisp.length === 1 && (
                    <div style={{ fontSize: 12, color: C.muted }}>{provsDisp[0].nombre}</div>
                  )}
                  {marcado && <div style={{ fontWeight: 700, color: C.navy, minWidth: 80, textAlign: "right" }}>{money(costoLinea)}</div>}
                  {provsDisp.length === 0 && (
                    <div style={{ fontSize: 11, color: C.coral }}>Sin precio cargado (🏭 Proveedores → Precios)</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {extraMermaAcabados > 0 && (
        <div style={{ background: "#FFF9E8", border: `1.5px solid ${C.amber}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: C.text, marginBottom: 12 }}>
          📐 Merma extra por acabados: +{extraMermaAcabados} pliegos (50 por cada proceso: Barniz máquina, cada acabado agregado). Pliegos base {pliegosBase.toLocaleString("es-MX")} + {extraMermaAcabados} = <b>{pliegos.toLocaleString("es-MX")} pliegos</b> usados para cotizar Papel e Impresión.
        </div>
      )}

      {/* Flete, extras y margen */}
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        {cotizacion?.prioridad && cotizacion.prioridad !== "Normal" && (
          <div style={{ background: "#FFF3E0", border: `1.5px solid ${C.amber}`, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: C.text, marginBottom: 12 }}>
            ⚡ Esta cotización se marcó como <b>{cotizacion.prioridad}</b> en la solicitud — considera un cargo extra por urgencia si el proveedor te lo va a cobrar (pregúntale directo: si el precio ya incluye la urgencia o es aparte).
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 14px" }}>
          <div>
            <label style={labelStyle}>Flete ($)</label>
            <input type="number" value={flete} onChange={e => setFlete(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Extras ($)</label>
            <input type="number" value={extras} onChange={e => setExtras(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cargo por urgencia (%)</label>
            <input type="number" value={cargoUrgenciaPct} onChange={e => setCargoUrgenciaPct(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Margen (%)</label>
            <input type="number" value={margen} onChange={e => setMargen(e.target.value)} placeholder="35" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
          El margen se aplica sobre el precio de venta: precio = costo ÷ (1 − margen). El cargo por urgencia se aplica sobre el subtotal antes del margen.
        </div>
      </div>

      {/* Desglose y resultado */}
      <div style={{ ...cardStyle, background: C.navy, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 12 }}>
          Desglose de costos
        </div>
        {desgloseArr.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#D7E7F2", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <span>{r.label}{r.prov && <span style={{ color: "#8BBDD6", fontSize: 11 }}> · {r.prov}</span>}</span>
            <span style={{ fontWeight: 600 }}>{money(r.v)}</span>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#fff", fontWeight: 700, padding: "10px 0 4px" }}>
          <span>COSTO TOTAL</span><span>{money(costoTotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8BBDD6", padding: "2px 0" }}>
          <span>Utilidad ({(m * 100).toFixed(0)}%)</span><span>{money(utilidad)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, background: C.cyan, borderRadius: 8, padding: "12px 14px" }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 14 }}>PRECIO DE VENTA</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 18 }}>{money(precioVenta)}</span>
        </div>
        {qty > 0 && precioVenta > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D7E7F2", marginTop: 8 }}>
            <span>Unitario: <strong>{money(precioUnitario)}</strong></span>
            <span>Por millar: <strong>{money(precioMillar)}</strong></span>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 4 }}>
          📊 Comparar contra lo que el proveedor cotizó de verdad
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
          Cuando te responda por correo con su precio real, cáptalo aquí — así ves si tu tabla de precios sigue vigente o si el proveedor ya ajustó, y queda guardado en el historial para ver la tendencia con el tiempo.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Precio real cotizado por el proveedor ($)</label>
            <input type="number" value={precioRealProveedor} onChange={e => setPrecioRealProveedor(e.target.value)}
              placeholder="Ej: 37,100" style={inputStyle} />
          </div>
          {parseFloat(precioRealProveedor) > 0 && costoTotal > 0 && (() => {
            const real = parseFloat(precioRealProveedor);
            const diff = real - costoTotal;
            const pctDiff = (diff / costoTotal) * 100;
            const subio = diff > 0;
            return (
              <div style={{ background: subio ? "#FFF3E0" : "#F0FFF4", border: `1.5px solid ${subio ? C.amber : C.green}`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>Vs. tu costo calculado ({money(costoTotal)})</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: subio ? C.coral : C.green }}>
                  {subio ? "▲" : "▼"} {money(Math.abs(diff))} ({subio ? "+" : ""}{pctDiff.toFixed(1)}%)
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={copiarDesglose} disabled={costoTotal <= 0} style={{ ...btn(costoTotal > 0 ? C.coral : C.muted, true), flex: 1 }}>
          📋 Copiar desglose
        </button>
        <button onClick={() => {
          const cotId = cotizacion?.cot_id || trabajoIdRef.current;
          const folioMostrado = cotizacion?.folio || ("SIN-FOLIO-" + cotId.slice(0, 8).toUpperCase());
          guardarSnapshotPrecio({
            id: crypto.randomUUID(), cot_id: cotId, folio: folioMostrado,
            nombre: cotizacion?.nombre_proyecto || "Cotización sin nombre",
            cliente: cotizacion?.cliente || "",
            fecha: new Date().toISOString(),
            tipo: "cotizacion",
            qty, pliegos,
            desglose: desgloseArr.map(r => ({ label: r.label, prov: r.prov, monto: r.v })),
            costoTotal, margenPct: parseFloat(margen) || 0, precioVenta, utilidad,
            precioRealProveedor: parseFloat(precioRealProveedor) || null,
          });
          setGuardadoPrecio(true);
          setTimeout(() => setGuardadoPrecio(false), 2000);
        }} disabled={costoTotal <= 0} style={{ ...btn(costoTotal > 0 ? (guardadoPrecio ? C.green : C.navy) : C.muted, true), flex: 1 }}>
          {guardadoPrecio ? "✓ Guardado" : "💾 Guardar cotización"}
        </button>
      </div>

      {(() => {
        const cotId = cotizacion?.cot_id || trabajoIdRef.current;
        const hist = historialPreciosDe(cotId);
        if (hist.length === 0) return null;
        return (
          <div style={{ ...cardStyle, marginTop: 12 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 8 }}>
              📈 Historial de precios de este folio {hist[0].folio ? "(" + hist[0].folio + ")" : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hist.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 12.5 }}>
                  <span style={{ color: C.muted }}>{new Date(h.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })} · {h.qty?.toLocaleString("es-MX")} pzas</span>
                  <span><b style={{ color: C.navy }}>{money(h.costoTotal)}</b> costo · <b style={{ color: C.coral }}>{money(h.precioVenta)}</b> venta</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {pasosConFechas.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy }}>⏱ Cronograma de producción</div>
            <div>
              <label style={{ fontSize: 11, color: C.muted, marginRight: 6 }}>Inicia:</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                style={{ ...inputStyle, width: 150, padding: "5px 8px", fontSize: 12 }} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
            ✓ verde = calculado con datos reales del proveedor. Los demás (sin ✓) son estimados editables — captúrale el tiempo real a tus proveedores en 🏭 Proveedores → Precios para que se calculen solos.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pasosConFechas.map(p => (
              <div key={p.key} style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr", gap: 10, alignItems: "center",
                background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{p.nombre}</div>
                {p.editable ? (
                  <input type="number" min="0" step="0.5" value={p.horas}
                    onChange={e => setDuracionesManual(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) || 0 }))}
                    style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, textAlign: "right" }} title="Estimado — no hay tiempo capturado, ajústalo si lo sabes" />
                ) : (
                  <div style={{ fontSize: 12, textAlign: "right", fontWeight: 700, color: C.green }} title="Calculado con datos reales del proveedor">✓ {p.horas.toFixed(1)}h</div>
                )}
                <div style={{ fontSize: 11.5, color: C.muted, textAlign: "right" }}>→ {fmtFecha(p.fin)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.muted }}>Total: <b style={{ color: C.text }}>{horasTotales.toFixed(1)} horas</b></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Entrega estimada: {fmtFecha(fechaEntregaEstimada)}</div>
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
            Esto es para cuando el trabajo <b>ya es un pedido confirmado</b> (no solo una cotización) — entra al cronograma para dar seguimiento a la producción real.
          </div>
          <button onClick={() => {
            const id = cotizacion?.cot_id || trabajoIdRef.current;
            const proveedoresUsados = [];
            const addProv = (pidCompuesto) => {
              if (!pidCompuesto) return;
              const { proveedorId } = separarProvMaquina(pidCompuesto);
              if (proveedoresUsados.some(x => x.id === proveedorId)) return;
              const p = proveedores.find(x => x.id === proveedorId);
              if (p) proveedoresUsados.push({ id: p.id, nombre: p.nombre });
            };
            addProv(papelProvId); addProv(impProvId); addProv(colorExtraProvId); addProv(barnizProvId);
            // Los acabados ahora son manuales (sin proveedor propio) — no aportan al cronograma de proveedores.
            upsertCronogramaTrabajo({
              id,
              nombre: cotizacion?.nombre_proyecto || "Cotización sin nombre",
              cliente: cotizacion?.cliente || "",
              fechaInicio: fechaInicio,
              fechaEntregaEstimada: fechaEntregaEstimada ? fechaEntregaEstimada.toISOString() : null,
              horasTotales,
              proveedoresUsados,
              pasos: pasosConFechas.map(p => ({ nombre: p.nombre, inicio: p.inicio?.toISOString(), fin: p.fin?.toISOString() })),
              actualizado: new Date().toISOString(),
            });
            // Deja también un registro fijo en el historial de precios, marcado como
            // la compra real confirmada (a diferencia de las cotizaciones anteriores
            // del mismo folio, que solo eran comparaciones).
            const folioMostrado = cotizacion?.folio || ("SIN-FOLIO-" + id.slice(0, 8).toUpperCase());
            guardarSnapshotPrecio({
              id: crypto.randomUUID(), cot_id: id, folio: folioMostrado,
              nombre: cotizacion?.nombre_proyecto || "Cotización sin nombre",
              cliente: cotizacion?.cliente || "",
              fecha: new Date().toISOString(),
              tipo: "pedido_confirmado",
              qty, pliegos,
              desglose: desgloseArr.map(r => ({ label: r.label, prov: r.prov, monto: r.v })),
              costoTotal, margenPct: parseFloat(margen) || 0, precioVenta, utilidad,
              precioRealProveedor: parseFloat(precioRealProveedor) || null,
              proveedoresUsados,
            });
            setGuardadoCronograma(true);
            setTimeout(() => setGuardadoCronograma(false), 2000);
          }} style={{ ...btn(guardadoCronograma ? C.green : C.navy, true), marginTop: 6, width: "100%" }}>
            {guardadoCronograma ? "✓ Pedido confirmado en el cronograma" : "✅ Ya es pedido — agregar al cronograma"}
          </button>
        </div>
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
  // Panel para capturar precios que mandó el proveedor al responder.
  // El catálogo de servicios se lee de Supabase, igual que en FichaPrecios.
  const [catalogo, setCatalogo] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [precios, setPrecios] = useState({});
  const [procesosActivos, setProcesosActivos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    loadServiciosCatalogo().then(cat => {
      setCatalogo(cat);
      setLoadingCat(false);
    });
  }, []);

  const toggleProceso = (id) =>
    setProcesosActivos(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);

  const updatePrecio = (id, val) => setPrecios(prev => ({ ...prev, [id]: val }));

  const guardar = async () => {
    setGuardando(true);
    // Buscar id del proveedor en Supabase por nombre
    const proveedoresDb = await loadProveedoresDB();
    const provMatch = proveedoresDb.find(p => p.nombre === sol.proveedor);

    if (provMatch) {
      for (const id of procesosActivos) {
        const precio = precios[id];
        if (precio && parseFloat(precio) > 0) {
          await registrarPrecioEnFicha(provMatch.id, id, precio, sol.qty, new Date().toISOString());
        }
      }
    }
    onGuardar();
    setGuardando(false);
  };

  const categorias = [...new Set(catalogo.map(s => s.categoria))];

  return (
    <div style={{ marginTop: 12, background: "#F0FFF4", border: `1.5px solid ${C.green}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: C.navy, marginBottom: 10 }}>
        Registrar precios recibidos de {sol.proveedor}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
        Activa los servicios que cotizaron y captura el precio. Estos datos se guardarán en su ficha histórica.
      </div>

      {loadingCat ? (
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Cargando catálogo…</div>
      ) : (
        <>
          {/* Selector de servicios */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {catalogo.map(s => (
              <button key={s.id} onClick={() => toggleProceso(s.id)} style={{
                background: procesosActivos.includes(s.id) ? colorForCategoria(categorias, s.categoria) : C.bg,
                color: procesosActivos.includes(s.id) ? "#fff" : C.muted,
                border: `1.5px solid ${procesosActivos.includes(s.id) ? colorForCategoria(categorias, s.categoria) : C.border}`,
                borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{s.nombre}</button>
            ))}
          </div>

          {/* Captura de precios */}
          {procesosActivos.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {procesosActivos.map(id => {
                const proc = catalogo.find(s => s.id === id);
                if (!proc) return null;
                return (
                  <div key={id} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{proc.nombre}</div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>$</span>
                      <input value={precios[id] || ""} onChange={e => updatePrecio(id, e.target.value)}
                        type="number" step="0.01" placeholder="0.00"
                        style={{ ...inputStyle, paddingLeft: 20, fontSize: 13, textAlign: "right", padding: "7px 8px 7px 20px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Cronograma general — vista tipo Gantt de todos los trabajos guardados
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: Historial de cotizaciones — todos los folios con sus precios a través del tiempo
// ═══════════════════════════════════════════════════════════════════════════════
function HistorialPreciosCotizaciones() {
  const money = (v) => "$" + (v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(null); // cot_id expandido
  const todas = loadHistorialPrecios();

  // Agrupa por cot_id, más reciente primero dentro de cada grupo y entre grupos.
  const grupos = {};
  todas.forEach(h => {
    if (!grupos[h.cot_id]) grupos[h.cot_id] = [];
    grupos[h.cot_id].push(h);
  });
  let listaGrupos = Object.entries(grupos).map(([cotId, entradas]) => {
    const ordenadas = [...entradas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    return { cotId, ultima: ordenadas[0], entradas: ordenadas };
  }).sort((a, b) => new Date(b.ultima.fecha) - new Date(a.ultima.fecha));

  if (busqueda.trim()) {
    listaGrupos = listaGrupos.filter(g =>
      normalizarTexto(g.ultima.folio).includes(normalizarTexto(busqueda)) ||
      normalizarTexto(g.ultima.nombre).includes(normalizarTexto(busqueda)) ||
      normalizarTexto(g.ultima.cliente).includes(normalizarTexto(busqueda))
    );
  }

  if (todas.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📈</div>
        <div style={{ fontSize: 14 }}>Todavía no has guardado ninguna cotización.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>En 💵 Cotizar, dale "💾 Guardar cotización" para que empiece a aparecer aquí.</div>
      </div>
    );
  }

  const fmtFechaCorta = (f) => new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    + " · " + new Date(f).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 14 }}>📈 Historial de cotizaciones</div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por folio, proyecto o cliente…" style={{ ...inputStyle, marginBottom: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {listaGrupos.map(g => {
          const primera = g.entradas[g.entradas.length - 1];
          const cambio = g.entradas.length > 1 ? g.ultima.costoTotal - primera.costoTotal : 0;
          const abiertoAqui = abierto === g.cotId;
          const tieneConfirmado = g.entradas.some(h => h.tipo === "pedido_confirmado");
          return (
            <div key={g.cotId} style={cardStyle}>
              <div onClick={() => setAbierto(abiertoAqui ? null : g.cotId)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>
                    {g.ultima.folio && <span style={{ background: C.cyan, color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700, marginRight: 7 }}>{g.ultima.folio}</span>}
                    {g.ultima.nombre}
                    {tieneConfirmado && <span style={{ background: C.green, color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 9.5, fontWeight: 700, marginLeft: 7 }}>✅ COMPRADO</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                    {g.ultima.cliente && g.ultima.cliente + " · "}
                    {g.entradas.length} cotización{g.entradas.length > 1 ? "es" : ""} · última: {fmtFechaCorta(g.ultima.fecha)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{money(g.ultima.precioVenta)}</div>
                  {cambio !== 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: cambio > 0 ? C.coral : C.green }}>
                      {cambio > 0 ? "▲" : "▼"} {money(Math.abs(cambio))} vs. primera
                    </div>
                  )}
                </div>
              </div>

              {abiertoAqui && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${C.border}` }}>
                  {g.entradas.map(h => (
                    <div key={h.id} style={{ marginBottom: 8, background: h.tipo === "pedido_confirmado" ? "#F0FFF4" : C.bg,
                      border: `1.5px solid ${h.tipo === "pedido_confirmado" ? C.green : C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ color: C.muted }}>
                          {h.tipo === "pedido_confirmado" && <b style={{ color: C.green }}>✅ Pedido confirmado · </b>}
                          {fmtFechaCorta(h.fecha)} · {h.qty?.toLocaleString("es-MX")} pzas · {h.margenPct}% margen
                        </span>
                        <span><b style={{ color: C.navy }}>{money(h.costoTotal)}</b> costo · <b style={{ color: C.coral }}>{money(h.precioVenta)}</b> venta</span>
                      </div>
                      <div style={{ marginTop: 5, display: "flex", flexDirection: "column", gap: 2 }}>
                        {(h.desglose || []).map((d, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                            <span>{d.label}{d.prov && " · " + d.prov}</span>
                            <span>{money(d.monto)}</span>
                          </div>
                        ))}
                      </div>
                      {h.precioRealProveedor > 0 && (() => {
                        const diff = h.precioRealProveedor - h.costoTotal;
                        const pct = (diff / h.costoTotal) * 100;
                        return (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                            <span style={{ color: C.muted }}>📊 Proveedor cotizó real:</span>
                            <span>
                              <b style={{ color: C.navy }}>{money(h.precioRealProveedor)}</b>
                              <span style={{ color: diff > 0 ? C.coral : C.green, fontWeight: 700, marginLeft: 6 }}>
                                ({diff > 0 ? "+" : ""}{pct.toFixed(1)}% vs. tu cálculo)
                              </span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {listaGrupos.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Sin resultados para "{busqueda}".</div>
        )}
      </div>
    </div>
  );
}

function CronogramaGeneral() {
  const [trabajos, setTrabajos] = useState(() => loadCronogramaTrabajos());
  const [registrando, setRegistrando] = useState(null); // trabajo actual siendo calificado

  const quitar = (id) => {
    const nuevo = trabajos.filter(t => t.id !== id);
    setTrabajos(nuevo);
    saveCronogramaTrabajos(nuevo);
  };

  const marcarCompletado = (id, fechaRealEntrega) => {
    const nuevo = trabajos.map(t => t.id === id ? { ...t, completado: true, fechaRealEntrega } : t);
    setTrabajos(nuevo);
    saveCronogramaTrabajos(nuevo);
  };

  const activos = trabajos.filter(t => t.fechaInicio && t.fechaEntregaEstimada && !t.completado);
  const completados = trabajos.filter(t => t.completado).sort((a, b) => new Date(b.fechaRealEntrega) - new Date(a.fechaRealEntrega));

  const fmtCorto = (t) => new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

  if (activos.length === 0 && completados.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
        <div style={{ fontSize: 14 }}>Todavía no tienes ningún pedido confirmado en el cronograma.</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>En 💵 Cotizar, cuando una cotización ya sea pedido, dale "✅ Ya es pedido — agregar al cronograma".</div>
      </div>
    );
  }

  const ahora = Date.now();
  const inicios = activos.map(t => new Date(t.fechaInicio + "T08:00:00").getTime());
  const fines = activos.map(t => new Date(t.fechaEntregaEstimada).getTime());
  const minT = Math.min(...(inicios.length ? inicios : [ahora]), ahora);
  const maxT = Math.max(...(fines.length ? fines : [ahora]), ahora);
  const pad = Math.max((maxT - minT) * 0.08, 12 * 3600 * 1000);
  const rangeMin = minT - pad, rangeMax = maxT + pad, span = rangeMax - rangeMin || 1;
  const pct = (t) => ((t - rangeMin) / span) * 100;
  const hoyPct = pct(ahora);

  // Ordena por fecha de inicio, para que el cronograma se lea de arriba a abajo en el tiempo
  const ordenados = [...activos].sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: C.navy }}>📅 Cronograma general</div>
        {activos.length > 0 && <div style={{ fontSize: 12, color: C.muted }}>{fmtCorto(rangeMin)} — {fmtCorto(rangeMax)}</div>}
      </div>

      {activos.length > 0 && (
        <div style={cardStyle}>
          <div style={{ position: "relative" }}>
            {/* Línea de "HOY" atravesando todas las filas */}
            <div style={{ position: "absolute", left: hoyPct + "%", top: 0, bottom: 0, width: 2, background: C.coral, zIndex: 2 }} />
            <div style={{ position: "absolute", left: hoyPct + "%", top: -18, transform: "translateX(-50%)",
              fontSize: 10, fontWeight: 700, color: C.coral, zIndex: 2, background: C.card, padding: "0 4px" }}>HOY</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {ordenados.map(t => {
                const iT = new Date(t.fechaInicio + "T08:00:00").getTime();
                const fT = new Date(t.fechaEntregaEstimada).getTime();
                const vencido = fT < ahora;
                const left = pct(iT), width = Math.max(pct(fT) - pct(iT), 1.5);
                return (
                  <div key={t.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>
                        {t.nombre}{t.cliente ? <span style={{ color: C.muted, fontWeight: 400 }}> · {t.cliente}</span> : ""}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button onClick={() => setRegistrando(t)}
                          style={{ border: "none", background: "none", color: C.green, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>✅ Entregado</button>
                        <button onClick={() => quitar(t.id)} title="Quitar del cronograma"
                          style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 26, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      <div title={fmtCorto(iT) + " → " + fmtCorto(fT) + " (" + (t.horasTotales || 0).toFixed(1) + "h)"}
                        style={{ position: "absolute", left: left + "%", width: width + "%", top: 2, bottom: 2,
                          background: vencido ? C.coral : C.cyan, borderRadius: 5,
                          display: "flex", alignItems: "center", paddingLeft: 8, overflow: "hidden",
                          fontSize: 10.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                        {(t.horasTotales || 0).toFixed(0)}h
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activos.length > 0 && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 20 }}>
          🔵 en tiempo · 🔴 la fecha de entrega ya pasó · la línea roja vertical es HOY.
        </div>
      )}

      {registrando && (
        <RegistrarEntrega trabajo={registrando}
          onCancelar={() => setRegistrando(null)}
          onGuardado={(fechaReal) => { marcarCompletado(registrando.id, fechaReal); setRegistrando(null); }} />
      )}

      {completados.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 10 }}>✅ Entregados</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {completados.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                <div>
                  <span style={{ fontWeight: 600, color: C.text }}>{t.nombre}</span>
                  {t.cliente ? <span style={{ color: C.muted }}> · {t.cliente}</span> : ""}
                  <span style={{ color: C.muted }}> · entregado {fmtCorto(t.fechaRealEntrega)}</span>
                </div>
                <button onClick={() => quitar(t.id)} style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrarEntrega({ trabajo, onGuardado, onCancelar }) {
  const [fechaReal, setFechaReal] = useState(() => new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState("");
  const [calificaciones, setCalificaciones] = useState({}); // { provId: 1-5 }
  const [guardando, setGuardando] = useState(false);

  const proveedores = trabajo.proveedoresUsados || [];

  const guardar = async () => {
    setGuardando(true);
    const fechaRealISO = new Date(fechaReal + "T17:00:00").toISOString();
    for (const p of proveedores) {
      const cal = calificaciones[p.id];
      if (cal > 0) {
        await registrarEntregaDB({
          proveedorId: p.id, trabajoNombre: trabajo.nombre,
          fechaPrometida: trabajo.fechaEntregaEstimada, fechaReal: fechaRealISO,
          calificacion: cal, notas,
        });
      }
    }
    setGuardando(false);
    onGuardado(fechaRealISO);
  };

  return (
    <div style={{ ...cardStyle, borderColor: C.green, marginBottom: 20 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 4 }}>
        ✅ Marcar "{trabajo.nombre}" como entregado
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14 }}>Prometido: {new Date(trabajo.fechaEntregaEstimada).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Fecha real de entrega</label>
        <input type="date" value={fechaReal} onChange={e => setFechaReal(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
      </div>

      {proveedores.length === 0 && (
        <div style={{ fontSize: 12, color: C.coral, marginBottom: 12 }}>Este trabajo no tiene proveedores guardados para calificar (se guardó antes de este cambio).</div>
      )}

      {proveedores.map(p => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.nombre}</div>
          <div>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} onClick={() => setCalificaciones(prev => ({ ...prev, [p.id]: n === prev[p.id] ? 0 : n }))}
                style={{ cursor: "pointer", fontSize: 18, color: n <= (calificaciones[p.id] || 0) ? "#F5A623" : C.border }}>★</span>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 10, marginBottom: 14 }}>
        <label style={labelStyle}>Notas (opcional)</label>
        <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ej: llegó bien, pero un día tarde" style={inputStyle} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={guardar} disabled={guardando} style={btn(guardando ? C.muted : C.green)}>
          {guardando ? "Guardando…" : "Guardar entrega"}
        </button>
        <button onClick={onCancelar} style={{ ...btn(C.muted, true), background: "none", border: `1.5px solid ${C.border}` }}>Cancelar</button>
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
Tamaño de pliego: {pliego}
Pliegos a barnizar: {pliegos_totales}
Fecha de solicitud: {fecha}

Requiero cotización de barniz UV total y selectivo por separado, con tiempo de entrega estimado.

Mr. Blue Laboratorios Creativos`,

  "Laminado": `Buen día,

Solicito cotización de laminado para:

Producto: {producto}
Medida final: {medida_final}
Cantidad: {cantidad}
Tamaño de pliego: {pliego}
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
// A qué plantilla de mensaje (TIPOS_SERVICIO) le toca a cada tipo de proveedor.
const TIPO_PROVEEDOR_A_SERVICIO = {
  "Impresores": "Impresión offset",
  "Papel": "Papel / Sustrato",
  "Barniz": "Barniz UV",
  "Laminado": "Laminado",
  "Suaje": "Troquel / Suaje",
  "Hotstamping": "Foil / Relieve",
  "Hotmelt": "Encuadernación",
  "Cajas": "Otro",
  "Serigrafía": "Otro",
  "Maquila de sobre": "Otro",
  "Tintas Especiales": "Impresión offset",
  "Acabados Manuales": "Otro",
  "Fletes": "Otro",
  "Otro": "Otro",
};

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
function EnvioSolicitud({ calcData, cotizacion, tiempoEstimado, proveedoresCotizacion }) {
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorEmail, setProveedorEmail]   = useState("");
  const [proveedorTel, setProveedorTel]       = useState("");
  const [producto, setProducto]               = useState(() => cotizacion?.nombre_proyecto ? "Cotización-" + cotizacion.nombre_proyecto : "");
  const [tipoServicio, setTipoServicio]       = useState(TIPOS_SERVICIO[0]);
  const [resendKey, setResendKey]             = useState(() => localStorage.getItem("mrblue_resend_key") || "");
  const [fromEmail, setFromEmail]             = useState(() => localStorage.getItem("mrblue_from_email") || "");
  const [enviando, setEnviando]               = useState(false);
  const [resultados, setResultados]           = useState([]);
  const [showConfig, setShowConfig]           = useState(false);
  const [savedTemplates, setSavedTemplates]   = useState(DEFAULT_TEMPLATES);
  const [mensajeEditado, setMensajeEditado]   = useState("");
  const [editado, setEditado]                 = useState(false);
  const [tipoServicioPorProveedor, setTipoServicioPorProveedor] = useState({}); // { [provId]: tipoServicioOverride }
  const [marcadosEnviados, setMarcadosEnviados] = useState({}); // { [provId]: true }
  const [mensajesEditados, setMensajesEditados] = useState({}); // { [provId]: textoEditado }
  const [todosProveedores, setTodosProveedores] = useState([]);
  const [proveedoresElegidos, setProveedoresElegidos] = useState({}); // { [provId]: true } — a quién sí le vas a pedir cotización

  useEffect(() => {
    loadProveedoresDB().then(setTodosProveedores);
  }, []);

  useEffect(() => {
    storageGet("templates_servicio").then(d => { if (d) setSavedTemplates(d); });
  }, []);

  // Usa selectedSheet si existe (cuando el usuario eligió una imposición específica)
  const sel = calcData?.selectedSheet;  // { label, w, h, piecesPerSheet, cols, rows, orientation }
  const bestLabel = sel?.label
    ?? (calcData?.raw?.find(r => r.compatible !== false) ?? calcData?.raw?.[0])?.sheet.label
    ?? "—";
  const piezasPorPliego = sel?.piecesPerSheet
    ?? (calcData?.raw?.find(r => r.compatible !== false) ?? calcData?.raw?.[0])?.result.piecesPerSheet
    ?? 0;
  const bestTotal = piezasPorPliego > 0 && calcData
    ? Math.ceil(Math.ceil(calcData.qty / piezasPorPliego) * (1 + calcData.merma / 100)) : null;

  const buildVars = () => ({
    producto:         producto || "—",
    medida_final:     calcData ? calcData.pw + "x" + calcData.ph + " cm" : "—",
    medida_extendida: calcData && calcData.extW ? calcData.extW + "x" + calcData.extH + " cm" : "—",
    cantidad:         calcData ? calcData.qty.toLocaleString("es-MX") + " piezas" : "—",
    pliego:           bestLabel,
    pliegos_totales:  bestTotal ? bestTotal.toLocaleString("es-MX") : "—",
    gramaje:          calcData?.papelNombre ? calcData.papelNombre : (calcData ? calcData.gramaje + " g/m2" : "—"),
    merma:            calcData ? calcData.merma + "%" : "—",
    fecha:            new Date().toLocaleDateString("es-MX"),
    tiempo_estimado:  tiempoEstimado?.fechaEntregaEstimada
      ? new Date(tiempoEstimado.fechaEntregaEstimada).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
      : (tiempoEstimado ? formatoHoras(tiempoEstimado.horas) + " (" + tiempoEstimado.maquinaNombre + ")" : "—"),
  });

  // Mensaje ya adaptado al tipo de servicio de CADA proveedor (auto-detectado por su
  // tipo, o el que hayas elegido a mano en su renglón), con las variables ya resueltas.
  const mensajeParaProveedor = (p) => {
    if (mensajesEditados[p.id] != null) return mensajesEditados[p.id];
    const servicio = tipoServicioPorProveedor[p.id] || TIPO_PROVEEDOR_A_SERVICIO[p.tipo] || "Otro";
    const tpl = savedTemplates[servicio] || DEFAULT_TEMPLATES[servicio] || "";
    return resolveTemplate(tpl, buildVars());
  };

  // Une lo que elegiste con checkboxes aquí con lo que hayas elegido en 💵 Cotizar (si vienes de allá).
  const idsElegidos = new Set([
    ...Object.keys(proveedoresElegidos).filter(id => proveedoresElegidos[id]),
    ...(proveedoresCotizacion || []).map(p => p.id),
  ]);
  const proveedoresParaEnviar = todosProveedores.filter(p => idsElegidos.has(p.id));
  const [enviandoTodos, setEnviandoTodos] = useState(false);
  const [resumenEnvioMasivo, setResumenEnvioMasivo] = useState(null);
  const [resumenEnvioWhats, setResumenEnvioWhats] = useState(null);

  const enviarCorreoATodos = async () => {
    if (!resendKey || !fromEmail) { setShowConfig(true); return; }
    setEnviandoTodos(true);
    const conCorreo = proveedoresParaEnviar.filter(p => p.email);
    let exitosos = 0, fallidos = 0;
    for (const p of conCorreo) {
      const msg = mensajeParaProveedor(p);
      const asunto = "Solicitud de cotización — " + (producto || cotizacion?.nombre_proyecto || "proyecto") + " | Mr. Blue";
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + resendKey },
        body: JSON.stringify({ from: fromEmail, to: p.email, subject: asunto, text: msg }),
      }).catch(() => null);
      if (r?.ok) { exitosos++; setMarcadosEnviados(prev => ({ ...prev, [p.id]: true })); }
      else fallidos++;
    }
    setResumenEnvioMasivo({ exitosos, fallidos, sinCorreo: proveedoresParaEnviar.length - conCorreo.length });
    setEnviandoTodos(false);
  };

  // WhatsApp no tiene forma real de "enviar solo" sin la API de negocios de Meta (de paga).
  // Esto abre una pestaña de WhatsApp Web por proveedor, ya con el mensaje escrito —
  // solo falta darle "Enviar" en cada una. Se espacian un poco para que el navegador
  // no las bloquee como si fueran spam de ventanas emergentes.
  const abrirWhatsAppDeTodos = () => {
    const conWa = proveedoresParaEnviar.filter(p => (p.whatsapp || "").replace(/\D/g, "").length > 0);
    conWa.forEach((p, i) => {
      setTimeout(() => {
        const num = p.whatsapp.replace(/\D/g, "");
        const msg = mensajeParaProveedor(p);
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
        setMarcadosEnviados(prev => ({ ...prev, [p.id]: true }));
      }, i * 600);
    });
    setResumenEnvioWhats({ total: conWa.length, sinWhats: proveedoresParaEnviar.length - conWa.length });
  };

  const tplBase = savedTemplates[tipoServicio] || DEFAULT_TEMPLATES[tipoServicio] || "";
  const mensajeVivo = resolveTemplate(tplBase, buildVars());
  const mensajeFinal = editado ? mensajeEditado : mensajeVivo;

  // Refresca el mensaje cuando cambia el pliego seleccionado, el tipo de template o el producto
  const selKey = calcData?.selectedSheet?.label ?? "";
  useEffect(() => {
    setMensajeEditado(mensajeVivo);
    setEditado(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoServicio, producto, selKey, calcData?.qty, calcData?.pw]);

    const enviarTodo = async () => {
    if (!proveedorNombre) return;
    setEnviando(true);
    const entry = { proveedor: proveedorNombre, canales: [], waLink: null };
    if (proveedorEmail && resendKey && fromEmail) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + resendKey },
        body: JSON.stringify({ from: fromEmail, to: proveedorEmail, subject: "Solicitud de cotización – " + (producto || "Producto offset") + " | Mr. Blue", text: mensajeFinal }),
      }).catch(() => null);
      entry.canales.push(r?.ok ? "✓ Correo enviado" : "✗ Error al enviar correo");
    } else if (proveedorEmail) {
      entry.canales.push("— Correo: configura API key en ⚙");
    }
    if (proveedorTel) {
      const num = proveedorTel.replace(/\D/g, "");
      entry.waLink = "https://wa.me/" + (num.startsWith("52") ? num : "52" + num) + "?text=" + encodeURIComponent(mensajeFinal);
      entry.canales.push("↗ Link WhatsApp listo");
    }
    const existing = await storageGet("solicitudes") || [];
    existing.unshift({ id: crypto.randomUUID(), proveedor: proveedorNombre, email: proveedorEmail, telefono: proveedorTel, producto: producto || "Sin nombre", qty: calcData?.qty, fechaEnvio: new Date().toISOString(), status: "enviado", waLink: entry.waLink });
    await storageSet("solicitudes", existing);
    setResultados([entry]);
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

      {tiempoEstimado && (
        <div style={{ background: "#EAF4FB", border: `1.5px solid ${C.cyan}`, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, color: C.text, marginBottom: 12 }}>
          {tiempoEstimado.horas != null && (
            <div>⏱ Tiempo estimado de impresión: <b>{formatoHoras(tiempoEstimado.horas)}</b> en {tiempoEstimado.maquinaNombre}</div>
          )}
          {tiempoEstimado.fechaEntregaEstimada && (
            <div>📅 Entrega estimada del cronograma completo: <b>{new Date(tiempoEstimado.fechaEntregaEstimada).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</b> ({tiempoEstimado.horasTotales?.toFixed(1)}h totales)</div>
          )}
          Disponible como <code>{"{{tiempo_estimado}}"}</code> en tus plantillas.
        </div>
      )}

      {/* ── Card único: Producto + Info + Mensaje ── */}
      <div style={{ ...cardStyle, borderColor: C.cyan }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>
            Solicitud de cotización
          </div>
          {cotizacion?.nombre_proyecto && (
            <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
              {cotizacion.folio && <span style={{ background: C.cyan, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700, marginRight: 5 }}>{cotizacion.folio}</span>}
              <span style={{ fontWeight: 700, color: C.navy }}>{cotizacion.nombre_proyecto}</span>
              {cotizacion.contacto ? " · " + cotizacion.contacto : ""}
            </div>
          )}
        </div>

        {/* Producto y template */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
          {todosProveedores.length > 0 && (() => {
            const gruposPorTipo = {};
            todosProveedores.forEach(p => {
              const t = p.tipo || "Otro";
              if (!gruposPorTipo[t]) gruposPorTipo[t] = [];
              gruposPorTipo[t].push(p);
            });

            return (
              <>
                <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                    🎯 ¿A quién le vas a pedir cotización de este trabajo?
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(gruposPorTipo).map(([tipo, provs]) => (
                      <div key={tipo}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{tipo}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {provs.map(p => {
                            const marcado = !!proveedoresElegidos[p.id] || (proveedoresCotizacion || []).some(x => x.id === p.id);
                            return (
                              <button key={p.id} onClick={() => setProveedoresElegidos(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                style={{ background: marcado ? C.cyan : C.bg, color: marcado ? "#fff" : C.navy,
                                  border: `1.5px solid ${marcado ? C.cyan : C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                                {marcado ? "✓ " : ""}{p.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {proveedoresParaEnviar.length > 0 && (
            <div style={{ background: "#EAF4FB", border: `1.5px solid ${C.cyan}`, borderRadius: 8, padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.navy }}>
                  📤 Enviar a {proveedoresParaEnviar.length} proveedor{proveedoresParaEnviar.length > 1 ? "es" : ""} — mensaje ya adaptado a cada servicio
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={enviarCorreoATodos} disabled={enviandoTodos || proveedoresParaEnviar.filter(p => p.email).length === 0}
                    style={{ ...btn(C.coral, true), fontSize: 12, padding: "6px 14px", opacity: enviandoTodos ? 0.6 : 1 }}>
                    {enviandoTodos ? "Enviando…" : `📧 Correo a todos (${proveedoresParaEnviar.filter(p => p.email).length})`}
                  </button>
                  <button onClick={abrirWhatsAppDeTodos} disabled={proveedoresParaEnviar.filter(p => (p.whatsapp || "").replace(/\D/g, "")).length === 0}
                    style={{ ...btn(C.green, true), fontSize: 12, padding: "6px 14px" }}>
                    {`💬 WhatsApp a todos (${proveedoresParaEnviar.filter(p => (p.whatsapp || "").replace(/\D/g, "")).length})`}
                  </button>
                </div>
              </div>
              {resumenEnvioMasivo && (
                <div style={{ fontSize: 11.5, color: C.text, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                  ✉ Correo — ✓ {resumenEnvioMasivo.exitosos} enviados
                  {resumenEnvioMasivo.fallidos > 0 && <span style={{ color: C.coral }}> · ✗ {resumenEnvioMasivo.fallidos} fallaron</span>}
                  {resumenEnvioMasivo.sinCorreo > 0 && <span style={{ color: C.muted }}> · {resumenEnvioMasivo.sinCorreo} sin correo</span>}
                </div>
              )}
              {resumenEnvioWhats && (
                <div style={{ fontSize: 11.5, color: C.text, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", marginBottom: 10 }}>
                  💬 WhatsApp — se abrieron {resumenEnvioWhats.total} pestañas con el mensaje listo, dale "Enviar" en cada una
                  {resumenEnvioWhats.sinWhats > 0 && <span style={{ color: C.muted }}> · {resumenEnvioWhats.sinWhats} sin WhatsApp</span>}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {proveedoresParaEnviar.map(p => {
                  const servicioActual = tipoServicioPorProveedor[p.id] || TIPO_PROVEEDOR_A_SERVICIO[p.tipo] || "Otro";
                  const msg = mensajeParaProveedor(p);
                  const enviado = !!marcadosEnviados[p.id];
                  const asunto = "Solicitud de cotización — " + (producto || cotizacion?.nombre_proyecto || "proyecto");
                  const waNum = (p.whatsapp || "").replace(/\D/g, "");
                  return (
                    <div key={p.id} style={{ background: C.card, border: `1.5px solid ${enviado ? C.green : C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                            {p.nombre}{p.contactoNombre ? " · " + p.contactoNombre : ""}
                            {enviado && <span style={{ marginLeft: 6, color: C.green, fontSize: 11 }}>✓ marcado como enviado</span>}
                          </div>
                          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>
                            {p.email || "sin correo"} · {p.whatsapp || "sin WhatsApp"}
                          </div>
                        </div>
                        <select value={servicioActual} onChange={e => setTipoServicioPorProveedor(prev => ({ ...prev, [p.id]: e.target.value }))}
                          style={{ ...inputStyle, fontSize: 11, padding: "3px 7px", width: 160 }}>
                          {TIPOS_SERVICIO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <details style={{ marginBottom: 8 }}>
                        <summary style={{ fontSize: 11, color: C.cyan, cursor: "pointer", fontWeight: 700 }}>
                          Ver / editar mensaje{mensajesEditados[p.id] != null && <span style={{ color: C.amber }}> · editado</span>}
                        </summary>
                        <textarea value={msg}
                          onChange={e => setMensajesEditados(prev => ({ ...prev, [p.id]: e.target.value }))}
                          rows={10}
                          style={{ ...inputStyle, fontSize: 11.5, marginTop: 6, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
                        {mensajesEditados[p.id] != null && (
                          <button onClick={() => setMensajesEditados(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                            style={{ background: "none", border: "none", color: C.cyan, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 0 0" }}>
                            ↺ Restaurar mensaje original
                          </button>
                        )}
                      </details>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => { navigator.clipboard.writeText(msg); setMarcadosEnviados(prev => ({ ...prev, [p.id]: true })); }}
                          style={{ ...btn(C.navy, true), fontSize: 11, padding: "5px 10px" }}>📋 Copiar mensaje</button>
                        <a href={p.email ? `mailto:${p.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(msg)}` : undefined}
                          onClick={() => p.email && setMarcadosEnviados(prev => ({ ...prev, [p.id]: true }))}
                          style={{ ...btn(p.email ? C.coral : C.muted, true), fontSize: 11, padding: "5px 10px", textDecoration: "none", opacity: p.email ? 1 : 0.5, pointerEvents: p.email ? "auto" : "none" }}>
                          ✉ Abrir correo
                        </a>
                        <a href={waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}` : undefined} target="_blank" rel="noreferrer"
                          onClick={() => waNum && setMarcadosEnviados(prev => ({ ...prev, [p.id]: true }))}
                          style={{ ...btn(waNum ? C.green : C.muted, true), fontSize: 11, padding: "5px 10px", textDecoration: "none", opacity: waNum ? 1 : 0.5, pointerEvents: waNum ? "auto" : "none" }}>
                          💬 WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
                )}
              </>
            );
          })()}
          <div>
            <label style={labelStyle}>Nombre del producto (aparece en todos los mensajes)</label>
            <input value={producto} onChange={e => setProducto(e.target.value)}
              placeholder="Ej: Caja plegadiza 4/0, Folleto 4/4…" style={inputStyle} />
          </div>
        </div>

        {/* Info de pliegos */}
        {calcData && (() => {
          const pliegosNetos = piezasPorPliego > 0 ? Math.ceil(calcData.qty / piezasPorPliego) : null;
          return (
            <div style={{ background: "#EAF4FB", border: "1.5px solid #B8DDF5", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: C.navy, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px" }}>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Medida final</span><strong>{calcData.pw}×{calcData.ph} cm</strong>{calcData.extW ? " · ext " + calcData.extW + "×" + calcData.extH : ""}</div>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Cantidad</span><strong>{calcData.qty.toLocaleString("es-MX")} pzas</strong></div>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Pliego</span><strong>{bestLabel}</strong> · {piezasPorPliego > 0 ? piezasPorPliego + " pzas/pliego" : "—"}</div>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Pliegos sin merma</span><strong>{pliegosNetos?.toLocaleString("es-MX") ?? "—"}</strong></div>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Merma {calcData.merma}%</span><strong>+{pliegosNetos ? (bestTotal - pliegosNetos).toLocaleString("es-MX") : "—"} pliegos</strong></div>
                <div><span style={{ color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>Total con merma</span><strong style={{ color: C.cyan }}>{bestTotal?.toLocaleString("es-MX") ?? "—"} pliegos</strong> · {calcData.gramaje} g/m²</div>
              </div>
            </div>
          );
        })()}

      </div>


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
// MÓDULO: Solicitud de Cotización
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORIDADES = ["Normal", "Urgente", "Muy urgente", "Para ayer 🔥"];
const TIPOS_PRODUCTO = [
  "Impreso offset", "Folleto", "Catálogo", "Revista", "Libro",
  "Caja plegadiza", "Empaque", "Etiqueta", "Tarjeta", "Poster/Banner",
  "Promocional", "Otro",
];
const TIPO_EMPAQUE_ENVIO = [
  "Caja individual", "Caja master", "Bolsa", "Film stretch",
  "Pallet", "Sin empaque especial", "Otro",
];
const TIPO_LAMINADO = ["Mate", "Brillante", "Soft touch", "Anti-scratch"];
const CARAS_LAMINADO = ["1 cara", "2 caras"];
const TIPO_BARNIZ = ["A Plasta", "A Registro", "Drip-off"];

const CONTACTOS_MRB = [
  { nombre: "Remedios Flores", correo: "remedios@mrblue.com.mx" },
  { nombre: "Mr. Blue", correo: "hola@lelab.ink" },
];
const DIRECCION_ENTREGA = "Mario Rojas Avendaño 178, San Simón Ticumac, CDMX";

const ACABADOS_LIST = [
  { key: "corte",         label: "Corte",          col: 0 },
  { key: "alzado",        label: "Alzado",          col: 1 },
  { key: "suaje",         label: "Suaje",           col: 0 },
  { key: "serigrafia",    label: "Serigrafía",      col: 1 },
  { key: "doblez",        label: "Doblez",          col: 1 },
  { key: "rustica",       label: "Rústica Cosida",  col: 0 },
  { key: "hotmelt",       label: "Hotmelt",         col: 1 },
  { key: "wireo",         label: "Wire-O",          col: 0 },
  { key: "engrapado",     label: "Engrapado",       col: 1 },
  { key: "plecado",       label: "Plecado",         col: 0 },
  { key: "ensobretado",   label: "Ensobretado",     col: 1 },
  { key: "pasta_dura",    label: "Pasta Dura",      col: 0 },
  { key: "empaque_esp",   label: "Empaque Especial",col: 1 },
  { key: "hotstamping",   label: "Hot Stamping",    col: 0 },
];

const emptyCotizacion = () => ({
  // Cliente
  contacto: "Remedios Flores",
  correo_contacto: "hola@lelab.ink",
  fecha_respuesta: "",
  direccion: DIRECCION_ENTREGA,
  folio: "",
  prioridad: "Normal",
  nombre_proyecto: "",
  cantidad: "",
  visto_bueno: false,
  son_promocionales: false,
  detalles: "",
  tipo_producto: "",
  // Técnico
  papel_acabado_gramaje: "",
  tamano_extendido: "",
  tamano_final: "",
  num_tintas: "",
  tintas_frente: "",
  tintas_vuelta: "",
  lleva_pantone: false,
  pantones: "",
  maquilar_acabados: false,
  descripcion_acabados: "",
  // Acabados
  acabados: {},
  laminado: false,
  tipo_laminado: "",
  caras_laminado: "",
  barniz_uv: false,
  tipo_barniz: "",
  hotstamping_color: "",
  // Empaque
  tipo_empaque_envio: "",
  comentarios_empaque: "",
});

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12,
      color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em",
      borderBottom: `2px solid ${C.cyan}`, paddingBottom: 6, marginBottom: 14, marginTop: 4 }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ ...labelStyle, marginBottom: 5 }}>
        {label}{required && <span style={{ color: C.coral, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.text, userSelect: "none" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: C.navy, cursor: "pointer", flexShrink: 0 }} />
      {label}
    </label>
  );
}

function SolicitudCotizacion({ onGuardar }) {
  const [cot, setCot] = useState(() => {
    // 1. Prioridad: datos que vienen de ClickUp via URL
    const fromURL = parseCotFromURL();
    if (fromURL) {
      const mapped = mapClickUpToCot(fromURL);
      localStorage.setItem("mrblue_cot_activa", JSON.stringify(mapped));
      return mapped;
    }
    // 2. Cotización activa guardada localmente
    const saved = localStorage.getItem("mrblue_cot_activa");
    return saved ? JSON.parse(saved) : emptyCotizacion();
  });
  const [guardado, setGuardado] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [fromClickUp, setFromClickUp] = useState(() => {
    const saved = localStorage.getItem("mrblue_cot_activa");
    if (!saved) return false;
    try { return !!JSON.parse(saved)._from_clickup; } catch { return false; }
  });

  const set = (field, val) => setCot(prev => ({ ...prev, [field]: val }));
  const setAcabado = (key, val) => setCot(prev => ({ ...prev, acabados: { ...prev.acabados, [key]: val } }));

  // ── Guardar versión en historial ────────────────────────────────────────────
  const guardar = () => {
    const now = new Date().toISOString();
    const historial = JSON.parse(localStorage.getItem("mrblue_historial") || "[]");

    // Si ya existe una entrada con este cot_id, es una nueva versión
    const cot_id = cot.cot_id || crypto.randomUUID();
    const version = historial.filter(h => h.cot_id === cot_id).length + 1;

    const entrada = {
      ...cot,
      cot_id,
      version,
      timestamp: now,
      ts_display: new Date(now).toLocaleString("es-MX"),
    };

    // Guardar en historial (máx 200 entradas)
    historial.unshift(entrada);
    if (historial.length > 200) historial.splice(200);
    localStorage.setItem("mrblue_historial", JSON.stringify(historial));

    // Actualizar cotización activa con cot_id
    const cotActiva = { ...cot, cot_id };
    setCot(cotActiva);
    localStorage.setItem("mrblue_cot_activa", JSON.stringify(cotActiva));

    onGuardar(cotActiva);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  // ── Cargar desde historial ──────────────────────────────────────────────────
  const cargarVersion = (entrada) => {
    setCot(entrada);
    localStorage.setItem("mrblue_cot_activa", JSON.stringify(entrada));
    setShowHistorial(false);
  };

  // ── Duplicar como nueva cotización ─────────────────────────────────────────
  const duplicar = (entrada) => {
    const nueva = { ...entrada, cot_id: crypto.randomUUID(), version: undefined, timestamp: undefined, ts_display: undefined };
    setCot(nueva);
    localStorage.setItem("mrblue_cot_activa", JSON.stringify(nueva));
    setShowHistorial(false);
  };

  const limpiar = () => {
    const fresh = emptyCotizacion();
    setCot(fresh);
    localStorage.removeItem("mrblue_cot_activa");
  };

  const selectStyle = { ...inputStyle, appearance: "none" };

  // ── Historial panel ─────────────────────────────────────────────────────────
  if (showHistorial) {
    return <HistorialCotizaciones
      onCargar={cargarVersion}
      onDuplicar={duplicar}
      onVolver={() => setShowHistorial(false)}
    />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: C.navy, borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 15 }}>Solicitud de Cotización Interno</div>
          {(cot.folio || (cot.cot_id && cot.version)) && (
            <div style={{ fontSize: 11, color: "#8BBDD6", marginTop: 2 }}>
              {cot.folio && <span style={{ background: C.cyan, color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 700, marginRight: 6 }}>{cot.folio}</span>}
              {cot.version && <span>v{cot.version}</span>}
              {cot.ts_display ? " · " + cot.ts_display : ""}
            </div>
          )}
          {!cot.cot_id && (
            fromClickUp
            ? <div style={{ fontSize: 11, color: "#8BBDD6", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: "#6C47FF", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>ClickUp</span>
                Pre-llenado automáticamente · revisa y guarda
              </div>
            : <div style={{ fontSize: 11, color: "#8BBDD6", marginTop: 2 }}>Nueva cotización — sin guardar</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowHistorial(true)}
            style={{ background: "none", border: "1.5px solid #8BBDD6", color: "#8BBDD6", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            📂 Historial
          </button>
          <button onClick={limpiar}
            style={{ background: "none", border: "1.5px solid #8BBDD6", color: "#8BBDD6", borderRadius: 8, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            Nueva
          </button>
          <button onClick={guardar} style={btn(guardado ? C.green : C.cyan)}>
            {guardado ? "✓ Versión guardada" : "Guardar versión →"}
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 1: Cliente ── */}
      <div style={cardStyle}>
        <SectionTitle>1 · Datos del cliente</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          <Field label="Nombre del contacto" required>
            <input value={cot.contacto} onChange={e => set("contacto", e.target.value)}
              placeholder="Nombre de mi comprador" style={inputStyle} />
          </Field>
          <Field label="Fecha límite cotización" required>
            <input type="date" value={cot.fecha_respuesta} onChange={e => set("fecha_respuesta", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Nombre del proyecto / cotización" required>
            <input value={cot.nombre_proyecto} onChange={e => set("nombre_proyecto", e.target.value)}
              placeholder="¿Cómo se llama el proyecto?" style={inputStyle} />
          </Field>
          <Field label="Task ID / Folio">
            <input value={cot.folio || cot._clickup_task_id || ""} onChange={e => set("folio", e.target.value)}
              placeholder="ID de tarea ClickUp (se asigna automático)"
              style={{ ...inputStyle, color: (cot.folio || cot._clickup_task_id) ? C.cyan : C.muted, fontWeight: (cot.folio || cot._clickup_task_id) ? 700 : 400 }} />
          </Field>
          <Field label="Cantidad solicitada (pz)" required>
            <input type="number" value={cot.cantidad} onChange={e => set("cantidad", e.target.value)}
              placeholder="80,000" style={inputStyle} />
          </Field>
          <Field label="¿Qué producto estamos cotizando?" required>
            <select value={cot.tipo_producto} onChange={e => set("tipo_producto", e.target.value)} style={selectStyle}>
              <option value="">Selecciona…</option>
              {TIPOS_PRODUCTO.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Prioridad del proyecto" required>
            <select value={cot.prioridad} onChange={e => set("prioridad", e.target.value)} style={selectStyle}>
              {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Dirección de entrega" required>
            <input value={cot.direccion} onChange={e => set("direccion", e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end" }}>
            <CheckRow checked={cot.visto_bueno} onChange={v => set("visto_bueno", v)} label="Se da Visto Bueno del proyecto" />
            <CheckRow checked={cot.son_promocionales} onChange={v => set("son_promocionales", v)} label="Son Promocionales" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Detalles y observaciones de la cotización" required>
              <textarea value={cot.detalles} onChange={e => set("detalles", e.target.value)}
                placeholder="detalles de la cotización: son promocionales, impresos, empaque, otro... describe la solicitud"
                style={{ ...inputStyle, height: 80, resize: "vertical" }} />
            </Field>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: Especificaciones técnicas ── */}
      <div style={cardStyle}>
        <SectionTitle>2 · Especificaciones técnicas</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Tipo de papel, acabado y gramaje" required>
            <textarea value={cot.papel_acabado_gramaje} onChange={e => set("papel_acabado_gramaje", e.target.value)}
              placeholder="Tipo de papel, acabado (Brillante-Mate-Semimate) etc y gramaje"
              style={{ ...inputStyle, height: 70, resize: "vertical" }} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
            <Field label="Tamaño extendido" required>
              <input value={cot.tamano_extendido} onChange={e => set("tamano_extendido", e.target.value)}
                placeholder="Ej: 21.7×29.5 cm" style={inputStyle} />
            </Field>
            <Field label="Tamaño final" required>
              <input value={cot.tamano_final} onChange={e => set("tamano_final", e.target.value)}
                placeholder="Ej: 21×29 cm" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
            <Field label="Tintas frente" required>
              <input type="number" min="0" value={cot.tintas_frente}
                onChange={e => {
                  const v = e.target.value;
                  setCot(prev => ({ ...prev, tintas_frente: v, num_tintas: v + "/" + (prev.tintas_vuelta || "0") }));
                }}
                placeholder="Ej: 4" style={inputStyle} />
            </Field>
            <Field label="Tintas vuelta">
              <input type="number" min="0" value={cot.tintas_vuelta}
                onChange={e => {
                  const v = e.target.value;
                  setCot(prev => ({ ...prev, tintas_vuelta: v, num_tintas: (prev.tintas_frente || "0") + "/" + v }));
                }}
                placeholder="Ej: 0 (si es un solo lado)" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CheckRow checked={cot.lleva_pantone} onChange={v => set("lleva_pantone", v)} label="La impresión lleva Pantone" />
            </div>
            {cot.lleva_pantone && (
              <Field label="Pantone">
                <input value={cot.pantones} onChange={e => set("pantones", e.target.value)}
                  placeholder="¿Qué pantones lleva?" style={inputStyle} />
              </Field>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <CheckRow checked={cot.maquilar_acabados} onChange={v => set("maquilar_acabados", v)} label="Maquilar Acabados" />
            </div>
            {cot.maquilar_acabados && (
              <Field label="Acabados">
                <input value={cot.descripcion_acabados} onChange={e => set("descripcion_acabados", e.target.value)}
                  placeholder="Escribe todos los acabados que lleva el proyecto!!" style={inputStyle} />
              </Field>
            )}
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 3: Acabados ── */}
      <div style={cardStyle}>
        <SectionTitle>3 · Acabados</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: 14 }}>
          {ACABADOS_LIST.map(a => (
            <CheckRow key={a.key} checked={!!cot.acabados[a.key]} onChange={v => setAcabado(a.key, v)} label={a.label} />
          ))}
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <CheckRow checked={cot.laminado} onChange={v => set("laminado", v)} label="Laminado" />
          {cot.laminado && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginTop: 10 }}>
              <Field label="Tipo Laminado">
                <select value={cot.tipo_laminado} onChange={e => set("tipo_laminado", e.target.value)} style={selectStyle}>
                  <option value="">Selecciona…</option>
                  {TIPO_LAMINADO.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Caras a Laminar">
                <select value={cot.caras_laminado} onChange={e => set("caras_laminado", e.target.value)} style={selectStyle}>
                  <option value="">Selecciona…</option>
                  {CARAS_LAMINADO.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <CheckRow checked={cot.barniz_uv} onChange={v => set("barniz_uv", v)} label="Barniz U.V." />
          {cot.barniz_uv && (
            <div style={{ marginTop: 10 }}>
              <Field label="Tipo de Barniz">
                <select value={cot.tipo_barniz} onChange={e => set("tipo_barniz", e.target.value)} style={selectStyle}>
                  <option value="">Selecciona…</option>
                  {TIPO_BARNIZ.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>
        {cot.acabados.hotstamping && (
          <div style={{ background: C.bg, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <Field label="Color Foil (Hot Stamping)">
              <input value={cot.hotstamping_color} onChange={e => set("hotstamping_color", e.target.value)}
                placeholder="Color del foil" style={inputStyle} />
            </Field>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 4: Empaque ── */}
      <div style={cardStyle}>
        <SectionTitle>4 · Empaque y envío</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
          <Field label="Tipo de empaque envío" required>
            <select value={cot.tipo_empaque_envio} onChange={e => set("tipo_empaque_envio", e.target.value)} style={selectStyle}>
              <option value="">Selecciona…</option>
              {TIPO_EMPAQUE_ENVIO.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="¿Comentarios sobre el empaque?">
            <input value={cot.comentarios_empaque} onChange={e => set("comentarios_empaque", e.target.value)}
              placeholder="Algún comentario sobre el empaque" style={inputStyle} />
          </Field>
        </div>
      </div>

      <button onClick={guardar} style={{ ...btn(guardado ? C.green : C.cyan, true), marginBottom: 8 }}>
        {guardado ? "✓ Versión guardada — continúa en Pliegos" : "Guardar versión y continuar →"}
      </button>
      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 16 }}>
        Cada guardado crea una nueva versión inmutable. Accede al historial con 📂 para comparar versiones anteriores.
      </div>
    </div>
  );
}

// ── Historial de cotizaciones ─────────────────────────────────────────────────
function HistorialCotizaciones({ onCargar, onDuplicar, onVolver }) {
  const [historial, setHistorial] = useState([]);
  const [busqueda, setBusqueda]   = useState("");
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem("mrblue_historial") || "[]");
    setHistorial(h);
  }, []);

  const borrar = (idx) => {
    const nuevo = historial.filter((_, i) => i !== idx);
    setHistorial(nuevo);
    localStorage.setItem("mrblue_historial", JSON.stringify(nuevo));
  };

  // Agrupar por cot_id para mostrar versiones juntas
  const grupos = {};
  historial.forEach((h, idx) => {
    const id = h.cot_id || ("sin-id-" + idx);
    if (!grupos[id]) grupos[id] = [];
    grupos[id].push({ ...h, _idx: idx });
  });

  const gruposArr = Object.entries(grupos)
    .map(([id, versiones]) => ({ id, versiones, nombre: versiones[0].nombre_proyecto || "Sin nombre", ultimo: versiones[0].ts_display }))
    .filter(g => !busqueda || normalizarTexto(g.nombre).includes(normalizarTexto(busqueda)));

  const COLS = {
    cantidad:     "Cantidad",
    papel_acabado_gramaje: "Papel/Gramaje",
    tamano_final: "Tamaño final",
    num_tintas:   "Tintas",
    tipo_producto:"Producto",
    prioridad:    "Prioridad",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ background: C.navy, borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 15 }}>📂 Historial de cotizaciones</div>
          <div style={{ fontSize: 11, color: "#8BBDD6", marginTop: 2 }}>{historial.length} versión{historial.length !== 1 ? "es" : ""} guardada{historial.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={onVolver} style={btn(C.muted)}>← Volver</button>
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 14 }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre de proyecto…"
          style={inputStyle} />
      </div>

      {gruposArr.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "30px 0", fontSize: 13 }}>
          {busqueda ? "Sin resultados para esa búsqueda." : "No hay cotizaciones guardadas todavía."}
        </div>
      )}

      {gruposArr.map(grupo => (
        <div key={grupo.id} style={{ ...cardStyle, marginBottom: 12 }}>
          {/* Header del grupo */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.navy }}>
                {grupo.nombre}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {grupo.versiones.length} versión{grupo.versiones.length > 1 ? "es" : ""} · Última: {grupo.ultimo}
              </div>
              {grupo.versiones[0].tipo_producto && (
                <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "1px 8px", fontSize: 10, color: C.muted, marginTop: 4, display: "inline-block" }}>
                  {grupo.versiones[0].tipo_producto}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onCargar(grupo.versiones[0])} style={btn(C.cyan)}>
                Cargar última
              </button>
              <button onClick={() => onDuplicar(grupo.versiones[0])} style={btn(C.navy)}>
                Duplicar
              </button>
              <button onClick={() => setExpandido(expandido === grupo.id ? null : grupo.id)}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 11, color: C.muted, cursor: "pointer", fontWeight: 700 }}>
                {expandido === grupo.id ? "▲ Ocultar" : "▼ Ver versiones"}
              </button>
            </div>
          </div>

          {/* Versiones expandidas */}
          {expandido === grupo.id && (
            <div style={{ marginTop: 14 }}>
              {/* Tabla comparativa de versiones */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${C.border}` }}>Versión</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${C.border}` }}>Fecha</th>
                      {Object.values(COLS).map(l => (
                        <th key={l} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${C.border}` }}>{l}</th>
                      ))}
                      <th style={{ padding: "6px 10px", border: `1px solid ${C.border}` }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.versiones.map((v, vi) => (
                      <tr key={vi} style={{ background: vi === 0 ? "#EAF4FB" : C.card }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: C.navy, border: `1px solid ${C.border}` }}>
                          v{v.version ?? grupo.versiones.length - vi}
                          {vi === 0 && <span style={{ marginLeft: 6, background: C.cyan, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9 }}>última</span>}
                        </td>
                        <td style={{ padding: "8px 10px", color: C.muted, border: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{v.ts_display || "—"}</td>
                        {Object.keys(COLS).map(k => (
                          <td key={k} style={{ padding: "8px 10px", border: `1px solid ${C.border}`, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {k === "cantidad" && v[k] ? parseInt(v[k]).toLocaleString("es-MX") + " pzas" : (v[k] || "—")}
                          </td>
                        ))}
                        <td style={{ padding: "8px 10px", border: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => onCargar(v)} style={{ ...btn(C.cyan), fontSize: 10, padding: "3px 8px" }}>Cargar</button>
                            <button onClick={() => onDuplicar(v)} style={{ ...btn(C.navy), fontSize: 10, padding: "3px 8px" }}>Duplicar</button>
                            <button onClick={() => borrar(v._idx)} style={{ background: "none", border: `1px solid ${C.red}`, color: C.red, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("cotizacion");
  const [calcData, setCalcData]     = useState(null);
  const [tiempoEstimado, setTiempoEstimado] = useState(null); // {horas, maquinaNombre} o null
  const [proveedoresCotizacion, setProveedoresCotizacion] = useState([]); // [{id, nombre, email, whatsapp}]
  const [cotizacion, setCotizacion] = useState(() => {
    const saved = localStorage.getItem("mrblue_cot_activa");
    return saved ? JSON.parse(saved) : null;
  });

  const tabs = [
    { key: "cotizacion", label: "📋 Cotización"       },
    { key: "calc",       label: "📐 Pliegos"          },
    { key: "envio",      label: "✉ Enviar solicitud"  },
    { key: "cotizar",    label: "💵 Cotizar"          },
    { key: "seg",        label: "📋 Seguimiento"       },
    { key: "cronograma", label: "📅 Cronograma"        },
    { key: "histcot",    label: "📈 Historial cotizaciones" },
    { key: "admin",      label: "🏭 Proveedores"       },
    { key: "templates",  label: "📝 Templates"         },
  ];

  const handleGuardarCot = (cot) => {
    setCotizacion(cot);
    setTab("calc");
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ background: C.navy, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 7, height: 26, background: C.cyan, borderRadius: 2 }} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#fff", fontSize: 16 }}>Mr. Blue · Cotizador Offset</div>
            <div style={{ fontSize: 11, color: "#8BBDD6" }}>
              {cotizacion?.folio
              ? cotizacion.folio + " · " + (cotizacion?.nombre_proyecto || "Nueva cotización")
              : cotizacion?.nombre_proyecto || "Nueva cotización"}
            </div>
          </div>
        </div>
        {cotizacion && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: cotizacion.prioridad === "Normal" ? C.muted : cotizacion.prioridad === "Urgente" ? C.amber : C.red, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
              {cotizacion.prioridad}
            </span>
            <span style={{ fontSize: 11, color: "#8BBDD6" }}>
              {cotizacion.cantidad ? parseInt(cotizacion.cantidad).toLocaleString("es-MX") + " pzas" : ""}
            </span>
          </div>
        )}
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
        {tab === "cotizacion" && (
          <SolicitudCotizacion onGuardar={handleGuardarCot} />
        )}
        {tab === "calc" && (
          <>
            <Calculadora onCalcDone={setCalcData} cotizacion={cotizacion} />
            {calcData && (
              <div style={{ marginTop: 4 }}>
                <button onClick={() => setTab("envio")} style={{ ...btn(C.coral, true), width: "100%" }}>
                  Continuar → ✉ Enviar solicitud
                </button>
              </div>
            )}
          </>
        )}
        {tab === "cotizar"   && <Cotizador cotizacion={cotizacion} calcData={calcData} onTiempoEstimado={setTiempoEstimado} onProveedoresUsados={setProveedoresCotizacion} />}
        {tab === "envio" && (
          <>
            <EnvioSolicitud calcData={calcData} cotizacion={cotizacion} tiempoEstimado={tiempoEstimado} proveedoresCotizacion={proveedoresCotizacion} />
            <div style={{ marginTop: 4 }}>
              <button onClick={() => setTab("cotizar")} style={{ ...btn(C.cyan, true), width: "100%" }}>
                Continuar → 💵 Cotizar
              </button>
            </div>
          </>
        )}
        {tab === "seg"       && <Seguimiento />}
        {tab === "cronograma" && <CronogramaGeneral />}
        {tab === "histcot"    && <HistorialPreciosCotizaciones />}
        {tab === "admin"     && <AdminProveedores />}
        {tab === "templates" && <AdminTemplates />}
      </div>
    </div>
  );
}

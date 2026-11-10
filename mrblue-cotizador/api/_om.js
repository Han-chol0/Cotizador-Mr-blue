// api/_om.js — Órdenes de Maquila (formato MRB-MAQ-F-002)
//
// Lee un pedido de ClickUp, agrupa sus subtareas por MAQUILADOR y arma UNA
// Orden de Maquila por proveedor. Todas llevan el mismo número de orden (el del
// pedido). Cada PDF se guarda en Supabase Storage, se anexa a la subtarea del
// proveedor y a la tarea del pedido, y queda en la tabla `ordenes_maquila`
// para revisarlo y enviarlo desde el Cotizador.
//
// Los archivos que empiezan con "_" no se publican como rutas en Vercel.
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";
import { PLEX_REGULAR_B64, PLEX_BOLD_B64, PLEX_ITALIC_B64 } from "./_fuentes.js";
import { LOGO_MRBLUE_B64 } from "./_logo.js";

export const BUCKET = "proveedor-archivos";
const CU = "https://api.clickup.com/api/v2";

// ── Supabase (mismas variables que usa el front) ──────────────────────────────
export function supa() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY en Vercel.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── ClickUp ───────────────────────────────────────────────────────────────────
function tokenCU() {
  const t = process.env.CLICKUP_API_TOKEN;
  if (!t) throw new Error("Falta CLICKUP_API_TOKEN en las variables de entorno de Vercel.");
  return t;
}
async function cuGet(path) {
  const r = await fetch(CU + path, { headers: { Authorization: tokenCU() } });
  if (!r.ok) throw new Error(`ClickUp respondió ${r.status} en ${path}: ${(await r.text().catch(() => "")).slice(0, 160)}`);
  return r.json();
}
export async function cuAdjuntar(taskId, nombre, buffer, tipo = "application/pdf") {
  const form = new FormData();
  form.append("attachment", new Blob([buffer], { type: tipo }), nombre);
  const r = await fetch(`${CU}/task/${encodeURIComponent(taskId)}/attachment`, {
    method: "POST", headers: { Authorization: tokenCU() }, body: form,
  });
  if (!r.ok) throw new Error(`ClickUp respondió ${r.status} al adjuntar: ${(await r.text().catch(() => "")).slice(0, 160)}`);
  return r.json().catch(() => ({}));
}
export async function cuComentar(taskId, texto) {
  const r = await fetch(`${CU}/task/${encodeURIComponent(taskId)}/comment`, {
    method: "POST", headers: { Authorization: tokenCU(), "Content-Type": "application/json" },
    body: JSON.stringify({ comment_text: texto, notify_all: false }),
  });
  if (!r.ok) throw new Error(`ClickUp respondió ${r.status} al comentar`);
}

// Valor legible de un campo personalizado, buscándolo por nombre.
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export function campo(task, nombre) {
  const f = (task.custom_fields || []).find(c => norm(c.name) === norm(nombre));
  if (!f || f.value == null || f.value === "") return null;
  const v = f.value;
  switch (f.type) {
    case "drop_down": {
      if (typeof v === "object" && v.name) return String(v.name).trim();
      const ops = f.type_config?.options || [];
      const op = typeof v === "number" ? ops.find(o => o.orderindex === v) : ops.find(o => o.id === v || String(o.orderindex) === String(v));
      return op ? op.name.trim() : null;
    }
    case "location": return v.formatted_address || null;
    case "checkbox": return v === true || v === "true";
    case "date": return Number(v) || null;
    case "currency": case "number": return Number(v);
    default: return typeof v === "string" ? v.trim() : v;
  }
}
const primero = (...vals) => vals.find(v => v != null && v !== "" && !(typeof v === "number" && isNaN(v)));

// ── Procesos: palabra en el nombre de la subtarea → campo $ y orden en la cadena ──
const PROCESOS = [
  { clave: "papel",      re: /papel/i,                 campo: "$ Papel",                orden: 0, nombre: "Papel" },
  { clave: "tintas",     re: /tinta|pantone/i,         campo: "$ Tintas",               orden: 1, nombre: "Tintas especiales" },
  { clave: "impresion",  re: /impres/i,                campo: "$ Impresión",            orden: 2, nombre: "Impresión" },
  { clave: "laminado",   re: /lamin/i,                 campo: "$ Laminado",             orden: 3, nombre: "Laminado" },
  { clave: "barniz",     re: /barniz/i,                campo: "$ Barniz -U.V.",         orden: 3, nombre: "Barniz" },
  { clave: "serigrafia", re: /serigraf/i,              campo: "$ Serigrafia",           orden: 3, nombre: "Serigrafía" },
  { clave: "suaje",      re: /suaje|troquel/i,         campo: "$ Suaje",                orden: 4, nombre: "Suaje" },
  { clave: "sobre",      re: /sobre/i,                 campo: "$Sobre Acabado",         orden: 5, nombre: "Maquila de sobre" },
  { clave: "acabado",    re: /acabad|manual|encuadern|pegad/i, campo: "$ Acabados/Manualidades", orden: 5, nombre: "Acabados" },
  { clave: "promo",      re: /promocional/i,           campo: "$ Promocionales",        orden: 5, nombre: "Promocionales" },
  { clave: "empaque",    re: /empaque/i,               campo: "$ Empaque Envios",       orden: 6, nombre: "Empaque" },
  { clave: "flete",      re: /flete/i,                 campo: "$ Fletes",               orden: 7, nombre: "Flete" },
];
const procesoDe = (nombreSubtarea) => PROCESOS.find(p => p.re.test(nombreSubtarea || "")) || { clave: "otro", campo: "$ Otros", orden: 5, nombre: "Otro" };

// Opciones del dropdown MAQUILADOR que son títulos de grupo, no proveedores.
const TITULOS_MAQUILADOR = new Set(["impresion", "acabados", "papel", "fletes", "suajes", "sobres", "tintas", "laminado", "cajas", "promocionales", "acrilicos", "otros"]);
// Subtareas que son registros de entrega, no procesos de maquila.
const ES_ENTREGA = /^(entrega rem|flete extra rem)/i;

const fechaMX = (ms) => {
  if (!ms) return "";
  const d = new Date(Number(ms));
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Mexico_City" });
};

// ── Leer el pedido y armar los datos de cada orden ────────────────────────────
export async function leerPedido(taskId) {
  const task = await cuGet(`/task/${encodeURIComponent(taskId)}?include_subtasks=true`);
  const subtareasResumen = (task.subtasks || []).filter(s => !ES_ENTREGA.test(s.name || ""));
  const subtareas = [];
  for (const s of subtareasResumen) subtareas.push(await cuGet(`/task/${encodeURIComponent(s.id)}`));
  return { task, subtareas };
}

export async function proveedoresPorNombre(sb) {
  const { data } = await sb.from("proveedores").select("nombre, email, whatsapp, contacto_nombre");
  const mapa = new Map();
  (data || []).forEach(p => mapa.set(norm(p.nombre), p));
  return mapa;
}

export function armarOrdenes(task, subtareas, proveedores) {
  const om = String(primero(campo(task, "Numero de Orden")) ?? "").replace(/\.0+$/, "");
  const direccion = campo(task, "Dirección de entrega") || "";
  const grupos = new Map();
  const sinMaquilador = [];

  for (const st of subtareas) {
    const maq = campo(st, "MAQUILADOR");
    if (!maq || TITULOS_MAQUILADOR.has(norm(maq))) { sinMaquilador.push(st.name); continue; }
    const proc = procesoDe(st.name);
    const k = norm(maq);
    if (!grupos.has(k)) grupos.set(k, { maquilador: maq, subtareas: [], procesos: [], costo: 0, orden: 99, entrega: null, correo: null, contacto: null });
    const g = grupos.get(k);
    g.subtareas.push({ id: st.id, nombre: st.name });
    g.procesos.push(proc.nombre === "Otro" ? st.name : proc.nombre);
    g.costo += Number(campo(st, proc.campo)) || 0;
    g.orden = Math.min(g.orden, proc.orden);
    g.ordenMax = Math.max(g.ordenMax ?? 0, proc.orden);
    g.entrega = g.entrega || (st.due_date ? Number(st.due_date) : null);
    g.correo = g.correo || campo(st, "Correo Electronico Maquilador");
    g.contacto = g.contacto || campo(st, "Contacto Maquilador");
    g.pliegosTrabajados = g.pliegosTrabajados || campo(st, "# Pliegos Trabajados maquilador");
  }

  // Pedido de un solo proveedor: el MAQUILADOR viene en la tarea, no en subtareas.
  if (!grupos.size) {
    const maq = campo(task, "MAQUILADOR");
    if (maq && !TITULOS_MAQUILADOR.has(norm(maq))) {
      const camposPesos = PROCESOS.map(p => p.campo).concat("$ Otros", "$ Laminas").filter(c => c !== "$ Fletes");
      const costo = [...new Set(camposPesos)].reduce((sum, c) => sum + (Number(campo(task, c)) || 0), 0);
      grupos.set(norm(maq), {
        maquilador: maq, subtareas: [], costo, orden: 0, ordenMax: 6,
        procesos: [campo(task, "Producto Cotizado") || "Maquila completa"].concat(campo(task, "Acabados") ? [campo(task, "Acabados")] : []),
        entrega: task.due_date ? Number(task.due_date) : null,
        correo: campo(task, "Correo Electronico Maquilador"), contacto: campo(task, "Contacto Maquilador"),
        pliegosTrabajados: campo(task, "# Pliegos Trabajados maquilador"),
      });
    }
  }

  const lista = [...grupos.values()].sort((a, b) => a.orden - b.orden);
  const tintas = campo(task, "Numero de tintas") || "";
  const acabadosMarcados = ["Laminado", "Barniz U.V.", "Suaje", "Doblez", "Corte", "Plecado", "Engrapado", "Alzado", "Hotmelt",
    "Hot Stamping", "Wire-o", "Encuadernacion", "Rustica Cosida", "Pasta Dura", "Serigrafia", "Acabado sobres", "Acabados Manuales"]
    .filter(n => campo(task, n) === true);

  return {
    om,
    sinMaquilador,
    ordenes: lista.map((g, i) => {
      const prov = proveedores.get(norm(g.maquilador)) || {};
      // Esquema de envío: a quién le entrega este proveedor cuando termina.
      const siguiente = lista.find(o => o !== g && o.orden > (g.ordenMax ?? g.orden));
      const esquema = g.procesos.includes("Flete")
        ? `Recoger con ${lista.filter(o => o !== g && o.orden < 7).slice(-1)[0]?.maquilador || "el último maquilador"} y entregar en: ${direccion || "dirección por confirmar"}`
        : siguiente
          ? (siguiente.procesos.includes("Flete")
              ? `Entregar a ${siguiente.maquilador} (flete) para llevar a: ${direccion || "dirección por confirmar"}`
              : `Entregar a ${siguiente.maquilador} (${siguiente.procesos.join(", ")})`)
          : `Entregar a Mr. Blue / cliente final${direccion ? ": " + direccion : ""}`;
      const pliegosTot = primero(campo(task, "# Pliegos"), g.pliegosTrabajados);
      return {
        maquilador: g.maquilador,
        email: primero(g.correo, prov.email) || "",
        contacto: primero(g.contacto, prov.contacto_nombre) || "",
        telefono: prov.whatsapp || "",
        subtareas: g.subtareas,
        datos: {
          om,
          fechaEmision: Date.now(),
          fechaEntrega: g.entrega,
          piezas: primero(campo(task, "Cantidad solicitada pz"), campo(task, "Cantidad Requerida")) ?? "",
          pliegosProduccion: "",
          pliegosMerma: "",
          pliegosTotales: pliegosTot ?? "",
          costo: g.costo || "",
          proyecto: task.name || "",
          cantidad: primero(campo(task, "Cantidad solicitada pz"), campo(task, "Cantidad Requerida")) ?? "",
          papel: [campo(task, "Tipo de Papel y Gramaje"), campo(task, "Medida Papel") ? "Pliego " + campo(task, "Medida Papel") : null].filter(Boolean).join(" · "),
          proceso: g.procesos.join(", "),
          medidaExtendida: campo(task, "Tamaño Extendido") || "",
          tamanoFinal: campo(task, "Tamaño Final") || "",
          tintas: String(tintas).trim(),
          pantones: campo(task, "Numero de Pantone") || "",
          barniz: [campo(task, "Tipo de Barniz"), campo(task, "Caras a Laminar/Barnizar")].filter(Boolean).join(" · "),
          laminado: campo(task, "Tipo Laminado") || "",
          acabados: [campo(task, "Acabados"), ...acabadosMarcados].filter(Boolean).join(", "),
          esquema,
          observaciones: campo(task, "👀 Observaciones & Comentarios") || "",
          codigoProducto: campo(task, "Código Del Producto") || "",
        },
      };
    }),
  };
}

// ── PDF con el diseño del machote MRB-MAQ-F-002 ───────────────────────────────
const NAVY = "#2E3A66";
const ROSA = "#F2C6CB";
const ROSA_TXT = "#E2707E";
const LINEA = "#2E3A66";
const fmtNum = (v) => (v === "" || v == null || isNaN(Number(v))) ? String(v ?? "") : Number(v).toLocaleString("en-US");
const fmtMoney = (v) => "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function pdfOrden(o) {
  const d = o.datos;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 28, font: null });
    doc.registerFont("R", Buffer.from(PLEX_REGULAR_B64, "base64"));
    doc.registerFont("B", Buffer.from(PLEX_BOLD_B64, "base64"));
    doc.registerFont("I", Buffer.from(PLEX_ITALIC_B64, "base64"));
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = 28, R = doc.page.width - 28, W = R - L;
    const label = (t, x, y, w, opt = {}) => doc.font("B").fontSize(opt.size || 6.6).fillColor(opt.color || NAVY).text(t, x, y, { width: w, align: opt.align || "left" });
    const valor = (t, x, y, w, opt = {}) => doc.font(opt.bold ? "B" : "R").fontSize(opt.size || 8.5).fillColor("#1A1A1A")
      .text(String(t ?? ""), x, y, { width: w, align: opt.align || "left", height: opt.h || 12, ellipsis: true });
    const caja = (x, y, w, h) => doc.rect(x, y, w, h).lineWidth(0.8).strokeColor(LINEA).stroke();
    const raya = (x, y, w) => doc.moveTo(x, y).lineTo(x + w, y).lineWidth(0.8).strokeColor(LINEA).stroke();
    const barra = (x, y, w, h, t, align = "center") => {
      doc.rect(x, y, w, h).fill(NAVY);
      const lineas = String(t).split("\n").length;
      doc.font("B").fontSize(6.8).fillColor(ROSA_TXT).text(t, x + 2, y + (h - lineas * 8.2) / 2, { width: w - 4, align, lineGap: 0 });
    };

    // Marco general
    doc.rect(L, 28, W, 735).lineWidth(1).strokeColor("#000").stroke();

    // Encabezado
    doc.image(Buffer.from(LOGO_MRBLUE_B64, "base64"), L + 14, 36, { height: 46 });
    doc.font("B").fontSize(9.5).fillColor(NAVY).text("Mr. Blue Laboratorios Creativos", L + 150, 40, { width: 260, align: "center" });
    doc.rect(L + 160, 54, 240, 22).fill(ROSA);
    doc.font("B").fontSize(14).fillColor(NAVY).text("ORDEN DE MAQUILA", L + 160, 58, { width: 240, align: "center" });
    doc.font("B").fontSize(7).fillColor(NAVY).text("(ALMACÉN TERCEROS)", L + 160, 82, { width: 240, align: "center" });
    // Cuadro número de orden
    doc.rect(R - 80, 40, 70, 10).fill(NAVY);
    doc.font("B").fontSize(6).fillColor(ROSA_TXT).text("ORDEN DE MAQUILA", R - 80, 42, { width: 70, align: "center" });
    caja(R - 80, 50, 70, 26);
    doc.font("B").fontSize(15).fillColor(NAVY).text(d.om || "—", R - 80, 55, { width: 70, align: "center" });

    // Maquilador y fechas
    let y = 100;
    label("NOMBRE DEL MAQUILADOR:", L + 6, y + 3, 110); valor(o.maquilador, L + 118, y, 200, { bold: true }); raya(L + 118, y + 12, 190);
    const fe = d.fechaEmision ? new Date(Number(d.fechaEmision)) : new Date();
    const partes = fe.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Mexico_City" }).split("/");
    ["DÍA", "MES", "AÑO"].forEach((t, i) => {
      doc.rect(R - 150 + i * 46, y - 6, 46, 9).fill(NAVY);
      doc.font("B").fontSize(6).fillColor(ROSA_TXT).text(t, R - 150 + i * 46, y - 4.5, { width: 46, align: "center" });
      caja(R - 150 + i * 46, y + 3, 46, 13);
      valor(partes[i] || "", R - 150 + i * 46, y + 5, 46, { align: "center", size: 8 });
    });
    label("FECHA DE EMISIÓN", R - 250, y + 7, 96, { align: "right" });
    y += 22;
    label("CONTACTO", L + 6, y + 3, 110); valor(o.contacto, L + 118, y, 200); raya(L + 118, y + 12, 190);
    label("FECHA ENTREGA\nPROVEEDOR:", R - 226, y + 6, 72, { align: "right" });
    valor(fechaMX(d.fechaEntrega), R - 150, y + 7, 138, { bold: true }); raya(R - 150, y + 19, 138);
    y += 20;
    label("TELÉFONO (S)", L + 6, y + 3, 110); valor(o.telefono, L + 118, y, 200); raya(L + 118, y + 12, 190);
    label("CORREO", L + 6, y + 19, 110); valor(o.email, L + 118, y + 16, 200, { size: 7.8 }); raya(L + 118, y + 28, 190);
    // Piezas solicitadas
    label("PIEZAS\nSOLICITADAS", L + 330, y + 14, 60, { align: "center" });
    caja(L + 395, y + 10, 95, 22); valor(fmtNum(d.piezas), L + 395, y + 17, 95, { align: "center", bold: true });
    y += 44;

    // Pliegos
    const pliegosTot = d.pliegosTotales !== "" && d.pliegosTotales != null ? d.pliegosTotales
      : (Number(d.pliegosProduccion) || 0) + (Number(d.pliegosMerma) || 0) || "";
    [["PLIEGOS DE\nPRODUCCIÓN", d.pliegosProduccion], ["PLIEGOS\nMERMA", d.pliegosMerma], ["PLIEGOS\nTOTALES", pliegosTot]].forEach(([t, v], i) => {
      const x = L + 6 + i * 180;
      label(t, x, y + 3, 52, { align: "center", size: 6.2 });
      caja(x + 56, y, 100, 20); valor(fmtNum(v), x + 56, y + 6, 100, { align: "center" });
    });
    y += 30;
    // Costo
    const costo = Number(d.costo) || 0;
    label("COSTO\nCOTIZADO", L + 6, y + 3, 52, { align: "center", size: 6.2 });
    caja(L + 62, y, 100, 20); valor(costo ? fmtMoney(costo) : "", L + 62, y + 6, 100, { align: "center" });
    label("IVA", L + 186, y + 7, 52, { align: "center" });
    caja(L + 242, y, 100, 20); valor(costo ? fmtMoney(costo * 0.16) : "", L + 242, y + 6, 100, { align: "center", bold: true });
    label("TOTAL", L + 366, y + 6, 52, { align: "center", size: 8 });
    caja(L + 422, y, 100, 20); valor(costo ? fmtMoney(costo * 1.16) : "", L + 422, y + 6, 100, { align: "center", bold: true });
    y += 30;
    raya(L, y, W); y += 10;

    // Proyecto
    doc.rect(L, y, 100, 26).fill(NAVY);
    doc.font("B").fontSize(6.8).fillColor(ROSA_TXT).text("NOMBRE DEL PROYECTO", L + 4, y + 9, { width: 92, align: "center" });
    caja(L + 100, y, W - 100, 26);
    valor(d.proyecto + (d.codigoProducto ? "  ·  " + d.codigoProducto : ""), L + 106, y + 8, W - 112, { bold: true });
    y += 34;

    // Tabla de especificaciones
    const cols = [["CANTIDAD", 52], ["PAPEL", 122], ["PROCESO A REALIZAR", 172], ["MEDIDA\nEXTENDIDA", 42], ["TAMAÑO\nFINAL", 42], ["TINTAS", 38], ["PANTONE(S)", 0]];
    cols[6][1] = W - cols.slice(0, 6).reduce((s, c) => s + c[1], 0);
    let x = L;
    cols.forEach(([t, w]) => { barra(x, y, w, 24, t); x += w; });
    y += 24;
    const filaAlto = 52;
    x = L;
    const celdas = [fmtNum(d.cantidad), d.papel, d.proceso, d.medidaExtendida, d.tamanoFinal, d.tintas, d.pantones];
    cols.forEach(([, w], i) => {
      caja(x, y, w, filaAlto);
      doc.font(i === 2 ? "B" : "R").fontSize(i === 2 ? 8.5 : 7.6).fillColor("#1A1A1A")
         .text(String(celdas[i] ?? ""), x + 4, y + 5, { width: w - 8, height: filaAlto - 8, ellipsis: true, align: i === 1 || i === 2 ? "left" : "center" });
      x += w;
    });
    y += filaAlto + 10;

    // Barniz / Acabados / Esquema de envío
    const anchoIzq = 52 + 122 + 100;
    barra(L, y, 52, 20, "BARNIZ"); barra(L + 52, y, anchoIzq - 52, 20, "ACABADOS"); barra(L + anchoIzq, y, W - anchoIzq, 20, "ESQUEMA DE ENVÍO A MAQUILA");
    y += 20;
    const altoBloque = 74;
    caja(L, y, 52, altoBloque); caja(L + 52, y, anchoIzq - 52, altoBloque); caja(L + anchoIzq, y, W - anchoIzq, altoBloque);
    doc.font("R").fontSize(7.4).fillColor("#1A1A1A")
       .text([d.barniz, d.laminado ? "Laminado " + d.laminado : ""].filter(Boolean).join("\n") || "—", L + 3, y + 5, { width: 46, height: altoBloque - 8, ellipsis: true });
    doc.font("R").fontSize(7.8).fillColor("#1A1A1A")
       .text(d.acabados || "—", L + 57, y + 5, { width: anchoIzq - 62, height: altoBloque - 8, ellipsis: true });
    doc.font("B").fontSize(8.6).fillColor(NAVY)
       .text(d.esquema || "—", L + anchoIzq + 6, y + 6, { width: W - anchoIzq - 12, height: altoBloque - 10, ellipsis: true });
    y += altoBloque + 8;

    // Observaciones
    barra(L, y, W, 14, "O B S E R V A C I O N E S");
    y += 14;
    caja(L, y, W, 70);
    doc.font("R").fontSize(8).fillColor("#1A1A1A").text(d.observaciones || "", L + 6, y + 6, { width: W - 12, height: 60, ellipsis: true });
    y += 92;

    // Firmas
    const firma = (cx, yy, t1, t2) => {
      raya(cx - 70, yy, 140);
      doc.font("R").fontSize(6.4).fillColor("#333").text(t1, cx - 70, yy + 3, { width: 140, align: "center" });
      doc.font("B").fontSize(7).fillColor(NAVY).text(t2, cx - 70, yy + 12, { width: 140, align: "center" });
    };
    firma(L + 110, y, "ELABORÓ", "PERSONAL MR BLUE");
    firma(L + W / 2, y, "AUTORIZÓ", "CALIDAD MR BLUE");
    firma(R - 110, y, "RECIBIÓ", "PROVEEDOR");
    y += 46;
    firma(L + W / 2, y, "AUTORIZÓ", "DIRECCIÓN MR BLUE");
    doc.font("B").fontSize(7).fillColor("#2F6FD6").text("MRB-MAQ-F-002", L + 12, 745, { width: 120 });
    doc.font("R").fontSize(6.2).fillColor("#888").text(`Generada ${fechaMX(Date.now())} · Cotizador Mr. Blue`, R - 220, 745, { width: 208, align: "right" });
    doc.end();
  });
}

export const nombreArchivoOM = (o) => {
  const s = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return `OM_${s(o.datos.om) || "SN"}_${s(o.maquilador).slice(0, 30)}.pdf`;
};

// Guarda el PDF en Storage y regresa { url, path }.
export async function guardarPDF(sb, taskId, nombre, buffer) {
  const path = `ordenes-maquila/${String(taskId).replace(/[^\w\-]/g, "_")}/${Date.now()}_${nombre}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: "application/pdf" });
  if (error) throw new Error("No se pudo guardar el PDF en Supabase: " + error.message);
  return { path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

// Plano Mecánico del pedido: el adjunto más reciente que empiece con "PM_".
export async function planoDelPedido(sb, task) {
  const pm = (task.attachments || [])
    .filter(a => /^PM_.*\.pdf$/i.test(a.title || ""))
    .sort((a, b) => Number(b.date) - Number(a.date))[0];
  if (!pm?.url) return null;
  try {
    let r = await fetch(pm.url);
    if (!r.ok) r = await fetch(pm.url, { headers: { Authorization: tokenCU() } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const path = `planos/om-${String(task.id).replace(/[^\w\-]/g, "_")}/${Date.now()}_${pm.title.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buf, { contentType: "application/pdf" });
    if (error) return null;
    return { nombre: pm.title, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  } catch { return null; }
}

// ── Flujo completo para un pedido ─────────────────────────────────────────────
export async function generarOrdenesDePedido(taskId) {
  const sb = supa();
  const { task, subtareas } = await leerPedido(taskId);
  const provs = await proveedoresPorNombre(sb);
  const { om, ordenes, sinMaquilador } = armarOrdenes(task, subtareas, provs);
  if (!ordenes.length) {
    return { ok: false, om, ordenes: [], sinMaquilador, error: "El pedido no tiene subtareas con MAQUILADOR elegido." };
  }
  const plano = await planoDelPedido(sb, task);

  // Órdenes ya guardadas de este pedido: se respetan los datos capturados a mano.
  const { data: previas } = await sb.from("ordenes_maquila").select("*").eq("task_id", task.id);
  const resultado = [];
  for (const o of ordenes) {
    const previa = (previas || []).find(p => norm(p.maquilador) === norm(o.maquilador));
    if (previa?.estado === "enviada") { resultado.push({ maquilador: o.maquilador, omitida: "ya se envió" }); continue; }
    if (previa?.manual) o.datos = { ...o.datos, ...previa.manual };
    if (previa?.email && !o.email) o.email = previa.email;
    const nombre = nombreArchivoOM(o);
    const pdf = await pdfOrden(o);
    const archivo = await guardarPDF(sb, task.id, nombre, pdf);
    const clickup = [];
    for (const st of o.subtareas.slice(0, 1)) {
      try { await cuAdjuntar(st.id, nombre, pdf); clickup.push(st.nombre); } catch (e) { clickup.push("⚠ " + e.message); }
    }
    try { await cuAdjuntar(task.id, nombre, pdf); } catch (e) { clickup.push("⚠ tarea: " + e.message); }
    const fila = {
      task_id: task.id, task_nombre: task.name, om, maquilador: o.maquilador, email: o.email, contacto: o.contacto,
      telefono: o.telefono, subtareas: o.subtareas, datos: o.datos, pdf_url: archivo.url, pdf_path: archivo.path,
      plano_url: plano?.url || null, plano_nombre: plano?.nombre || null, estado: "pendiente", updated_at: new Date().toISOString(),
    };
    const q = previa
      ? sb.from("ordenes_maquila").update(fila).eq("id", previa.id).select().single()
      : sb.from("ordenes_maquila").insert(fila).select().single();
    const { data, error } = await q;
    if (error) throw new Error("No se pudo guardar la orden en Supabase: " + error.message);
    resultado.push({ id: data.id, maquilador: o.maquilador, pdf_url: archivo.url, clickup });
  }
  return { ok: true, om, ordenes: resultado, sinMaquilador, plano: !!plano };
}

// Regenera una orden con datos editados a mano en el Cotizador.
export async function regenerarOrden(id, cambios) {
  const sb = supa();
  const { data: fila, error } = await sb.from("ordenes_maquila").select("*").eq("id", id).single();
  if (error || !fila) throw new Error("No encontré esa orden.");
  const manual = { ...(fila.manual || {}), ...(cambios?.datos || {}) };
  const o = {
    maquilador: fila.maquilador,
    email: cambios?.email ?? fila.email, contacto: cambios?.contacto ?? fila.contacto, telefono: cambios?.telefono ?? fila.telefono,
    datos: { ...fila.datos, ...manual },
  };
  const nombre = nombreArchivoOM(o);
  const pdf = await pdfOrden(o);
  const archivo = await guardarPDF(sb, fila.task_id, nombre, pdf);
  const avisos = [];
  const st = (fila.subtareas || [])[0];
  if (st) { try { await cuAdjuntar(st.id, nombre.replace(/\.pdf$/, "_corregida.pdf"), pdf); } catch (e) { avisos.push(e.message); } }
  try { await cuAdjuntar(fila.task_id, nombre.replace(/\.pdf$/, "_corregida.pdf"), pdf); } catch (e) { avisos.push(e.message); }
  const { data, error: e2 } = await sb.from("ordenes_maquila").update({
    manual, datos: o.datos, email: o.email, contacto: o.contacto, telefono: o.telefono,
    pdf_url: archivo.url, pdf_path: archivo.path, updated_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (e2) throw new Error("No se pudo guardar: " + e2.message);
  return { orden: data, avisos };
}

export async function marcarEnviada(id, a) {
  const sb = supa();
  const { data: fila } = await sb.from("ordenes_maquila").select("*").eq("id", id).single();
  if (!fila) throw new Error("No encontré esa orden.");
  await sb.from("ordenes_maquila").update({ estado: "enviada", enviada_at: new Date().toISOString(), enviada_a: a || fila.email }).eq("id", id);
  const texto = `📦 Orden de Maquila O.M. ${fila.om} enviada a ${fila.maquilador} (${a || fila.email}) el ${fechaMX(Date.now())}. PDF: ${fila.pdf_url}`;
  const st = (fila.subtareas || [])[0];
  try { await cuComentar(st ? st.id : fila.task_id, texto); } catch { /* el envío ya salió; el comentario es opcional */ }
  return { ok: true };
}

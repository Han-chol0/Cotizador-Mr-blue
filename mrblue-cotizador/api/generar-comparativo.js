// api/generar-comparativo.js
//
// Arma el COMPARATIVO DE PROVEEDORES en PDF: por cada proceso de la cotización
// (impresión, papel, barniz, acabados…) lista a todos los proveedores con precio,
// del más barato al más caro, y marca el elegido.
//
// Si viene task_id:
//   · el comparativo completo se adjunta a la tarea de ClickUp, y
//   · cada proceso se adjunta, en su propio PDF, a la subtarea de ese proceso
//     (ej. "Impresión" recibe la hoja con todos los impresores).
// El token de ClickUp vive en Vercel (CLICKUP_API_TOKEN), nunca en el navegador.
import PDFDocument from "pdfkit";
import { PLEX_REGULAR_B64, PLEX_BOLD_B64, PLEX_LIGHT_B64, PLEX_ITALIC_B64 } from "./_fuentes.js";

const FUENTE = "Plex";
const FUENTE_BOLD = "PlexBold";
const FUENTE_LIGHT = "PlexLight";
const FUENTE_ITALIC = "PlexItalic";
function registrarFuentes(doc) {
  doc.registerFont(FUENTE, Buffer.from(PLEX_REGULAR_B64, "base64"));
  doc.registerFont(FUENTE_BOLD, Buffer.from(PLEX_BOLD_B64, "base64"));
  doc.registerFont(FUENTE_LIGHT, Buffer.from(PLEX_LIGHT_B64, "base64"));
  doc.registerFont(FUENTE_ITALIC, Buffer.from(PLEX_ITALIC_B64, "base64"));
}

const NAVY = "#1E3A5F";
const CYAN = "#0095D4";
const GRIS = "#6B7A8D";
const VERDE = "#27AE60";
const VERDE_CLARO = "#EAF7EE";
const AMBAR = "#8A5A00";

const money = (v) =>
  "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money4 = (v) =>
  "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const horas = (h) => {
  const n = Number(h);
  if (!(n > 0)) return "—";
  if (n < 24) return (Math.round(n * 10) / 10) + " h";
  return (Math.round(n / 24 * 10) / 10) + " días";
};
const limpioArchivo = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 60);

// Palabras con las que se reconoce la subtarea de cada proceso en ClickUp.
const PALABRAS_SUBTAREA = {
  impresion: [/impres/i],
  papel: [/papel/i],
  sustrato: [/sustrato/i, /papel/i],
  tintas: [/tinta/i, /pantone/i],
  barniz: [/barniz/i],
  laminado: [/lamin/i],
  suaje: [/suaje/i, /troquel/i],
  acabado: [/acabad/i, /manual/i],
  serigrafia: [/serigraf/i],
  sobre: [/sobre/i],
  empaque: [/empaque/i],
  flete: [/flete/i],
  fijo: [],
};

// ── PDF ───────────────────────────────────────────────────────────────────────
function construirPDF(d, secciones) {
  return new Promise((resolve, reject) => {
    // font: null para que pdfkit no intente cargar Helvetica (ver generar-costeo.js).
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 40, font: null });
    registrarFuentes(doc);
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = doc.page.margins.left;
    const R = doc.page.width - doc.page.margins.right;
    const ancho = R - L;
    const ABAJO = doc.page.height - doc.page.margins.bottom;

    // ── Encabezado ──
    const encabezado = () => {
      doc.font(FUENTE_BOLD).fontSize(18).fillColor(NAVY).text("COMPARATIVO DE PROVEEDORES", L, 40);
      doc.font(FUENTE_LIGHT).fontSize(9).fillColor(GRIS).text("Mr. Blue · Laboratorios Creativos · Documento interno", L, 62);
      doc.font(FUENTE).fontSize(8).fillColor(GRIS)
         .text(`${d.fecha || ""}${d.elaborado ? " · Elaboró: " + d.elaborado : ""}`, L, 44, { width: ancho, align: "right" });
      if (d.folio) doc.font(FUENTE_BOLD).fontSize(10).fillColor(CYAN).text(d.folio, L, 56, { width: ancho, align: "right" });
      doc.moveTo(L, 78).lineTo(R, 78).strokeColor(NAVY).lineWidth(1.2).stroke();
    };
    encabezado();

    // ── Datos del trabajo ──
    let y = 88;
    const datos = [
      ["Proyecto", d.proyecto], ["Cantidad", d.cantidad], ["Pliegos", d.pliegos],
      ["Medida", d.medida], ["Material", d.material], ["Tintas", d.tintas],
    ].filter(([, v]) => v);
    const colW = ancho / 3;
    datos.forEach(([k, v], i) => {
      const cx = L + (i % 3) * colW, cy = y + Math.floor(i / 3) * 16;
      doc.font(FUENTE).fontSize(7).fillColor(GRIS).text(k.toUpperCase(), cx, cy, { width: 60 });
      doc.font(FUENTE_BOLD).fontSize(8.5).fillColor("#1A1A1A").text(String(v), cx + 60, cy - 1, { width: colW - 66, height: 12, ellipsis: true });
    });
    y += Math.ceil(datos.length / 3) * 16 + 8;

    // ── Columnas de cada tabla ──
    const cols = [
      { t: "#", w: 22, a: "center" },
      { t: "PROVEEDOR", w: 230, a: "left" },
      { t: "TOTAL", w: 80, a: "right" },
      { t: "POR PIEZA", w: 66, a: "right" },
      { t: "VS. MÁS BARATO", w: 128, a: "right" },
      { t: "TIEMPO", w: 56, a: "center" },
      { t: "CALIF.", w: 40, a: "center" },
      { t: "NOTAS", w: 0, a: "left" },
    ];
    cols[cols.length - 1].w = ancho - cols.slice(0, -1).reduce((s, c) => s + c.w, 0);

    const nuevaPagina = () => { doc.addPage(); encabezado(); return 88; };

    let totalElegidos = 0, totalBaratos = 0, hayElegidos = false;

    secciones.forEach((s) => {
      const filas = s.filas || [];
      const alto = 22 + 22 + Math.max(1, filas.length) * 18 + (s.sinPrecio?.length ? 16 : 0) + 14;
      if (y + Math.min(alto, 140) > ABAJO) y = nuevaPagina();

      // Título del proceso
      doc.rect(L, y, ancho, 22).fill(NAVY);
      doc.font(FUENTE_BOLD).fontSize(10).fillColor("#FFFFFF")
         .text(String(s.proceso || "").toUpperCase(), L + 8, y + 6, { width: 200 });
      doc.font(FUENTE).fontSize(8).fillColor("#CFE3F3")
         .text([s.servicio, s.cantidadTexto].filter(Boolean).join(" · "), L + 200, y + 7, { width: ancho - 208, align: "right" });
      y += 22;

      // Encabezado de columnas
      doc.rect(L, y, ancho, 18).fill("#E8EEF4");
      let x = L;
      cols.forEach(c => {
        doc.font(FUENTE_BOLD).fontSize(6.8).fillColor(NAVY).text(c.t, x + 4, y + 6, { width: c.w - 8, align: c.a });
        x += c.w;
      });
      y += 18;

      if (!filas.length) {
        doc.font(FUENTE_ITALIC).fontSize(8).fillColor(GRIS)
           .text("Ningún proveedor tiene precio cargado para este servicio.", L + 8, y + 5, { width: ancho - 16 });
        y += 18;
      }

      const minimo = filas.length ? Math.min(...filas.map(f => Number(f.precio) || Infinity)) : 0;
      filas.forEach((f, i) => {
        if (y + 18 > ABAJO) { y = nuevaPagina(); }
        const elegido = !!f.elegido;
        const barato = Number(f.precio) === minimo;
        doc.rect(L, y, ancho, 18).fill(elegido ? VERDE_CLARO : (i % 2 ? "#F7F9FB" : "#FFFFFF"));
        if (elegido) doc.moveTo(L, y).lineTo(L, y + 18).strokeColor(VERDE).lineWidth(3).stroke();
        const dif = minimo > 0 ? ((Number(f.precio) - minimo) / minimo) * 100 : 0;
        const celdas = [
          String(i + 1),
          f.nombre || "—",
          money(f.precio),
          f.unitario != null ? money4(f.unitario) : "—",
          barato ? "Más barato" : "+" + dif.toFixed(1) + "% · +" + money(Number(f.precio) - minimo),
          horas(f.tiempo),
          f.calificacion ? Math.min(5, Math.round(f.calificacion)) + "/5" : "—",
          f.notas || "",
        ];
        x = L;
        if (elegido) {
          // Etiqueta ELEGIDO al final de la columna del proveedor; el nombre usa el resto.
          const xTag = L + cols[0].w + cols[1].w - 52;
          doc.roundedRect(xTag, y + 4, 46, 11, 3).fill(VERDE);
          doc.font(FUENTE_BOLD).fontSize(6.2).fillColor("#FFFFFF").text("ELEGIDO", xTag, y + 6.5, { width: 46, align: "center", lineBreak: false });
        }
        celdas.forEach((txt, j) => {
          const anchoCelda = j === 1 && elegido ? cols[j].w - 62 : cols[j].w - 8;
          const bold = j === 1 || j === 2 || (j === 4 && barato);
          const color = j === 1 && elegido ? VERDE : j === 4 && barato ? VERDE : j === 6 ? AMBAR : "#1A1A1A";
          doc.font(bold ? FUENTE_BOLD : FUENTE).fontSize(j === 7 ? 6.6 : 7.6).fillColor(color)
             .text(txt, x + 4, y + 5, { width: anchoCelda, align: cols[j].a, height: 10, ellipsis: true, lineBreak: false });
          x += cols[j].w;
        });
        doc.moveTo(L, y + 18).lineTo(R, y + 18).strokeColor("#E1E8ED").lineWidth(0.5).stroke();
        y += 18;
      });

      if (filas.length) {
        const eleg = filas.find(f => f.elegido);
        // El resumen solo compara procesos con proveedor elegido, para no mezclar peras con manzanas.
        if (eleg) { totalElegidos += Number(eleg.precio) || 0; totalBaratos += minimo || 0; hayElegidos = true; }
      }
      if (s.real != null && Number(s.real) > 0) {
        doc.font(FUENTE).fontSize(7.2).fillColor(NAVY)
           .text(`Precio real cotizado por el elegido: ${money(s.real)}`, L + 8, y + 4, { width: ancho - 16 });
        y += 14;
      }
      if (s.sinPrecio?.length) {
        doc.font(FUENTE_ITALIC).fontSize(7).fillColor(GRIS)
           .text("Sin precio para este servicio: " + s.sinPrecio.join(", "), L + 8, y + 4, { width: ancho - 16, height: 10, ellipsis: true });
        y += 14;
      }
      y += 12;
    });

    // ── Resumen ──
    if (secciones.length > 1 && hayElegidos) {
      if (y + 44 > ABAJO) y = nuevaPagina();
      doc.rect(L, y, ancho, 36).fill("#F4F7FA");
      doc.font(FUENTE_BOLD).fontSize(9).fillColor(NAVY)
         .text(`Procesos con proveedor elegido: ${money(totalElegidos)}`, L + 10, y + 7, { width: ancho - 20 });
      doc.font(FUENTE).fontSize(8.5).fillColor(GRIS)
         .text(`Con el más barato de cada uno de esos procesos: ${money(totalBaratos)}  ·  Se paga de más por elegir: ${money(totalElegidos - totalBaratos)}`,
               L + 10, y + 21, { width: ancho - 20 });
      y += 44;
    }
    doc.font(FUENTE_ITALIC).fontSize(6.8).fillColor(GRIS)
       .text("Precios calculados con las tarifas vigentes de cada proveedor en el Cotizador Mr. Blue para la cantidad de este trabajo. Información confidencial: no compartir con proveedores ni clientes.",
             L, Math.min(y, ABAJO - 18), { width: ancho });
    doc.end();
  });
}

// ── ClickUp ───────────────────────────────────────────────────────────────────
async function subirAClickUp(taskId, nombreArchivo, buffer, token) {
  const form = new FormData();
  form.append("attachment", new Blob([buffer], { type: "application/pdf" }), nombreArchivo);
  const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/attachment`, {
    method: "POST", headers: { Authorization: token }, body: form,
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    throw new Error(`ClickUp respondió ${r.status}: ${detalle.slice(0, 200)}`);
  }
  return r.json().catch(() => ({}));
}

async function subtareasDe(taskId, token) {
  const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}?include_subtasks=true`, {
    headers: { Authorization: token },
  });
  if (!r.ok) throw new Error(`ClickUp respondió ${r.status} al leer la tarea`);
  const t = await r.json();
  return (t.subtasks || []).map(s => ({ id: s.id, nombre: s.name || "" }));
}

function subtareaPara(seccion, subtareas) {
  const pats = PALABRAS_SUBTAREA[seccion.clave] || [];
  for (const p of pats) {
    const s = subtareas.find(st => p.test(st.nombre));
    if (s) return s;
  }
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const d = req.body || {};
    const secciones = (Array.isArray(d.secciones) ? d.secciones : []).filter(s => s && s.proceso);
    if (!secciones.length) {
      return res.status(400).json({ error: "No hay procesos para comparar. Elige al menos un servicio en Cotizar." });
    }
    const base = limpioArchivo(d.folio ? d.folio + "_" + (d.proyecto || "") : d.proyecto) || "cotizacion";
    const pdf = await construirPDF(d, secciones);
    const nombreArchivo = `Comparativo_${base}.pdf`;

    const clickup = { intentado: false, ok: false, error: null, subtareas: [], sinSubtarea: [] };
    const token = process.env.CLICKUP_API_TOKEN;
    if (d.task_id) {
      clickup.intentado = true;
      if (!token) {
        clickup.error = "Falta CLICKUP_API_TOKEN en las variables de entorno de Vercel.";
      } else {
        try {
          await subirAClickUp(d.task_id, nombreArchivo, pdf, token);
          clickup.ok = true;
        } catch (e) { clickup.error = e.message; }

        // Un PDF por proceso en la subtarea que le toca.
        let subtareas = [];
        try { subtareas = await subtareasDe(d.task_id, token); } catch (e) { clickup.errorSubtareas = e.message; }
        for (const s of secciones) {
          const st = subtareaPara(s, subtareas);
          if (!st) { clickup.sinSubtarea.push(s.proceso); continue; }
          try {
            const pdfProceso = await construirPDF(d, [s]);
            await subirAClickUp(st.id, `Comparativo_${limpioArchivo(s.proceso)}_${base}.pdf`, pdfProceso, token);
            clickup.subtareas.push({ proceso: s.proceso, subtarea: st.nombre, ok: true });
          } catch (e) {
            clickup.subtareas.push({ proceso: s.proceso, subtarea: st.nombre, ok: false, error: e.message });
          }
        }
      }
    }

    return res.status(200).json({ ok: true, nombreArchivo, pdfBase64: pdf.toString("base64"), clickup });
  } catch (e) {
    console.error("Error generando el comparativo:", e);
    return res.status(500).json({ error: e.message || "Error generando el PDF" });
  }
}

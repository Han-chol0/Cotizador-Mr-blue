// Genera el FORMATO DE COSTEO en PDF y, si viene task_id, lo adjunta solo a
// la tarea de ClickUp. El token de ClickUp vive en variables de entorno de
// Vercel (CLICKUP_API_TOKEN) — nunca toca el navegador.
import PDFDocument from "pdfkit";
import { PLEX_REGULAR_B64, PLEX_BOLD_B64, PLEX_LIGHT_B64, PLEX_ITALIC_B64 } from "./_fuentes.js";

// IBM Plex Mono va embebida en base64 para que no dependa de que el
// empaquetador incluya archivos sueltos — que es justo lo que falló con las
// fuentes de pdfkit. Los nombres FUENTE/FUENTE_BOLD se usan en todo el
// documento, así que cambiar de tipografía es cambiar estas dos constantes.
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
const ROJO = "#E74C3C";
const VERDE = "#27AE60";

const money = (v) =>
  "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money3 = (v) =>
  "$" + (Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Arma el PDF en memoria y lo devuelve como Buffer.
function construirPDF(d) {
  return new Promise((resolve, reject) => {
    // font: null es indispensable. Sin eso, el constructor de pdfkit carga
    // Helvetica de inmediato con un require dinámico que el empaquetador de
    // Vercel no incluye, y truena con "Cannot find module .../Helvetica.cjs"
    // aunque el documento entero use Plex.
    const doc = new PDFDocument({ size: "LETTER", margin: 48, font: null });
    registrarFuentes(doc);
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = doc.page.margins.left;
    const R = doc.page.width - doc.page.margins.right;
    const ancho = R - L;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.font(FUENTE_BOLD).fontSize(20).fillColor(NAVY)
       .text("FORMATO DE COSTEO", L, 50);
    doc.font(FUENTE_LIGHT).fontSize(10).fillColor(GRIS)
       .text("Mr. Blue · Laboratorios Creativos", L, 74);

    // ── Datos generales (etiqueta a la derecha, valor a la izquierda) ───────
    let y = 105;
    const X_VALOR = L + 270;
    const W_VALOR = R - X_VALOR;
    const filaDato = (etiqueta, valor) => {
      const txt = String(valor || "—");
      doc.font(FUENTE).fontSize(9);
      // El proyecto puede ser largo y envolverse en dos líneas: se mide antes
      // para que el siguiente renglón no se le encime.
      const alto = Math.max(15, doc.heightOfString(txt, { width: W_VALOR }) + 4);
      doc.font(FUENTE_BOLD).fontSize(9).fillColor(GRIS)
         .text(etiqueta, L + 150, y, { width: 110, align: "right" });
      doc.font(FUENTE).fontSize(9).fillColor("#1A1A1A")
         .text(txt, X_VALOR, y, { width: W_VALOR });
      y += alto;
    };
    filaDato("AGENTE:", d.agente);
    filaDato("CLIENTE:", d.cliente);
    filaDato("PROYECTO:", d.proyecto);
    filaDato("ELABORADO:", d.elaborado);
    filaDato("FECHA:", d.fecha);

    // ── Especificaciones ────────────────────────────────────────────────────
    y += 12;
    doc.font(FUENTE_BOLD).fontSize(11).fillColor(NAVY).text("ESPECIFICACIONES", L + 150, y);
    doc.moveTo(L + 150, y + 14).lineTo(L + 300, y + 14).strokeColor(NAVY).lineWidth(0.8).stroke();
    y += 24;
    filaDato("Cant. Solicitada:", d.cantidad);
    filaDato("Material:", d.material);
    filaDato("Acabado:", d.acabado);
    filaDato("Medida:", d.medida);

    // ── Costeo ──────────────────────────────────────────────────────────────
    y += 14;
    doc.font(FUENTE_BOLD).fontSize(11).fillColor(NAVY).text("COSTEO", L + 150, y);
    doc.moveTo(L + 150, y + 14).lineTo(L + 240, y + 14).strokeColor(NAVY).lineWidth(0.8).stroke();
    y += 24;

    (d.lineas || []).forEach(ln => {
      doc.font(FUENTE_LIGHT).fontSize(9).fillColor(GRIS)
         .text(String(ln.label).toUpperCase(), L + 100, y, { width: 160, align: "right" });
      doc.font(FUENTE).fontSize(9).fillColor("#1A1A1A")
         .text(ln.monto ? money(ln.monto) : "-", L + 270, y, { width: 90, align: "right" });
      y += 14;
    });

    // Costo total resaltado
    doc.rect(L + 100, y - 2, 260, 17).fill("#E8E8E8");
    doc.font(FUENTE_BOLD).fontSize(9.5).fillColor(NAVY)
       .text("COSTO TOTAL", L + 100, y + 2, { width: 160, align: "right" });
    doc.font(FUENTE_BOLD).fontSize(9.5).fillColor(NAVY)
       .text(money(d.costoTotal), L + 270, y + 2, { width: 90, align: "right" });
    y += 20;
    doc.font(FUENTE).fontSize(9).fillColor(GRIS)
       .text("P.U.", L + 100, y, { width: 160, align: "right" });
    doc.font(FUENTE).fontSize(9).fillColor("#1A1A1A")
       .text(money3(d.costoUnitario), L + 270, y, { width: 90, align: "right" });
    y += 26;

    // ── Escalera de precios ─────────────────────────────────────────────────
    doc.font(FUENTE_BOLD).fontSize(9).fillColor(NAVY)
       .text("PROYECTO: " + (d.proyecto || "—"), L, y, { width: ancho });
    y += 16;

    const cols = [
      { t: "VOLUMEN",        w: 54, a: "center" },
      { t: "COSTO UNIT.",    w: 54, a: "right"  },
      { t: "MARGEN",         w: 46, a: "center" },
      { t: "NETO TRAS ISR",  w: 52, a: "center" },
      { t: "UTILIDAD $",     w: 50, a: "right"  },
      { t: "P. VENTA",       w: 50, a: "right"  },
      { t: "COSTO TOTAL",    w: 68, a: "right"  },
      { t: "UTILIDAD TOTAL", w: 70, a: "right"  },
      { t: "VENTA TOTAL",    w: 70, a: "right"  },
    ];
    const totalCols = cols.reduce((a, c) => a + c.w, 0);
    const x0 = L + Math.max(0, (ancho - totalCols) / 2);

    // Encabezado de tabla
    doc.rect(x0, y, totalCols, 26).fill(NAVY);
    let x = x0;
    cols.forEach(c => {
      doc.font(FUENTE_BOLD).fontSize(6.8).fillColor("#FFFFFF")
         .text(c.t, x + 3, y + 9, { width: c.w - 6, align: c.a });
      x += c.w;
    });
    y += 26;

    // Renglones
    (d.escalera || []).forEach((r, i) => {
      const bajo = r.bajoPiso;
      const piso = r.esPiso;
      doc.rect(x0, y, totalCols, 17)
         .fill(bajo ? "#FDEDEC" : piso ? "#FFF8E1" : (i % 2 ? "#F7F9FB" : "#FFFFFF"));
      if (bajo || piso) {
        doc.moveTo(x0, y).lineTo(x0, y + 17)
           .strokeColor(bajo ? ROJO : "#F39C12").lineWidth(2.5).stroke();
      }
      const color = bajo ? ROJO : piso ? "#8A5A00" : "#1A1A1A";
      const celdas = [
        Number(d.qty).toLocaleString("en-US"),
        money3(d.costoUnitario),
        r.margen.toFixed(2).replace(/\.00$/, "") + "%",
        (r.netoTrasIsr != null ? r.netoTrasIsr.toFixed(1) + "%" : "—"),
        money3(r.utilidadUnit),
        money3(r.precioUnit),
        money(d.costoTotal),
        money(r.utilidadTotal),
        money(r.ventaTotal),
      ];
      x = x0;
      celdas.forEach((txt, j) => {
        doc.font(j === 2 || (piso && j === 3) ? FUENTE_BOLD : FUENTE).fontSize(6.9)
           .fillColor(color)
           .text(txt, x + 3, y + 5, { width: cols[j].w - 6, align: cols[j].a });
        x += cols[j].w;
      });
      if (piso) {
        doc.font(FUENTE_BOLD).fontSize(6.2).fillColor("#8A5A00")
           .text("PISO", x0 + totalCols + 4, y + 6, { width: 40 });
      }
      doc.moveTo(x0, y + 17).lineTo(x0 + totalCols, y + 17).strokeColor("#E1E8ED").lineWidth(0.5).stroke();
      y += 17;
    });

    // ── Nota del piso ───────────────────────────────────────────────────────
    if (d.pisoMargen != null) {
      y += 12;
      doc.rect(x0, y, totalCols, 32).fill("#FFF8E1");
      doc.moveTo(x0, y).lineTo(x0, y + 32).strokeColor("#F39C12").lineWidth(2.5).stroke();
      doc.font(FUENTE_BOLD).fontSize(7.5).fillColor("#8A5A00")
         .text(`PISO: ${d.pisoMargen.toFixed(2)}% — no cotizar por debajo sin autorización.`,
               x0 + 8, y + 7, { width: totalCols - 16 });
      doc.font(FUENTE).fontSize(7).fillColor("#8A5A00")
         .text(`Es el margen que, después del ISR (${(d.isrPct ?? 33)}%), deja ${((d.pisoMargen * (1 - (d.isrPct ?? 33) / 100))).toFixed(1)}% neto sobre la venta. "Neto tras ISR" es lo que de verdad queda de cada escalón.`,
               x0 + 8, y + 18, { width: totalCols - 16 });
      y += 38;
    }

    if (d.notaIndirecto) {
      doc.font(FUENTE_ITALIC).fontSize(7).fillColor(GRIS)
         .text(d.notaIndirecto, L, y, { width: ancho });
    }

    doc.end();
  });
}

// Sube el PDF como adjunto de una tarea de ClickUp.
async function subirAClickUp(taskId, nombreArchivo, buffer, token) {
  const form = new FormData();
  form.append("attachment", new Blob([buffer], { type: "application/pdf" }), nombreArchivo);
  const r = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/attachment`, {
    method: "POST",
    headers: { Authorization: token },
    body: form,
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    throw new Error(`ClickUp respondió ${r.status}: ${detalle.slice(0, 300)}`);
  }
  return r.json().catch(() => ({}));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const d = req.body || {};
    if (!d.costoTotal || !d.qty) {
      return res.status(400).json({ error: "Faltan costoTotal y qty para armar el formato." });
    }

    const pdf = await construirPDF(d);
    const nombreArchivo =
      "Costeo_" + String(d.proyecto || "cotizacion").replace(/[^\w\-]+/g, "_").slice(0, 60) + ".pdf";

    // Adjuntar a ClickUp solo si hay tarea y token configurado.
    let clickup = { intentado: false, ok: false, error: null };
    const token = process.env.CLICKUP_API_TOKEN;
    if (d.task_id) {
      clickup.intentado = true;
      if (!token) {
        clickup.error = "Falta CLICKUP_API_TOKEN en las variables de entorno de Vercel.";
      } else {
        try {
          await subirAClickUp(d.task_id, nombreArchivo, pdf, token);
          clickup.ok = true;
        } catch (e) {
          clickup.error = e.message;
        }
      }
    }

    // El PDF también regresa en base64 para poder descargarlo desde la app,
    // así sirve aunque la cotización todavía no tenga tarea en ClickUp.
    return res.status(200).json({
      ok: true,
      nombreArchivo,
      pdfBase64: pdf.toString("base64"),
      clickup,
    });
  } catch (e) {
    console.error("Error generando el costeo:", e);
    return res.status(500).json({ error: e.message || "Error generando el PDF" });
  }
}

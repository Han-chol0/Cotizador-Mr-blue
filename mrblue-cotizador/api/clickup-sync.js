// api/clickup-sync.js
// Escribe en ClickUp lo capturado en el Cotizador (sin captura doble).
// Recibe { task_id, campos: { "Nombre del campo": valor }, comentario }
// y resuelve los campos POR NOMBRE en la lista de la tarea.
// Usa CLICKUP_API_TOKEN de Vercel.

const API = "https://api.clickup.com/api/v2";

async function cu(path, token, init = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: token, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`ClickUp ${r.status} en ${path}: ${(data && (data.err || data.error)) || ""}`);
  return data;
}

const norm = (t) => String(t || "")
  .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ").trim();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido" });
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return res.status(500).json({ error: "Falta CLICKUP_API_TOKEN en Vercel." });

  const { task_id, campos, comentario } = req.body || {};
  if (!task_id) return res.status(400).json({ error: "Falta task_id." });

  const resultado = { escritos: [], sin_campo: [], errores: [], comentario: false };
  try {
    const task = await cu(`/task/${encodeURIComponent(task_id)}`, token);
    const listId = task.list && task.list.id;
    const defs = listId ? (await cu(`/list/${listId}/field`, token)).fields || [] : [];
    const porNombre = new Map(defs.map(f => [norm(f.name), f]));

    for (const [nombre, valor] of Object.entries(campos || {})) {
      if (valor === null || valor === undefined || valor === "") continue;
      const def = porNombre.get(norm(nombre));
      if (!def) { resultado.sin_campo.push(nombre); continue; }
      let value = valor;
      if (def.type === "currency" || def.type === "number") value = Number(valor);
      if (def.type === "drop_down") {
        const op = ((def.type_config && def.type_config.options) || [])
          .find(o => norm(o.name) === norm(String(valor)));
        if (!op) { resultado.sin_campo.push(`${nombre} (opcion: ${valor})`); continue; }
        value = op.id;
      }
      try {
        await cu(`/task/${encodeURIComponent(task_id)}/field/${def.id}`, token,
          { method: "POST", body: JSON.stringify({ value }) });
        resultado.escritos.push(nombre);
      } catch (e) { resultado.errores.push(`${nombre}: ${e.message}`); }
    }

    if (comentario) {
      try {
        await cu(`/task/${encodeURIComponent(task_id)}/comment`, token,
          { method: "POST", body: JSON.stringify({ comment_text: comentario, notify_all: false }) });
        resultado.comentario = true;
      } catch (e) { resultado.errores.push("comentario: " + e.message); }
    }
    return res.status(200).json({ ok: true, ...resultado });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Error inesperado" });
  }
}

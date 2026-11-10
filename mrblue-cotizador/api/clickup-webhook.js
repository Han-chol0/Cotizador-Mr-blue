// api/clickup-webhook.js
//
// ClickUp llama aquí cada vez que cambia una tarea de la lista Pedidos.
// Si lo que cambió fue la casilla "Generar Documentacion" y quedó MARCADA,
// se generan las Órdenes de Maquila del pedido (una por proveedor).
//
// Seguridad: la URL registrada en ClickUp lleva ?k=<CLICKUP_WEBHOOK_KEY>.
// Si la llave no coincide, no se hace nada.
import { generarOrdenesDePedido, supa } from "./_om.js";

const CAMPO_GENERAR = "f19bc969-04d6-4a4f-95f5-257c1562b9ae"; // Generar Documentacion

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });
  const llave = process.env.CLICKUP_WEBHOOK_KEY;
  if (!llave || req.query?.k !== llave) return res.status(401).json({ error: "Llave inválida" });

  const b = req.body || {};
  const items = Array.isArray(b.history_items) ? b.history_items : [];
  const marcada = items.some(h =>
    (h.custom_field?.id === CAMPO_GENERAR || h.field === CAMPO_GENERAR) &&
    (h.after === true || h.after === "true"));
  if (b.event !== "taskUpdated" || !marcada || !b.task_id) return res.status(200).json({ ok: true, ignorado: true });

  try {
    // ClickUp reintenta si tardamos; si este pedido se generó hace menos de 2 min, no se repite.
    const sb = supa();
    const { data: recientes } = await sb.from("ordenes_maquila").select("updated_at")
      .eq("task_id", b.task_id).gte("updated_at", new Date(Date.now() - 120000).toISOString()).limit(1);
    if (recientes && recientes.length) return res.status(200).json({ ok: true, repetido: true });

    const r = await generarOrdenesDePedido(b.task_id);
    return res.status(200).json({ ok: true, ordenes: r.ordenes?.length || 0, error: r.error || null });
  } catch (e) {
    console.error("clickup-webhook:", e);
    // 200 para que ClickUp no reintente en bucle; el error queda en los logs de Vercel.
    return res.status(200).json({ ok: false, error: e.message });
  }
}

// api/ordenes-maquila.js
//
// POST { accion: "generar",   task_id }            → arma las Órdenes de Maquila del pedido
// POST { accion: "regenerar", id, datos, email… }  → vuelve a hacer el PDF con lo editado a mano
// POST { accion: "enviada",   id, email }          → marca la orden como enviada y comenta en ClickUp
//
// El correo al proveedor sale desde el navegador por /api/send-email (igual que
// las solicitudes de cotización), con la orden y el Plano Mecánico adjuntos.
import { generarOrdenesDePedido, regenerarOrden, marcarEnviada } from "./_om.js";

const idDeTarea = (v) => {
  const s = String(v || "").trim();
  const m = s.match(/app\.clickup\.com\/t\/(?:\d+\/)?([a-z0-9]+)/i);
  return m ? m[1] : s.replace(/^#/, "");
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const b = req.body || {};
  try {
    if (b.accion === "generar") {
      const taskId = idDeTarea(b.task_id);
      if (!/^[a-z0-9]+$/i.test(taskId)) return res.status(400).json({ error: "Pega el link o el ID de la tarea del pedido en ClickUp." });
      return res.status(200).json(await generarOrdenesDePedido(taskId));
    }
    if (b.accion === "regenerar") {
      if (!b.id) return res.status(400).json({ error: "Falta id" });
      return res.status(200).json(await regenerarOrden(b.id, b));
    }
    if (b.accion === "enviada") {
      if (!b.id) return res.status(400).json({ error: "Falta id" });
      return res.status(200).json(await marcarEnviada(b.id, b.email));
    }
    return res.status(400).json({ error: "accion debe ser generar, regenerar o enviada" });
  } catch (e) {
    console.error("ordenes-maquila:", e);
    return res.status(500).json({ error: e.message || "Error inesperado" });
  }
}

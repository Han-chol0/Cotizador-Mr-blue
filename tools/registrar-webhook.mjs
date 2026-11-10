// Registra en ClickUp el aviso (webhook) que dispara las Órdenes de Maquila
// cuando se marca "Generar Documentacion" en la lista Pedidos.
//
// Uso (una sola vez, en Terminal):
//   CLICKUP_API_TOKEN=pk_xxx CLICKUP_WEBHOOK_KEY=una-clave-larga node tools/registrar-webhook.mjs
//
// Para ver o borrar webhooks: el script imprime el id; se borran con
//   curl -X DELETE -H "Authorization: $CLICKUP_API_TOKEN" https://api.clickup.com/api/v2/webhook/<id>
const TEAM_ID = "4200520";          // Workspace Mr. Blue
const LISTA_PEDIDOS = 50594899;     // Ventas › Pedidos
const URL_APP = process.env.URL_APP || "https://cotizador-mr-blue.vercel.app";

const token = process.env.CLICKUP_API_TOKEN;
const llave = process.env.CLICKUP_WEBHOOK_KEY;
if (!token || !llave) {
  console.error("Falta CLICKUP_API_TOKEN o CLICKUP_WEBHOOK_KEY.");
  process.exit(1);
}
const endpoint = `${URL_APP}/api/clickup-webhook?k=${encodeURIComponent(llave)}`;
const r = await fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/webhook`, {
  method: "POST",
  headers: { Authorization: token, "Content-Type": "application/json" },
  body: JSON.stringify({ endpoint, events: ["taskUpdated"], list_id: LISTA_PEDIDOS }),
});
const data = await r.json().catch(() => ({}));
if (!r.ok) { console.error("ClickUp respondió", r.status, data); process.exit(1); }
console.log("✓ Webhook creado:", data.id, "→", URL_APP + "/api/clickup-webhook");

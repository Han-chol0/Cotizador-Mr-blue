// api/send-email.js
//
// Vercel corre este archivo en su servidor, no en el navegador del usuario —
// por eso sí puede llamar a Resend sin que el CORS lo bloquee. El navegador le
// habla a esta función (mismo dominio, sin problema), y esta función es la que
// de verdad le habla a Resend.
//
// attachments (opcional): [{ filename, path }] con la URL pública del archivo
// (Resend lo descarga de ahí) o [{ filename, content }] con el archivo en base64.

const MAX_ADJUNTOS = 10;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, from, to, subject, text, attachments } = req.body || {};

  if (!apiKey || !from || !to || !subject || !text) {
    return res.status(400).json({ error: "Faltan campos: apiKey, from, to, subject, text" });
  }

  let adjuntos = [];
  if (attachments != null) {
    if (!Array.isArray(attachments) || attachments.length > MAX_ADJUNTOS) {
      return res.status(400).json({ error: `attachments debe ser una lista de máximo ${MAX_ADJUNTOS} archivos` });
    }
    for (const a of attachments) {
      const filename = typeof a?.filename === "string" ? a.filename.slice(0, 200) : "";
      if (!filename) return res.status(400).json({ error: "Cada adjunto necesita filename" });
      if (typeof a.path === "string" && /^https:\/\//i.test(a.path)) {
        adjuntos.push({ filename, path: a.path });
      } else if (typeof a.content === "string" && a.content.length > 0) {
        adjuntos.push({ filename, content: a.content });
      } else {
        return res.status(400).json({ error: `El adjunto ${filename} necesita path (https) o content (base64)` });
      }
    }
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({ from, to, subject, text, ...(adjuntos.length ? { attachments: adjuntos } : {}) }),
    });

    const data = await resendRes.json().catch(() => null);

    if (!resendRes.ok) {
      return res.status(resendRes.status).json({ error: data?.message || "Error de Resend", data });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Error inesperado" });
  }
}

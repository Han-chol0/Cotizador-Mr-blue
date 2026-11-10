// api/send-email.js
//
// Vercel corre este archivo en su servidor, no en el navegador del usuario —
// por eso sí puede llamar a Resend sin que el CORS lo bloquee. El navegador le
// habla a esta función (mismo dominio, sin problema), y esta función es la que
// de verdad le habla a Resend.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, from, to, subject, text, attachments } = req.body || {};

  if (!apiKey || !from || !to || !subject || !text) {
    return res.status(400).json({ error: "Faltan campos: apiKey, from, to, subject, text" });
  }

  // Adjuntos opcionales: [{ filename, path }] donde path es una URL pública
  // (Supabase Storage). Resend descarga cada archivo y lo adjunta de verdad.
  const conAdjuntos = Array.isArray(attachments) && attachments.length > 0;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({ from, to, subject, text, ...(conAdjuntos ? { attachments } : {}) }),
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

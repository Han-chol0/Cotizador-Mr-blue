# Mr. Blue · Cotizador Offset

App interna para cálculo de pliegos, cotización a proveedores y seguimiento de respuestas.

## Stack
- React 18 + Vite
- localStorage para persistencia de datos
- Anthropic API (Claude) para generación de mensajes
- Resend API para envío de correos

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo
npm run dev
# → http://localhost:5173
```

---

## Deploy en Vercel (5 minutos)

### Opción A — desde GitHub (recomendado)

1. Sube este folder a un repo de GitHub (puede ser privado)
2. Ve a [vercel.com](https://vercel.com) → Add New Project
3. Importa el repo
4. Vercel detecta Vite automáticamente — sin configuración adicional
5. Clic en **Deploy**
6. Tu URL queda lista: `https://mrblue-cotizador.vercel.app`

Para dominio propio (`cotizador.mrblue.com.mx`):
- En Vercel → Settings → Domains → agrega tu dominio
- En tu DNS agrega un CNAME apuntando a `cname.vercel-dns.com`

### Opción B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Notas importantes

### API Keys
La app pide la API key de Resend directamente en la interfaz (campo de configuración).
La conexión a Claude (Anthropic) ya está incluida en el artifact — funciona sin key adicional
porque usa el endpoint interno de claude.ai.

> ⚠️ Si desplegás fuera de claude.ai, necesitarás agregar tu propia Anthropic API key.
> Contacta a quien construyó la app para el procedimiento.

### Datos
Los datos se guardan en `localStorage` del navegador bajo el prefijo `mrblue_`.
Esto significa que cada usuario/navegador tiene sus propios datos.

**Próximo paso:** conectar Supabase para datos compartidos entre usuarios.
El SQL de setup de tablas está en `mrblue_supabase_setup.sql`.

---

## Estructura del proyecto

```
mrblue-cotizador/
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx       ← entrada React
    └── App.jsx        ← toda la app
```

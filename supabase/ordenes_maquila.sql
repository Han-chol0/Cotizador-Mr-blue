-- Órdenes de Maquila generadas desde el Cotizador (formato MRB-MAQ-F-002).
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.
create table if not exists public.ordenes_maquila (
  id            uuid primary key default gen_random_uuid(),
  task_id       text not null,          -- tarea del pedido en ClickUp
  task_nombre   text,
  om            text,                   -- número de orden (el mismo para todos los proveedores del pedido)
  maquilador    text not null,
  email         text,
  contacto      text,
  telefono      text,
  subtareas     jsonb default '[]'::jsonb,
  datos         jsonb default '{}'::jsonb,   -- lo que va en el PDF
  manual        jsonb default '{}'::jsonb,   -- lo que se corrigió a mano (pliegos, merma, esquema…)
  pdf_url       text,
  pdf_path      text,
  plano_url     text,
  plano_nombre  text,
  estado        text not null default 'pendiente',  -- pendiente | enviada
  enviada_at    timestamptz,
  enviada_a     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ordenes_maquila_task_idx on public.ordenes_maquila (task_id);

-- Mismo acceso que el resto de las tablas del Cotizador (la app no tiene login todavía).
alter table public.ordenes_maquila enable row level security;
drop policy if exists "ordenes_maquila_todo" on public.ordenes_maquila;
create policy "ordenes_maquila_todo" on public.ordenes_maquila
  for all to anon, authenticated using (true) with check (true);

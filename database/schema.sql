
create table if not exists public.usuarios (
  id             uuid primary key default gen_random_uuid(),
  nombre         text        not null check (char_length(trim(nombre)) between 3 and 100),
  email          text        not null unique,
  password_hash  text        not null,
  rol            text        not null default 'usuario' check (rol in ('usuario', 'administrador')),
  activo         boolean     not null default true,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index if not exists usuarios_email_lower_idx
  on public.usuarios (lower(email));

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists usuarios_set_actualizado_en on public.usuarios;
create trigger usuarios_set_actualizado_en
  before update on public.usuarios
  for each row execute function public.set_actualizado_en();


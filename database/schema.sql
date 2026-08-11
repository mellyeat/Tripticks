
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

create table if not exists public.viajes (
  id                uuid          primary key default gen_random_uuid(),
  titulo            text          not null check (char_length(trim(titulo)) between 5 and 150),
  destino           text          not null check (char_length(trim(destino)) between 3 and 120),
  descripcion       text          not null check (char_length(trim(descripcion)) between 20 and 2000),
  itinerario        jsonb         not null default '[]'::jsonb check (jsonb_typeof(itinerario) = 'array'),
  precio            numeric(10,2) not null check (precio > 0),
  fecha_salida      date          not null,
  fecha_regreso     date          not null,
  duracion_dias     integer       generated always as ((fecha_regreso - fecha_salida) + 1) stored,
  cupos_totales     integer       not null check (cupos_totales > 0),
  cupos_disponibles integer       not null check (cupos_disponibles >= 0),
  imagen_url        text          not null check (char_length(trim(imagen_url)) between 5 and 500),
  activo            boolean       not null default true,
  creado_en         timestamptz   not null default now(),
  actualizado_en    timestamptz   not null default now(),
  constraint viajes_fechas_check check (fecha_regreso >= fecha_salida),
  constraint viajes_cupos_check check (cupos_disponibles <= cupos_totales)
);

create index if not exists viajes_destino_lower_idx on public.viajes (lower(destino));
create index if not exists viajes_fecha_salida_idx on public.viajes (fecha_salida);
create index if not exists viajes_precio_idx on public.viajes (precio);

drop trigger if exists viajes_set_actualizado_en on public.viajes;
create trigger viajes_set_actualizado_en
  before update on public.viajes
  for each row execute function public.set_actualizado_en();

-- Arranca en 7842 para que el primer folio coincida con el TT-007842 de las maquetas.
create sequence if not exists public.reservaciones_folio_seq start with 7842;

create table if not exists public.reservaciones (
  id              uuid          primary key default gen_random_uuid(),
  folio           text          not null unique
                                default 'TT-' || lpad(nextval('public.reservaciones_folio_seq')::text, 6, '0'),
  usuario_id      uuid          not null references public.usuarios (id) on delete cascade,
  viaje_id        uuid          not null references public.viajes (id) on delete restrict,
  estado          text          not null default 'activa'
                                check (estado in ('activa', 'cancelada', 'completada')),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0),
  impuestos       numeric(10,2) not null check (impuestos >= 0),
  total           numeric(10,2) not null check (total > 0),
  metodo_pago     text          not null default 'tarjeta' check (metodo_pago in ('tarjeta', 'paypal')),
  creado_en       timestamptz   not null default now(),
  actualizado_en  timestamptz   not null default now(),
  cancelado_en    timestamptz
);

-- RF-12: el indice parcial deja repetir usuario y viaje solo si la reservacion previa
-- ya no esta activa, asi cancelar y volver a reservar sigue siendo posible.
create unique index if not exists reservaciones_activa_unica_idx
  on public.reservaciones (usuario_id, viaje_id)
  where estado = 'activa';

create index if not exists reservaciones_usuario_id_idx on public.reservaciones (usuario_id);
create index if not exists reservaciones_viaje_id_idx on public.reservaciones (viaje_id);

drop trigger if exists reservaciones_set_actualizado_en on public.reservaciones;
create trigger reservaciones_set_actualizado_en
  before update on public.reservaciones
  for each row execute function public.set_actualizado_en();

-- RF-08 y RF-11: supabase-js no abre transacciones, asi que validar el cupo y descontarlo
-- desde el servicio dejaria una ventana en la que dos reservaciones simultaneas pasan del
-- limite. El bloqueo de la fila del viaje y el insert ocurren aqui, en una sola transaccion.
create or replace function public.crear_reservacion(
  p_usuario_id    uuid,
  p_viaje_id      uuid,
  p_metodo_pago   text,
  p_tasa_impuesto numeric
)
returns public.reservaciones
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_viaje       public.viajes;
  v_impuestos   numeric(10,2);
  v_reservacion public.reservaciones;
begin
  select * into v_viaje
    from public.viajes
    where id = p_viaje_id
    for update;

  if not found then
    raise exception 'El viaje no existe.' using errcode = 'TT001';
  end if;

  if not v_viaje.activo then
    raise exception 'El viaje no esta disponible.' using errcode = 'TT004';
  end if;

  if v_viaje.fecha_salida <= current_date then
    raise exception 'El viaje ya salio.' using errcode = 'TT005';
  end if;

  if v_viaje.cupos_disponibles < 1 then
    raise exception 'El viaje no tiene cupos disponibles.' using errcode = 'TT002';
  end if;

  v_impuestos := round(v_viaje.precio * p_tasa_impuesto, 2);

  insert into public.reservaciones (
    usuario_id, viaje_id, precio_unitario, impuestos, total, metodo_pago
  )
  values (
    p_usuario_id, p_viaje_id, v_viaje.precio, v_impuestos,
    v_viaje.precio + v_impuestos, p_metodo_pago
  )
  returning * into v_reservacion;

  update public.viajes
    set cupos_disponibles = cupos_disponibles - 1
    where id = p_viaje_id;

  return v_reservacion;
exception
  when unique_violation then
    raise exception 'Ya tienes una reservacion activa para este viaje.' using errcode = 'TT003';
end;
$$;

-- RF-09: cancelar y liberar el lugar tambien es una sola operacion. La comparacion con
-- cupos_totales evita que una doble cancelacion inflara los cupos por encima del original.
create or replace function public.cancelar_reservacion(
  p_reservacion_id     uuid,
  p_usuario_id         uuid,
  p_es_administrador   boolean
)
returns public.reservaciones
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservacion public.reservaciones;
begin
  select * into v_reservacion
    from public.reservaciones
    where id = p_reservacion_id
    for update;

  if not found then
    raise exception 'La reservacion no existe.' using errcode = 'TT006';
  end if;

  if not p_es_administrador and v_reservacion.usuario_id <> p_usuario_id then
    raise exception 'La reservacion no te pertenece.' using errcode = 'TT007';
  end if;

  if v_reservacion.estado <> 'activa' then
    raise exception 'La reservacion ya no esta activa.' using errcode = 'TT008';
  end if;

  update public.reservaciones
    set estado = 'cancelada',
        cancelado_en = now()
    where id = p_reservacion_id
    returning * into v_reservacion;

  update public.viajes
    set cupos_disponibles = least(cupos_disponibles + 1, cupos_totales)
    where id = v_reservacion.viaje_id;

  return v_reservacion;
end;
$$;

-- RF-16: el panel necesita conteos y un ranking por demanda. Agrupar y contar
-- desde supabase-js exigiria traerse las tablas completas al servidor, asi que
-- las cuatro metricas se resuelven en la base y viajan en una sola respuesta.
create or replace function public.estadisticas_dashboard(p_limite_demanda integer default 5)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'usuarios',              (select count(*) from public.usuarios),
    'usuarios_activos',      (select count(*) from public.usuarios where activo),
    'administradores',       (select count(*) from public.usuarios where rol = 'administrador'),
    'viajes',                (select count(*) from public.viajes),
    'viajes_activos',        (select count(*) from public.viajes where activo),
    'reservaciones',         (select count(*) from public.reservaciones),
    'reservaciones_activas', (select count(*) from public.reservaciones where estado = 'activa'),
    'ingresos',              (select coalesce(sum(total), 0)
                                from public.reservaciones
                                where estado <> 'cancelada'),
    'demanda',               coalesce((
                               select jsonb_agg(to_jsonb(d))
                                 from (
                                   select v.id,
                                          v.titulo,
                                          v.destino,
                                          v.imagen_url,
                                          v.cupos_totales,
                                          v.cupos_disponibles,
                                          count(r.id) as reservaciones
                                     from public.viajes v
                                     left join public.reservaciones r
                                       on r.viaje_id = v.id and r.estado = 'activa'
                                    group by v.id
                                    order by count(r.id) desc, v.fecha_salida asc
                                    limit greatest(p_limite_demanda, 1)
                                 ) d
                             ), '[]'::jsonb)
  );
$$;

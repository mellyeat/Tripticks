
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

alter table public.viajes enable row level security;
revoke all on public.viajes from anon, authenticated;

alter table public.reservaciones enable row level security;
revoke all on public.reservaciones from anon, authenticated;

revoke all on sequence public.reservaciones_folio_seq from anon, authenticated;

revoke execute on function public.crear_reservacion(uuid, uuid, text, numeric)
  from anon, authenticated;
revoke execute on function public.cancelar_reservacion(uuid, uuid, boolean)
  from anon, authenticated;

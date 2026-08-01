
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

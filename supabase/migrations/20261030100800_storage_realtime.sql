-- =====================================================================
-- 009 · Storage (fotos y constancias) y Realtime (el panel "Hoy" se actualiza solo)
-- Rutas: <club_id>/<socio_id o fecha>/<archivo>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos-socios', 'fotos-socios', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('fotos-marcacion', 'fotos-marcacion', false, 2097152, array['image/jpeg', 'image/webp']),
  ('constancias', 'constancias', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avisos', 'avisos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('club', 'club', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Fotos de socios y familia (privadas): el personal las ve; el socio, las de su familia
create policy "fotos_socios_leer" on storage.objects for select to authenticated using (
  bucket_id = 'fotos-socios' and (storage.foldername(name))[1] = (select app.club_id())::text
  and ((select app.es_staff()) or (storage.foldername(name))[2] = (select app.socio_id())::text));
create policy "fotos_socios_subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos-socios' and (storage.foldername(name))[1] = (select app.club_id())::text and (select app.es_directiva()));
create policy "fotos_socios_editar" on storage.objects for update to authenticated using (
  bucket_id = 'fotos-socios' and (storage.foldername(name))[1] = (select app.club_id())::text and (select app.es_directiva()));

-- Fotos de marcación (privadas): las toma la tablet de portería; solo la directiva las ve
create policy "fotos_marcacion_subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos-marcacion' and (storage.foldername(name))[1] = (select app.club_id())::text
  and (select app.tiene_rol('porteria', 'presidente', 'directivo', 'admin')));
create policy "fotos_marcacion_leer" on storage.objects for select to authenticated using (
  bucket_id = 'fotos-marcacion' and (storage.foldername(name))[1] = (select app.club_id())::text and (select app.es_directiva()));

-- Constancias de pago (privadas): el socio sube las suyas; la directiva las revisa
create policy "constancias_subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'constancias' and (storage.foldername(name))[1] = (select app.club_id())::text
  and ((storage.foldername(name))[2] = (select app.socio_id())::text or (select app.es_directiva())));
create policy "constancias_leer" on storage.objects for select to authenticated using (
  bucket_id = 'constancias' and (storage.foldername(name))[1] = (select app.club_id())::text
  and ((storage.foldername(name))[2] = (select app.socio_id())::text or (select app.es_directiva())));

-- Fotos de avisos y del club (públicas para leer; solo la directiva sube)
create policy "publicas_subir" on storage.objects for insert to authenticated with check (
  bucket_id in ('avisos', 'club') and (storage.foldername(name))[1] = (select app.club_id())::text and (select app.es_directiva()));
create policy "publicas_editar" on storage.objects for update to authenticated using (
  bucket_id in ('avisos', 'club') and (storage.foldername(name))[1] = (select app.club_id())::text and (select app.es_directiva()));
create policy "publicas_leer" on storage.objects for select to anon, authenticated using (bucket_id in ('avisos', 'club'));

-- Realtime: cambios que mueven el panel "Hoy", la portería y la barra
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.ingresos, public.comandas, public.cobros, public.pagos, public.marcaciones, public.notificaciones,
      public.caja_movimientos, public.solicitudes_alquiler, public.cierres_barra, public.reservas_cancha, public.alquileres;
  end if;
end $$;

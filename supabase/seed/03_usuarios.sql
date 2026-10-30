-- =====================================================================
-- Seed 03 · Usuarios de prueba (claves y PIN listados en RESUMEN.md)
-- IMPORTANTE: son claves de PRUEBA. Cambiarlas antes de usar datos reales.
-- Staff: correo + clave. Socios: DNI + PIN de 6 dígitos (correo técnico derivado del DNI).
-- =====================================================================

create or replace function app._crear_usuario(p_email text, p_clave text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = lower(p_email);
  if v_id is not null then
    update auth.users set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf', 8)), updated_at = now() where id = v_id;
    return v_id;
  end if;
  v_id := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', lower(p_email),
          extensions.crypt(p_clave, extensions.gen_salt('bf', 8)), now(),
          '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true), 'email', now(), now(), now());
  return v_id;
end;
$$;

-- Personal administrativo y tablets
insert into public.usuarios_staff (id, club_id, nombre, correo, rol, cargo, es_ejemplo)
select app._crear_usuario(c, k), 'c1000000-0000-4000-8000-000000000001', n, c, r, cg, false
from (values
  ('payo@casinopimentel.test', 'Payo.Malecon26', 'Payo', 'presidente', 'Presidente'),
  ('lalo@casinopimentel.test', 'Lalo.Malecon26', 'Lalo', 'directivo', 'Vicepresidente'),
  ('sebastian@casinopimentel.test', 'Sebastian.Malecon26', 'Sebastián', 'admin', 'Directivo a cargo de sistemas'),
  ('julita@casinopimentel.test', 'Julita.Malecon26', 'Julita', 'admin', 'Administración'),
  ('barra1@casinopimentel.test', 'Barra1.Astillero26', 'Tablet Barra 1', 'barra', 'Tablet de barra'),
  ('porteria1@casinopimentel.test', 'Porteria1.Puerta26', 'Tablet Portería', 'porteria', 'Tablet de portería')
) as t(c, k, n, r, cg)
on conflict (id) do update set rol = excluded.rol, nombre = excluded.nombre, activo = true;

insert into public.dispositivos (club_id, nombre, tipo, barra_id, es_ejemplo) values
  ('c1000000-0000-4000-8000-000000000001', 'Tablet Barra 1', 'barra', 'b1000000-0000-4000-8000-000000000001', true),
  ('c1000000-0000-4000-8000-000000000001', 'Tablet Barra 2', 'barra', 'b1000000-0000-4000-8000-000000000002', true),
  ('c1000000-0000-4000-8000-000000000001', 'Tablet Portería', 'porteria', null, true);

-- Socios: cuenta para cada titular. Los dos socios de demostración tienen PIN fijo; el resto,
-- PIN temporal = últimos 6 dígitos del DNI y deben cambiarlo en su primer ingreso.
insert into public.credenciales_socio (user_id, club_id, socio_id, miembro_id, dni, debe_cambiar_pin)
select app._crear_usuario(s.dni || '.casino-pimentel@socios.example.com',
                          case s.apellidos when 'Peralta Ugaz' then '246810' when 'Chirinos Vera' then '135790' else right(s.dni, 6) end),
       s.club_id, s.id, m.id, s.dni, s.apellidos not in ('Peralta Ugaz', 'Chirinos Vera')
from public.socios s join public.miembros m on m.socio_id = s.id and m.parentesco = 'titular'
where s.club_id = 'c1000000-0000-4000-8000-000000000001' and s.dni is not null
on conflict (user_id) do nothing;

update public.socios s set user_id = c.user_id from public.credenciales_socio c where c.socio_id = s.id and c.miembro_id = (select id from public.miembros where socio_id = s.id and parentesco = 'titular');

drop function app._crear_usuario(text, text);

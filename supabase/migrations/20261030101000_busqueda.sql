-- =====================================================================
-- 011 · Búsqueda de personas (socio por nombre, N° o DNI) para portería, barra y panel
-- Ignora tildes y mayúsculas. Devuelve el estado de cuenta para la pill.
-- =====================================================================

create or replace function app.sin_tildes(t text)
returns text language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun')
$$;

create or replace function public.buscar_miembros(p_q text, p_limite int default 20, p_solo_titulares boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := trim(coalesce(p_q, ''));
  v_norm text := app.sin_tildes(trim(coalesce(p_q, '')));
  v_res jsonb;
begin
  if not app.tiene_rol('porteria', 'barra', 'presidente', 'directivo', 'admin') then raise exception 'Sin permiso.'; end if;
  if length(v_q) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.j order by x.rango, x.ap), '[]'::jsonb) into v_res from (
    select jsonb_build_object(
             'miembro_id', m.id, 'socio_id', s.id, 'numero', s.numero, 'nombres', m.nombres, 'apellidos', m.apellidos,
             'parentesco', m.parentesco, 'dni', m.dni, 'foto_path', m.foto_path, 'puede_ingresar', m.puede_ingresar,
             'estado_socio', s.estado, 'estado_cuenta', coalesce(e.estado_cuenta, 'al_dia'), 'saldo', coalesce(e.saldo, 0), 'es_ejemplo', m.es_ejemplo) as j,
           case when s.numero = lpad(v_q, 4, '0') or m.dni = v_q then 0 when m.parentesco = 'titular' then 1 else 2 end as rango,
           m.apellidos as ap
      from public.miembros m
      join public.socios s on s.id = m.socio_id
      left join public.estado_socios e on e.socio_id = s.id
     where m.club_id = app.club_id() and m.eliminado_en is null and s.eliminado_en is null
       and (not p_solo_titulares or m.parentesco = 'titular')
       and (s.numero = lpad(v_q, 4, '0') or s.numero = v_q or m.dni = v_q
            or app.sin_tildes(m.nombres || ' ' || m.apellidos) like '%' || v_norm || '%'
            or app.sin_tildes(m.apellidos || ' ' || m.nombres) like '%' || v_norm || '%')
     order by rango, m.apellidos
     limit greatest(1, least(p_limite, 60))
  ) x;
  return v_res;
end;
$$;
revoke execute on function public.buscar_miembros(text, int, boolean) from public, anon;
grant execute on function public.buscar_miembros(text, int, boolean) to authenticated;

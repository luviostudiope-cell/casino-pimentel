-- =====================================================================
-- 012 · Funciones del panel: recordatorio de deuda y cierre de caja de oficina
-- =====================================================================

-- Recordatorio amable por notificación a socios con deuda
create or replace function public.recordar_deuda(p_socio_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int := 0; r record;
begin
  if not app.es_directiva() then raise exception 'Solo la directiva envía recordatorios.'; end if;
  for r in select e.socio_id, e.saldo, e.cuotas_vencidas from public.estado_socios e
            where e.club_id = app.club_id() and e.socio_id = any (p_socio_ids) and e.saldo > 0 loop
    perform app.notificar_socio(r.socio_id, 'cuota', 'Recordatorio de pago',
      'Tienes ' || app.soles(r.saldo) || ' pendiente' || case when r.cuotas_vencidas > 0 then ' (' || r.cuotas_vencidas || ' cuota(s) vencida(s))' else '' end ||
      '. Puedes pagar con Yape desde "Mi cuenta" o en la oficina.', '/app/socio/cuenta', true);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'enviados', v_n, 'mensaje', 'Recordatorio enviado a ' || v_n || ' socio(s).');
end;
$$;

-- Cierre de la caja de oficina (Julita la cierra cada dos días)
create or replace function public.cerrar_caja(p_hasta date, p_contado numeric, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := app.club_id(); v_desde date; v_ini numeric; v_ing numeric; v_egr numeric; v_fin numeric; v_id uuid;
begin
  if not app.es_directiva() then raise exception 'Solo administración cierra la caja.'; end if;
  if p_contado is null or p_contado < 0 then raise exception 'Escribe el efectivo contado.'; end if;
  select coalesce(max(hasta) + 1, (select min(fecha) from public.caja_movimientos where club_id = v_club)) into v_desde from public.caja_cierres where club_id = v_club;
  v_desde := coalesce(v_desde, p_hasta);
  if p_hasta < v_desde then return jsonb_build_object('ok', false, 'mensaje', 'Ese período ya está cerrado. El último cierre llega hasta el ' || to_char(v_desde - 1, 'DD/MM') || '.'); end if;
  select coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0) into v_ini from public.caja_movimientos where club_id = v_club and fecha < v_desde and eliminado_en is null;
  select coalesce(sum(monto) filter (where tipo = 'ingreso'), 0), coalesce(sum(monto) filter (where tipo = 'egreso'), 0) into v_ing, v_egr
    from public.caja_movimientos where club_id = v_club and fecha between v_desde and p_hasta and eliminado_en is null;
  v_fin := v_ini + v_ing - v_egr;
  insert into public.caja_cierres (club_id, desde, hasta, saldo_inicial, ingresos, egresos, saldo_final, contado, diferencia, nota)
  values (v_club, v_desde, p_hasta, v_ini, v_ing, v_egr, v_fin, round(p_contado, 2), round(p_contado - v_fin, 2), p_nota) returning id into v_id;
  update public.caja_movimientos set cierre_id = v_id where club_id = v_club and fecha between v_desde and p_hasta and cierre_id is null;
  return jsonb_build_object('ok', true, 'cierre_id', v_id, 'desde', v_desde, 'hasta', p_hasta, 'saldo_final', v_fin, 'diferencia', round(p_contado - v_fin, 2),
    'mensaje', case when round(p_contado - v_fin, 2) = 0 then 'Caja cerrada: cuadra.' when p_contado < v_fin then 'Caja cerrada con faltante de ' || app.soles(v_fin - p_contado) || '.' else 'Caja cerrada con sobrante de ' || app.soles(p_contado - v_fin) || '.' end);
end;
$$;

revoke execute on function public.recordar_deuda(uuid[]), public.cerrar_caja(date, numeric, text) from public, anon;
grant execute on function public.recordar_deuda(uuid[]), public.cerrar_caja(date, numeric, text) to authenticated;

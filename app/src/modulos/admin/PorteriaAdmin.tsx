import { useMemo, useState } from 'react'
import { DoorOpen, FileDown, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { exportarExcel } from '../../lib/excel'
import { hora, hoyLima, moneda, monedaCorta } from '../../lib/formato'
import { BarrasVerticales, Campo, EjemploTag, Encabezado, EsqueletoLista, Indicador, PillEstado, Tarjeta, Vacio } from '../../ui'

interface Ingreso { id: string; hora: string; persona: string; tipo_ingreso: string; monto: number; medio_pago: string | null; ticket: number | null; estado: 'dentro' | 'salio'; con_deuda: boolean; metodo: string; es_ejemplo: boolean; miembros: { nombres: string; apellidos: string } | null; invitados: { nombres: string; dni: string } | null; socios: { numero: string; apellidos: string } | null }

export default function PorteriaAdmin() {
  const [fecha, setFecha] = useState(hoyLima())
  const { datos, cargando, recargar } = useDatos(async () => {
    const mes = fecha.slice(0, 8) + '01'
    const [i, v] = await Promise.all([
      supabase.from('ingresos').select('id, hora, persona, tipo_ingreso, monto, medio_pago, ticket, estado, con_deuda, metodo, es_ejemplo, miembros(nombres, apellidos), invitados(nombres, dni), socios(numero, apellidos)').eq('fecha', fecha).in('estado', ['dentro', 'salio']).order('hora', { ascending: false }),
      supabase.from('ingresos').select('invitado_id, invitados(nombres, dni)').eq('persona', 'invitado').gte('fecha', mes).lte('fecha', fecha).in('estado', ['dentro', 'salio', 'preregistrado']),
    ])
    const conteo = new Map<string, { nombres: string; dni: string; visitas: number }>()
    for (const x of ok(v) as unknown as { invitado_id: string; invitados: { nombres: string; dni: string } }[]) {
      const c = conteo.get(x.invitado_id) ?? { ...x.invitados, visitas: 0 }; c.visitas++; conteo.set(x.invitado_id, c)
    }
    return { ingresos: ok(i) as unknown as Ingreso[], invitadosMes: [...conteo.values()].sort((a, b) => b.visitas - a.visitas) }
  }, [fecha])
  useEnVivo(['ingresos'], () => recargar(true), fecha === hoyLima())

  const porHora = useMemo(() => {
    const h = Array.from({ length: 16 }, (_, k) => ({ x: `${String(k + 7).padStart(2, '0')}h`, y: 0 }))
    for (const i of datos?.ingresos ?? []) { const n = Number(hora(i.hora).slice(0, 2)) - 7; if (h[n]) h[n].y++ }
    return h
  }, [datos])
  const cobrado = (datos?.ingresos ?? []).reduce((s, i) => s + Number(i.monto), 0)
  const invitados = (datos?.ingresos ?? []).filter((i) => i.persona === 'invitado')
  const porMedio = invitados.reduce<Record<string, number>>((a, i) => { if (i.monto > 0) a[i.medio_pago ?? 'otro'] = (a[i.medio_pago ?? 'otro'] ?? 0) + Number(i.monto); return a }, {})

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Portería" explicacion="Quién entró cada día y a qué hora, los invitados y su contador del mes, y lo cobrado en la puerta."
        acciones={<button type="button" className="btn btn-ghost" onClick={() => exportarExcel(`porteria-${fecha}`, { Ingresos: (datos?.ingresos ?? []).map((i) => ({ Hora: hora(i.hora), Ticket: i.ticket, Persona: i.persona === 'invitado' ? i.invitados?.nombres : `${i.miembros?.nombres} ${i.miembros?.apellidos}`, Tipo: i.persona, 'N° socio': i.socios?.numero, Ingreso: i.tipo_ingreso, 'Cobro (S/)': Number(i.monto), Medio: i.medio_pago ?? '', Método: i.metodo })) })}><FileDown aria-hidden /><span>Exportar</span></button>} />
      <Campo etiqueta="Día" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: 190 }} />
      {cargando && !datos ? <EsqueletoLista filas={6} /> : (
        <>
          <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
            <Indicador etiqueta="Ingresos del día" valor={datos!.ingresos.length} icono={<DoorOpen aria-hidden />} destacado nota={`${datos!.ingresos.filter((i) => i.metodo === 'qr').length} con QR`} />
            <Indicador etiqueta="Invitados" valor={invitados.length} icono={<UserPlus aria-hidden />} />
            <Indicador etiqueta="Cobrado en la puerta" valor={cobrado} formato={moneda} nota={Object.entries(porMedio).map(([k, v]) => `${k === 'cuenta_socio' ? 'a cuenta' : k} ${monedaCorta(v)}`).join(' · ') || undefined} />
          </div>
          <Tarjeta titulo="Ingresos por hora">
            <BarrasVerticales datos={porHora} formato={(n) => `${n} personas`} etiqueta="Ingresos por hora del día" alto={180} />
          </Tarjeta>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
            <Tarjeta titulo="Registro del día">
              {!datos!.ingresos.length ? <Vacio icono={<DoorOpen />} titulo="Sin ingresos este día" texto="Elige otra fecha." /> : (
                <div className="tabla-wrap" style={{ maxHeight: 520 }}>
                  <table className="tabla">
                    <thead><tr><th>Hora</th><th>Persona</th><th>Socio</th><th className="num">Cobro</th></tr></thead>
                    <tbody>{datos!.ingresos.map((i) => (
                      <tr key={i.id}><td className="num">{hora(i.hora)}</td>
                        <td><b className="break">{i.persona === 'invitado' ? i.invitados?.nombres : `${i.miembros?.nombres} ${i.miembros?.apellidos}`}</b><div className="xs muted">{i.persona === 'invitado' ? `Invitado · ${i.tipo_ingreso}` : i.metodo === 'qr' ? 'Carnet QR' : 'Búsqueda'}{i.ticket ? ` · ticket ${i.ticket}` : ''}</div>{i.es_ejemplo && <EjemploTag texto="Ejemplo" />}</td>
                        <td className="small">N° {i.socios?.numero}{i.con_deuda && <div><PillEstado estado="deuda" /></div>}</td>
                        <td className="num">{i.monto > 0 ? monedaCorta(i.monto) : '—'}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Tarjeta>
            <Tarjeta titulo="Invitados del mes (visitas)">
              {!datos!.invitadosMes.length ? <p className="muted">Sin invitados este mes.</p> : (
                <div className="list" style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {datos!.invitadosMes.slice(0, 60).map((v) => (
                    <div key={v.dni} className="list-item" style={{ minHeight: 56 }}>
                      <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{v.nombres}</span><span className="li-sub num" style={{ display: 'block' }}>DNI {v.dni}</span></span>
                      <PillEstado estado={v.visitas >= 3 ? 'deuda' : v.visitas === 2 ? 'por_vencer' : 'al_dia'} texto={`${v.visitas} de 3`} />
                    </div>
                  ))}
                </div>
              )}
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { CalendarPlus, Phone } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { fechaCorta, fechaHora, hoyLima, moneda } from '../../lib/formato'
import { Aviso, Boton, Campo, Chips, EjemploTag, Encabezado, EsqueletoLista, Hoja, Interruptor, Selector, Tarjeta, useToast } from '../../ui'

interface Ambiente { id: string; nombre: string; es_adicional: boolean; solo_temporada_baja: boolean; tarifas_ambiente: { tipo_cliente: string; precio: number | null; garantia: number | null }[] }
interface Alquiler { id: string; fecha: string; dia_decoracion: string | null; cliente_nombre: string; cliente_celular: string | null; tipo_cliente: string; total: number; garantia: number; estado: string; nota: string | null; es_ejemplo: boolean; ambiente_id: string; ambientes: { nombre: string } }
interface Solicitud { id: string; nombre: string; celular: string; fecha: string; tipo_cliente: string; mensaje: string | null; origen: string; creado_en: string; ambiente_id: string | null; es_ejemplo: boolean; ambientes: { nombre: string } | null }
const TIPO: Record<string, string> = { socio: 'Socio', no_socio: 'No socio', institucion: 'Institución o empresa' }

export default function Ambientes() {
  const avisar = useToast()
  const { datos, recargar } = useDatos(async () => {
    const [a, al, s, cfg] = await Promise.all([
      supabase.from('ambientes').select('id, nombre, es_adicional, solo_temporada_baja, tarifas_ambiente(tipo_cliente, precio, garantia)').eq('activo', true).order('orden'),
      supabase.from('alquileres').select('id, fecha, dia_decoracion, cliente_nombre, cliente_celular, tipo_cliente, total, garantia, estado, nota, es_ejemplo, ambiente_id, ambientes(nombre)').is('eliminado_en', null).gte('fecha', hoyLima(-30)).order('fecha'),
      supabase.from('solicitudes_alquiler').select('id, nombre, celular, fecha, tipo_cliente, mensaje, origen, creado_en, ambiente_id, es_ejemplo, ambientes(nombre)').eq('estado', 'nueva').order('creado_en', { ascending: false }),
      supabase.from('config').select('reglas').single(),
    ])
    return { ambientes: ok(a) as Ambiente[], alquileres: ok(al) as unknown as Alquiler[], solicitudes: ok(s) as unknown as Solicitud[], igv: Number((ok(cfg) as { reglas: { alquiler: { igv: number } } }).reglas.alquiler.igv) }
  }, [])
  useEnVivo(['solicitudes_alquiler', 'alquileres'], () => recargar(true))
  const [form, setForm] = useState<{ ambiente_id: string; fecha: string; tipo_cliente: string; cliente_nombre: string; cliente_celular: string; con_decoracion: boolean; tarifa_manual: string; estado: string; solicitud_id?: string; nota: string } | null>(null)
  const [mes, setMes] = useState(hoyLima().slice(0, 7))
  const [verAmb, setVerAmb] = useState('todos')

  const amb = datos?.ambientes.find((a) => a.id === form?.ambiente_id)
  const tar = amb?.tarifas_ambiente.find((t) => t.tipo_cliente === form?.tipo_cliente)
  const base = form?.tarifa_manual ? Number(form.tarifa_manual) : tar?.precio ?? null
  const guardar = async () => {
    if (!form) return
    try {
      const r = await rpc<{ ok: boolean; mensaje: string }>('registrar_alquiler', { p: { ...form, tarifa_manual: form.tarifa_manual || null } })
      avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); if (r.ok) { setForm(null); recargar(true) }
    } catch (e) { avisar((e as Error).message, 'error') }
  }
  const descartar = async (s: Solicitud) => { await supabase.from('solicitudes_alquiler').update({ estado: 'contactada' }).eq('id', s.id); avisar('Marcada como contactada.'); recargar(true) }

  const diasMes = useMemo(() => {
    const [y, m] = mes.split('-').map(Number)
    const n = new Date(y, m, 0).getDate()
    const pad = (new Date(y, m - 1, 1).getDay() + 6) % 7
    return { n, pad, y, m }
  }, [mes])
  const ocupado = (f: string) => (datos?.alquileres ?? []).filter((a) => a.estado !== 'cancelado' && (verAmb === 'todos' || a.ambiente_id === verAmb) && (a.fecha === f || a.dia_decoracion === f))

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Ambientes" explicacion="Salón, rincón parrillero, jardín, piscina y deck: calendario, solicitudes de la web y alquileres con tarifa automática según el tipo de cliente."
        acciones={<Boton icono={<CalendarPlus aria-hidden />} onClick={() => setForm({ ambiente_id: datos?.ambientes[0]?.id ?? '', fecha: hoyLima(7), tipo_cliente: 'socio', cliente_nombre: '', cliente_celular: '', con_decoracion: true, tarifa_manual: '', estado: 'confirmado', nota: '' })}>Registrar alquiler</Boton>} />
      {!datos ? <EsqueletoLista filas={6} /> : (
        <>
          {datos.solicitudes.length > 0 && (
            <Tarjeta titulo={`Solicitudes nuevas (${datos.solicitudes.length})`}>
              <div className="list">
                {datos.solicitudes.map((s) => (
                  <div key={s.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <span className="li-main" style={{ minWidth: 220 }}>
                      <span className="li-title" style={{ display: 'block' }}>{s.nombre} · {s.ambientes?.nombre ?? 'Ambiente por definir'}</span>
                      <span className="li-sub" style={{ display: 'block' }}>Para el {fechaCorta(s.fecha)} · {TIPO[s.tipo_cliente]} · desde la {s.origen} · {fechaHora(s.creado_en)}</span>
                      {s.mensaje && <span className="small" style={{ display: 'block', marginTop: 4 }}>"{s.mensaje}"</span>}
                      {s.es_ejemplo && <EjemploTag />}
                    </span>
                    <span className="row wrap">
                      <a className="btn btn-ghost btn-sm" href={`tel:${s.celular}`}><Phone aria-hidden /><span className="num">{s.celular}</span></a>
                      <Boton tam="sm" variante="secondary" onClick={() => descartar(s)}>Ya lo llamé</Boton>
                      <Boton tam="sm" onClick={() => setForm({ ambiente_id: s.ambiente_id ?? datos.ambientes[0].id, fecha: s.fecha, tipo_cliente: s.tipo_cliente, cliente_nombre: s.nombre, cliente_celular: s.celular, con_decoracion: true, tarifa_manual: '', estado: 'por_confirmar', solicitud_id: s.id, nota: s.mensaje ?? '' })}>Convertir en alquiler</Boton>
                    </span>
                  </div>
                ))}
              </div>
            </Tarjeta>
          )}
          <Tarjeta titulo="Calendario" accion={<Campo etiqueta="Mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: 170 }} />}>
            <Chips etiqueta="Ambiente" scroll valor={verAmb} onCambio={setVerAmb} opciones={[{ valor: 'todos', etiqueta: 'Todos' }, ...datos.ambientes.filter((a) => !a.es_adicional).map((a) => ({ valor: a.id, etiqueta: a.nombre }))]} />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', ['--gap' as string]: '6px', marginTop: 14 }} role="grid" aria-label="Calendario de alquileres">
              {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => <div key={d} className="small muted bold" style={{ textAlign: 'center' }}>{d}</div>)}
              {Array.from({ length: diasMes.pad }).map((_, i) => <div key={`p${i}`} />)}
              {Array.from({ length: diasMes.n }, (_, i) => {
                const f = `${mes}-${String(i + 1).padStart(2, '0')}`
                const oc = ocupado(f)
                return (
                  <div key={f} role="gridcell" style={{ minHeight: 64, borderRadius: 14, padding: 6, background: oc.length ? 'var(--arena-suave)' : 'var(--surface-2)', border: f === hoyLima() ? '2px solid var(--azul)' : '1px solid transparent', overflow: 'hidden' }}>
                    <div className="small bold num">{i + 1}</div>
                    {oc.slice(0, 2).map((a) => <div key={a.id} className="xs ellipsis" style={{ color: a.dia_decoracion === f && a.fecha !== f ? 'var(--tinta-2)' : 'var(--arena-tinta)', fontWeight: 600 }}>{a.dia_decoracion === f && a.fecha !== f ? 'Decoración' : a.ambientes.nombre}</div>)}
                    {oc.length > 2 && <div className="xs muted">+{oc.length - 2}</div>}
                  </div>
                )
              })}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Alquileres">
            <div className="tabla-wrap">
              <table className="tabla">
                <thead><tr><th>Fecha</th><th>Ambiente</th><th>Cliente</th><th className="num">Total (con IGV)</th><th className="num">Garantía</th><th>Estado</th></tr></thead>
                <tbody>{datos.alquileres.map((a) => (
                  <tr key={a.id}><td className="num">{fechaCorta(a.fecha)}{a.dia_decoracion && <div className="xs muted">decora {fechaCorta(a.dia_decoracion)}</div>}</td><td>{a.ambientes.nombre}</td>
                    <td><b className="break">{a.cliente_nombre}</b><div className="xs muted">{TIPO[a.tipo_cliente]}{a.cliente_celular ? ` · ${a.cliente_celular}` : ''}</div>{a.es_ejemplo && <EjemploTag texto="Ejemplo" />}</td>
                    <td className="num bold">{moneda(a.total)}</td><td className="num">{moneda(a.garantia)}</td>
                    <td><select className="select" style={{ minHeight: 44, width: 160 }} aria-label={`Estado del alquiler de ${a.cliente_nombre}`} value={a.estado} onChange={async (e) => { await supabase.from('alquileres').update({ estado: e.target.value }).eq('id', a.id); avisar('Estado actualizado.'); recargar(true) }}>
                      {['por_confirmar', 'confirmado', 'pagado', 'realizado', 'cancelado'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
                    </select></td></tr>
                ))}</tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      )}
      <Hoja abierta={Boolean(form)} onCerrar={() => setForm(null)} titulo="Registrar alquiler" subtitulo="Tarifas sin IGV; el sistema suma el IGV y la garantía."
        pie={<><Boton variante="outline" onClick={() => setForm(null)}>Cancelar</Boton><Boton onClick={guardar}>Registrar</Boton></>}>
        {form && datos && (
          <div className="stack">
            <Selector etiqueta="Ambiente" value={form.ambiente_id} onChange={(e) => setForm({ ...form, ambiente_id: e.target.value })}>{datos.ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</Selector>
            <Campo etiqueta="Fecha del evento" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            <Chips etiqueta="Tipo de cliente" valor={form.tipo_cliente} onCambio={(v) => setForm({ ...form, tipo_cliente: v })} opciones={Object.entries(TIPO).map(([k, v]) => ({ valor: k, etiqueta: v }))} />
            <Campo etiqueta="Cliente" value={form.cliente_nombre} onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })} />
            <Campo etiqueta="Celular" inputMode="tel" value={form.cliente_celular} onChange={(e) => setForm({ ...form, cliente_celular: e.target.value })} />
            <Interruptor etiqueta="Día anterior para decorar" descripcion="Se bloquea el ambiente el día antes." activo={form.con_decoracion} onCambio={(v) => setForm({ ...form, con_decoracion: v })} />
            <Campo etiqueta="Tarifa (S/, sin IGV)" inputMode="decimal" placeholder={tar?.precio != null ? String(tar.precio) : 'Por confirmar: escríbela'} value={form.tarifa_manual} onChange={(e) => setForm({ ...form, tarifa_manual: e.target.value.replace(/[^\d.]/g, '') })} ayuda={tar?.precio != null ? 'Vacío = tarifa del club para este tipo de cliente.' : undefined} />
            {base != null ? (
              <dl className="card-2" style={{ margin: 0 }}>
                <div className="kv"><dt>Tarifa</dt><dd>{moneda(base)}</dd></div>
                <div className="kv"><dt>IGV ({Math.round(datos.igv * 100)} %)</dt><dd>{moneda(base * datos.igv)}</dd></div>
                <div className="kv"><dt className="bold">Total</dt><dd>{moneda(base * (1 + datos.igv))}</dd></div>
                <div className="kv"><dt>Garantía</dt><dd>{moneda(tar?.garantia ?? 0)}</dd></div>
              </dl>
            ) : <Aviso tono="alerta">Tarifa por confirmar para este tipo de cliente: escríbela a mano.</Aviso>}
            {amb?.solo_temporada_baja && <Aviso>{amb.nombre} se alquila solo en temporada baja (abril a noviembre).</Aviso>}
            <Selector etiqueta="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="por_confirmar">Por confirmar</option><option value="confirmado">Confirmado</option><option value="pagado">Pagado</option>
            </Selector>
          </div>
        )}
      </Hoja>
    </div>
  )
}

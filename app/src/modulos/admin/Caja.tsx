import { useState } from 'react'
import { FileDown, Lock, Plus, Receipt } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { exportarExcel } from '../../lib/excel'
import { fechaCorta, hoyLima, moneda } from '../../lib/formato'
import { Aviso, Boton, Campo, Chips, EjemploTag, Encabezado, EsqueletoLista, Hoja, Indicador, PillEstado, Selector, Tarjeta, Vacio, useToast } from '../../ui'

const CATEGORIAS = ['Cuotas de socios', 'Alquileres', 'Mantenimiento', 'Servicios', 'Eventos', 'Limpieza', 'Compras varias', 'Saldo inicial', 'Otros']
interface Mov { id: string; fecha: string; comprobante: string | null; descripcion: string; categoria: string; tipo: 'ingreso' | 'egreso'; monto: number; saldo: number; cierre_id: string | null; es_ejemplo: boolean }

export default function Caja() {
  const { perfil } = useSesion()
  const avisar = useToast()
  const [desde, setDesde] = useState(hoyLima(-30))
  const [hasta, setHasta] = useState(hoyLima())
  const [nuevo, setNuevo] = useState(false)
  const [cerrar, setCerrar] = useState(false)
  const { datos, cargando, recargar } = useDatos(async () => {
    const [m, c, s] = await Promise.all([
      supabase.from('caja_con_saldo').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }).order('creado_en', { ascending: false }),
      supabase.from('caja_cierres').select('id, desde, hasta, saldo_final, contado, diferencia, nota, es_ejemplo').order('hasta', { ascending: false }).limit(10),
      supabase.from('caja_con_saldo').select('saldo').order('fecha', { ascending: false }).order('creado_en', { ascending: false }).limit(1).maybeSingle(),
    ])
    return { movs: ok(m) as Mov[], cierres: ok(c) as { id: string; desde: string; hasta: string; saldo_final: number; contado: number; diferencia: number; nota: string | null; es_ejemplo: boolean }[], saldo: Number((ok(s) as { saldo: number } | null)?.saldo ?? 0) }
  }, [desde, hasta])
  useEnVivo(['caja_movimientos'], () => recargar(true))
  const ingresos = (datos?.movs ?? []).filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
  const egresos = (datos?.movs ?? []).filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
  const sinCerrar = (datos?.movs ?? []).filter((m) => !m.cierre_id).length

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Caja de oficina" explicacion="La caja chica de administración: cada ingreso y egreso con su comprobante, el saldo al momento y el cierre cada dos días."
        acciones={<>
          <Boton variante="ghost" icono={<FileDown aria-hidden />} onClick={() => exportarExcel(`caja-${desde}-al-${hasta}`, { Caja: [...(datos?.movs ?? [])].reverse().map((m) => ({ Fecha: m.fecha, Comprobante: m.comprobante ?? '', Descripción: m.descripcion, Categoría: m.categoria, Ingreso: m.tipo === 'ingreso' ? Number(m.monto) : '', Egreso: m.tipo === 'egreso' ? Number(m.monto) : '', Saldo: Number(m.saldo) })) })}>Exportar a Excel</Boton>
          <Boton variante="secondary" icono={<Lock aria-hidden />} onClick={() => setCerrar(true)}>Cerrar caja</Boton>
          <Boton icono={<Plus aria-hidden />} onClick={() => setNuevo(true)}>Nuevo movimiento</Boton>
        </>} />
      <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
        <Indicador etiqueta="Saldo en caja" valor={datos?.saldo ?? 0} formato={moneda} icono={<Receipt aria-hidden />} destacado nota={sinCerrar ? `${sinCerrar} movimientos sin cerrar` : 'Todo cerrado'} />
        <Indicador etiqueta="Ingresos del período" valor={ingresos} formato={moneda} />
        <Indicador etiqueta="Egresos del período" valor={egresos} formato={moneda} />
      </div>
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <Campo etiqueta="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ width: 170 }} />
        <Campo etiqueta="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ width: 170 }} />
      </div>
      {cargando && !datos ? <EsqueletoLista filas={8} /> : !datos?.movs.length ? <Vacio icono={<Receipt />} titulo="Sin movimientos en estas fechas" texto="Registra cada ingreso o gasto con su boleta o recibo." /> : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla" style={{ minWidth: 820 }}>
            <thead><tr><th>Fecha</th><th>Comprobante</th><th>Descripción</th><th>Categoría</th><th className="num">Ingreso</th><th className="num">Egreso</th><th className="num">Saldo</th></tr></thead>
            <tbody>{datos.movs.map((m) => (
              <tr key={m.id}>
                <td className="num">{fechaCorta(m.fecha)}</td><td className="num small">{m.comprobante ?? '—'}</td>
                <td className="break">{m.descripcion}{m.cierre_id && <span className="xs muted"> · cerrado</span>}{m.es_ejemplo && <div><EjemploTag texto="Ejemplo" /></div>}</td>
                <td className="small">{m.categoria}</td>
                <td className="num" style={{ color: 'var(--ok-tinta)' }}>{m.tipo === 'ingreso' ? moneda(m.monto) : ''}</td>
                <td className="num">{m.tipo === 'egreso' ? moneda(m.monto) : ''}</td>
                <td className="num bold">{moneda(m.saldo)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Tarjeta titulo="Últimos cierres">
        {!datos?.cierres.length ? <p className="muted">Aún no hay cierres.</p> : <div className="list">{datos.cierres.map((c) => (
          <div key={c.id} className="list-item"><span className="li-main"><span className="li-title" style={{ display: 'block' }}>Del {fechaCorta(c.desde)} al {fechaCorta(c.hasta)}</span><span className="li-sub" style={{ display: 'block' }}>Saldo {moneda(c.saldo_final)} · contado {moneda(c.contado)}{c.nota ? ` · ${c.nota}` : ''}</span></span>
            {Number(c.diferencia) === 0 ? <PillEstado estado="cuadrado" /> : <PillEstado estado={c.diferencia < 0 ? 'faltante' : 'sobrante'} texto={moneda(c.diferencia)} />}</div>
        ))}</div>}
      </Tarjeta>
      <NuevoMovimiento abierta={nuevo} onCerrar={() => setNuevo(false)} clubId={perfil!.club_id} onListo={() => { setNuevo(false); recargar(true) }} />
      <CerrarCaja abierta={cerrar} onCerrar={() => setCerrar(false)} saldo={datos?.saldo ?? 0} onListo={(m) => { setCerrar(false); avisar(m); recargar(true) }} />
    </div>
  )
}

function NuevoMovimiento({ abierta, onCerrar, clubId, onListo }: { abierta: boolean; onCerrar: () => void; clubId: string; onListo: () => void }) {
  const avisar = useToast()
  const [f, setF] = useState({ tipo: 'egreso' as 'ingreso' | 'egreso', fecha: hoyLima(), comprobante: '', descripcion: '', categoria: 'Mantenimiento', monto: '' })
  const guardar = async () => {
    if (f.descripcion.trim().length < 3 || !Number(f.monto)) { avisar('Escribe la descripción y el monto.', 'alerta'); return }
    try { ok(await supabase.from('caja_movimientos').insert({ club_id: clubId, ...f, monto: Number(f.monto), comprobante: f.comprobante || null })); avisar('Movimiento registrado.'); setF({ ...f, comprobante: '', descripcion: '', monto: '' }); onListo() }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Nuevo movimiento de caja" pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar}>Guardar</Boton></>}>
      <div className="stack">
        <Chips etiqueta="Tipo" valor={f.tipo} onCambio={(v) => setF({ ...f, tipo: v })} opciones={[{ valor: 'egreso', etiqueta: 'Egreso (gasto)' }, { valor: 'ingreso', etiqueta: 'Ingreso' }]} />
        <div className="row"><Campo etiqueta="Fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className="grow" /><Campo etiqueta="N° de boleta o recibo" value={f.comprobante} onChange={(e) => setF({ ...f, comprobante: e.target.value })} className="grow" /></div>
        <Campo etiqueta="Descripción" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Ej.: bidones de agua (6)" />
        <Selector etiqueta="Categoría" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</Selector>
        <Campo etiqueta="Monto (S/)" inputMode="decimal" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value.replace(/[^\d.]/g, '') })} />
      </div>
    </Hoja>
  )
}

function CerrarCaja({ abierta, onCerrar, saldo, onListo }: { abierta: boolean; onCerrar: () => void; saldo: number; onListo: (m: string) => void }) {
  const [hasta, setHasta] = useState(hoyLima())
  const [contado, setContado] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const guardar = async () => {
    try { const r = await rpc<{ ok: boolean; mensaje: string }>('cerrar_caja', { p_hasta: hasta, p_contado: Number(contado), p_nota: nota || null }); if (!r.ok) { setError(r.mensaje); return } onListo(r.mensaje); setContado(''); setNota('') }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Cerrar caja" subtitulo="Cuenta el efectivo y compáralo con el saldo del sistema."
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} disabled={contado === ''}>Cerrar caja</Boton></>}>
      <div className="stack">
        <p>Saldo según el sistema: <b className="num">{moneda(saldo)}</b></p>
        <Campo etiqueta="Cerrar hasta el día" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        <Campo etiqueta="Efectivo contado (S/)" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value.replace(/[^\d.]/g, ''))} />
        {contado !== '' && <Aviso tono={Number(contado) === saldo ? 'ok' : 'alerta'}>{Number(contado) === saldo ? 'Cuadra con el sistema.' : `Diferencia: ${moneda(Number(contado) - saldo)}`}</Aviso>}
        <Campo etiqueta="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        {error && <Aviso tono="peligro">{error}</Aviso>}
      </div>
    </Hoja>
  )
}

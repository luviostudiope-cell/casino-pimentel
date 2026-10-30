import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CreditCard, FileDown, Wallet } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { exportarExcel } from '../../lib/excel'
import { fechaHora, hoyLima, moneda, numero } from '../../lib/formato'
import { BarraEstados, Boton, Chips, EjemploTag, Encabezado, EsqueletoLista, Indicador, PillEstado, Tarjeta, Vacio, useConfirmar, useToast } from '../../ui'

interface Fila { socio_id: string; numero: string; apellidos: string; nombres: string; saldo: number; cuotas_vencidas: number; estado_cuenta: 'al_dia' | 'por_vencer' | 'deuda'; estado_socio: string; es_ejemplo: boolean }
type Rango = 'todos' | '1' | '2' | '3'

export default function Cobranza() {
  const navegar = useNavigate()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [rango, setRango] = useState<Rango>('todos')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const { datos, cargando, recargar } = useDatos(async () => {
    const [e, p] = await Promise.all([
      supabase.from('estado_socios').select('socio_id, numero, apellidos, nombres, saldo, cuotas_vencidas, estado_cuenta, estado_socio, es_ejemplo').eq('estado_socio', 'activo'),
      supabase.from('pagos').select('id, socio_id, creado_en, medio, monto, operacion, socios(numero, apellidos, nombres)').eq('estado', 'por_validar').is('eliminado_en', null).order('creado_en'),
    ])
    return { socios: ok(e) as Fila[], porValidar: ok(p) as unknown as { id: string; socio_id: string; creado_en: string; medio: string; monto: number; operacion: string | null; socios: { numero: string; apellidos: string; nombres: string } }[] }
  }, [])
  useEnVivo(['pagos'], () => recargar(true))

  const morosos = useMemo(() => (datos?.socios ?? []).filter((s) => s.estado_cuenta === 'deuda').sort((a, b) => b.saldo - a.saldo), [datos])
  const filas = morosos.filter((s) => rango === 'todos' || (rango === '3' ? s.cuotas_vencidas >= 3 : s.cuotas_vencidas === Number(rango)))
  const total = morosos.reduce((s, m) => s + Number(m.saldo), 0)
  const c = (f: (s: Fila) => boolean) => morosos.filter(f).length

  const recordar = async () => {
    const ids = sel.size ? [...sel] : filas.map((f) => f.socio_id)
    if (!(await confirmar({ titulo: `¿Enviar recordatorio a ${ids.length} socio(s)?`, texto: 'Les llega una notificación amable con su deuda y cómo pagar desde la app.', confirmar: 'Enviar recordatorio' }))) return
    try { const r = await rpc<{ mensaje: string }>('recordar_deuda', { p_socio_ids: ids }); avisar(r.mensaje); setSel(new Set()) }
    catch (e) { avisar((e as Error).message, 'error') }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Encabezado titulo="Cobranza" explicacion="Socios con cuotas vencidas, cuánto falta cobrar y los pagos que esperan validación."
        acciones={<><Boton variante="ghost" icono={<FileDown aria-hidden />} onClick={() => exportarExcel(`morosos-${hoyLima()}`, { Morosos: filas.map((f) => ({ 'N°': f.numero, Socio: `${f.apellidos}, ${f.nombres}`, 'Cuotas vencidas': f.cuotas_vencidas, 'Deuda (S/)': Number(f.saldo) })) })}>Exportar</Boton>
          <Boton icono={<BellRing aria-hidden />} onClick={recordar} disabled={!filas.length}>Enviar recordatorio{sel.size ? ` (${sel.size})` : ''}</Boton></>} />
      {cargando && !datos ? <EsqueletoLista filas={6} /> : (
        <>
          <div className="grid-auto" style={{ ['--min' as string]: '220px' }}>
            <Indicador etiqueta="Total por cobrar" valor={total} formato={moneda} icono={<Wallet aria-hidden />} destacado nota={`${morosos.length} socios con deuda`} />
            <Indicador etiqueta="Pagos por validar" valor={datos!.porValidar.length} formato={numero} icono={<CreditCard aria-hidden />} nota={moneda(datos!.porValidar.reduce((s, p) => s + Number(p.monto), 0))} />
          </div>
          <Tarjeta titulo="Estado de los socios activos">
            <BarraEstados partes={[
              { etiqueta: 'al día', valor: (datos!.socios).filter((s) => s.estado_cuenta === 'al_dia').length, color: 'var(--ok)' },
              { etiqueta: 'por vencer', valor: (datos!.socios).filter((s) => s.estado_cuenta === 'por_vencer').length, color: 'var(--alerta)' },
              { etiqueta: 'con deuda', valor: morosos.length, color: 'var(--peligro)' },
            ]} />
          </Tarjeta>
          {datos!.porValidar.length > 0 && (
            <Tarjeta titulo="Constancias por validar">
              <div className="list">
                {datos!.porValidar.map((p) => (
                  <button key={p.id} type="button" className="list-item" onClick={() => navegar(`/admin/socios/${p.socio_id}`)}>
                    <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{p.socios.apellidos}, {p.socios.nombres} · N° {p.socios.numero}</span><span className="li-sub" style={{ display: 'block' }}>{moneda(p.monto)} por {p.medio} · {fechaHora(p.creado_en)}</span></span>
                    <PillEstado estado="por_validar" />
                  </button>
                ))}
              </div>
            </Tarjeta>
          )}
          <Chips etiqueta="Meses de deuda" valor={rango} onCambio={setRango} opciones={[
            { valor: 'todos', etiqueta: 'Todos', cuenta: morosos.length }, { valor: '1', etiqueta: '1 mes', cuenta: c((s) => s.cuotas_vencidas === 1) },
            { valor: '2', etiqueta: '2 meses', cuenta: c((s) => s.cuotas_vencidas === 2) }, { valor: '3', etiqueta: '3 o más', cuenta: c((s) => s.cuotas_vencidas >= 3) }]} />
          {!filas.length ? <Vacio icono={<Wallet />} titulo="Nadie en este grupo" texto="Cuando un socio tenga cuotas vencidas, aparecerá aquí." /> : (
            <div className="card tabla-wrap" style={{ padding: 8 }}>
              <table className="tabla">
                <thead><tr><th><span className="sr-only">Elegir</span></th><th>N°</th><th>Socio</th><th className="num">Cuotas vencidas</th><th className="num">Deuda</th></tr></thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.socio_id}>
                      <td><input type="checkbox" aria-label={`Elegir a ${f.apellidos}`} style={{ width: 22, height: 22 }} checked={sel.has(f.socio_id)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(f.socio_id); else s.delete(f.socio_id); setSel(s) }} /></td>
                      <td className="num">{f.numero}</td>
                      <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, minHeight: 40 }} onClick={() => navegar(`/admin/socios/${f.socio_id}`)}>{f.apellidos}, {f.nombres}</button>{f.es_ejemplo && <EjemploTag texto="Ejemplo" />}</td>
                      <td className="num">{f.cuotas_vencidas}</td>
                      <td className="num bold" style={{ color: 'var(--peligro-tinta)' }}>{moneda(f.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

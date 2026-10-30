import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Camera, Check, KeyRound, Plus, Save, Wallet, X } from 'lucide-react'
import { funcion, rpc, supabase, urlFirmada } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { useSesion } from '../../lib/sesion'
import { fechaCorta, fechaHora, hora, mesCorto, moneda } from '../../lib/formato'
import {
  AreaTexto, Aviso, Avatar, Boton, Campo, CodigoQR, EjemploTag, EsqueletoLista, Hoja, ItemLista, PillEstado, Pestanas, Selector, Tarjeta, Vacio, useConfirmar, useToast, type Estado,
} from '../../ui'

const PARENTESCO: Record<string, string> = { titular: 'Titular', esposa: 'Esposa', esposo: 'Esposo', hijo: 'Hijo', hija: 'Hija', otro: 'Familiar' }
type Tab = 'resumen' | 'cuotas' | 'cuenta' | 'pagos' | 'actividad'

async function cargar(id: string) {
  const [s, m, e, c, cs, p, i, r, cred] = await Promise.all([
    supabase.from('socios').select('*').eq('id', id).single(),
    supabase.from('miembros').select('*').eq('socio_id', id).is('eliminado_en', null).order('fecha_nacimiento'),
    supabase.from('estado_socios').select('*').eq('socio_id', id).maybeSingle(),
    supabase.from('cuotas').select('id, periodo, monto, vencimiento, estado, tipo').eq('socio_id', id).is('eliminado_en', null).order('periodo'),
    supabase.from('cuenta_socio').select('id, fecha, tipo, origen, concepto, monto').eq('socio_id', id).is('eliminado_en', null).order('fecha'),
    supabase.from('pagos').select('id, creado_en, medio, monto, estado, operacion, constancia_path, origen, motivo_rechazo, nota').eq('socio_id', id).is('eliminado_en', null).order('creado_en', { ascending: false }),
    supabase.from('ingresos').select('id, fecha, hora, persona, tipo_ingreso, monto, estado, metodo, miembros(nombres), invitados(nombres)').eq('socio_id', id).neq('estado', 'anulado').order('hora', { ascending: false }).limit(40),
    supabase.from('reservas_cancha').select('id, fecha, hora_inicio, estado, canchas(nombre), miembros(nombres)').eq('socio_id', id).order('fecha', { ascending: false }).limit(20),
    supabase.from('credenciales_socio').select('ultimo_ingreso, debe_cambiar_pin, bloqueado_hasta').eq('socio_id', id).maybeSingle(),
  ])
  const socio = ok(s) as { id: string; numero: string; nombres: string; apellidos: string; dni: string | null; celular: string | null; correo: string | null; fecha_ingreso: string | null; estado: string; foto_path: string | null; notas: string | null; es_ejemplo: boolean; cuota_mensual: number | null }
  return {
    socio, foto: await urlFirmada('fotos-socios', socio.foto_path),
    miembros: ok(m) as { id: string; nombres: string; apellidos: string; dni: string | null; fecha_nacimiento: string | null; parentesco: string; es_ejemplo: boolean }[],
    estado: ok(e) as { saldo: number; cuotas_vencidas: number; estado_cuenta: Estado } | null,
    cuotas: ok(c) as { id: string; periodo: string; monto: number; vencimiento: string; estado: string; tipo: string }[],
    cuenta: ok(cs) as { id: string; fecha: string; tipo: 'cargo' | 'abono'; origen: string; concepto: string; monto: number }[],
    pagos: ok(p) as { id: string; creado_en: string; medio: string; monto: number; estado: 'por_validar' | 'validado' | 'rechazado'; operacion: string | null; constancia_path: string | null; origen: string; motivo_rechazo: string | null; nota: string | null }[],
    ingresos: ok(i) as unknown as { id: string; fecha: string; hora: string; persona: string; tipo_ingreso: string; monto: number; estado: string; metodo: string; miembros: { nombres: string } | null; invitados: { nombres: string } | null }[],
    reservas: ok(r) as unknown as { id: string; fecha: string; hora_inicio: string; estado: string; canchas: { nombre: string }; miembros: { nombres: string } | null }[],
    cred: ok(cred) as { ultimo_ingreso: string | null; debe_cambiar_pin: boolean; bloqueado_hasta: string | null } | null,
  }
}

export default function FichaSocio() {
  const { id } = useParams()
  const navegar = useNavigate()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const { perfil } = useSesion()
  const { datos: d, cargando, recargar } = useDatos(() => cargar(id!), [id])
  const [tab, setTab] = useState<Tab>('resumen')
  const [pago, setPago] = useState(false)
  const [familiar, setFamiliar] = useState(false)
  const [pin, setPin] = useState<string | null>(null)
  const [notas, setNotas] = useState<string | null>(null)
  const [constancia, setConstancia] = useState<{ url: string | null; pago: NonNullable<typeof d>['pagos'][number] } | null>(null)
  const [motivo, setMotivo] = useState('')
  const fotoInput = useRef<HTMLInputElement>(null)

  if (cargando && !d) return <EsqueletoLista filas={6} />
  if (!d) return <Vacio icono={<X />} titulo="No encontramos al socio" texto="Puede que el enlace esté mal escrito." accion={<Boton onClick={() => navegar('/admin/socios')}>Volver a socios</Boton>} />
  const { socio, estado } = d
  const porValidar = d.pagos.filter((p) => p.estado === 'por_validar')

  const reenviarPin = async () => {
    if (!(await confirmar({ titulo: 'Generar un PIN nuevo', texto: 'El PIN actual dejará de funcionar. Entrégale el nuevo al socio en persona o por teléfono.', confirmar: 'Generar PIN' }))) return
    try { const r = await funcion<{ pin: string }>('admin-socios', { accion: 'reenviar_pin', socio_id: socio.id }); setPin(r.pin); recargar(true) }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  const cambiarEstado = async () => {
    const activar = socio.estado !== 'activo'
    if (!(await confirmar({ titulo: activar ? '¿Reactivar al socio?' : '¿Desactivar al socio?', texto: activar ? 'Podrá volver a ingresar con su carnet.' : 'Su carnet y el de su familia dejarán de servir en portería. No se borra nada.', confirmar: activar ? 'Reactivar' : 'Desactivar', peligro: !activar }))) return
    try { ok(await supabase.from('socios').update({ estado: activar ? 'activo' : 'inactivo' }).eq('id', socio.id)); avisar(activar ? 'Socio reactivado.' : 'Socio desactivado.', activar ? 'ok' : 'alerta'); recargar(true) }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  const verConstancia = async (p: NonNullable<typeof d>['pagos'][number]) => setConstancia({ url: await urlFirmada('constancias', p.constancia_path), pago: p })
  const validar = async (aprobar: boolean) => {
    if (!constancia) return
    try {
      const r = await rpc<{ ok: boolean; mensaje: string }>('validar_pago', { p_pago_id: constancia.pago.id, p_aprobar: aprobar, p_motivo: aprobar ? null : motivo })
      avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); setConstancia(null); setMotivo(''); recargar(true)
    } catch (e) { avisar((e as Error).message, 'error') }
  }
  const subirFoto = async (f: File) => {
    const ruta = `${perfil!.club_id}/${socio.id}/titular-${Date.now()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`
    const up = await supabase.storage.from('fotos-socios').upload(ruta, f, { contentType: f.type })
    if (up.error) { avisar('No se pudo subir la foto.', 'error'); return }
    await supabase.from('socios').update({ foto_path: ruta }).eq('id', socio.id)
    avisar('Foto actualizada.'); recargar(true)
  }

  // Cuotas agrupadas por año
  const anios = [...new Set(d.cuotas.map((c) => c.periodo.slice(0, 4)))].sort().reverse()
  let saldo = 0
  const cuentaConSaldo = d.cuenta.map((m) => { saldo += m.tipo === 'cargo' ? Number(m.monto) : -Number(m.monto); return { ...m, saldo } }).reverse()

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px' }}>
      <Boton variante="ghost" tam="sm" icono={<ArrowLeft aria-hidden />} onClick={() => navegar('/admin/socios')} style={{ alignSelf: 'flex-start' }}>Socios</Boton>
      <section className="card row wrap" style={{ ['--gap' as string]: '20px', alignItems: 'center' }}>
        <button type="button" onClick={() => fotoInput.current?.click()} aria-label="Cambiar la foto del socio" style={{ position: 'relative', border: 0, background: 'none', padding: 0, borderRadius: '50%' }}>
          <Avatar nombre={`${socio.nombres} ${socio.apellidos}`} foto={d.foto} tam="xl" />
          <span className="icon-btn" style={{ position: 'absolute', right: -4, bottom: -4, width: 40, height: 40 }} aria-hidden><Camera size={18} /></span>
        </button>
        <input ref={fotoInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
        <div className="grow" style={{ minWidth: 220 }}>
          <h1 className="page-title break">{socio.nombres} {socio.apellidos}</h1>
          <p className="muted">Socio N° <b className="num">{socio.numero}</b>{socio.dni ? ` · DNI ${socio.dni}` : ''}{socio.fecha_ingreso ? ` · desde ${fechaCorta(socio.fecha_ingreso)}` : ''}</p>
          <div className="row wrap" style={{ marginTop: 10 }}>
            {socio.estado !== 'activo' ? <PillEstado estado="inactivo" tam="lg" texto={socio.estado === 'suspendido' ? 'Suspendido' : 'Inactivo'} /> :
              estado && <PillEstado estado={estado.estado_cuenta} tam="lg" texto={estado.estado_cuenta === 'deuda' ? `Debe ${moneda(estado.saldo)}` : undefined} />}
            {porValidar.length > 0 && <PillEstado estado="por_validar" texto={`${porValidar.length} pago(s) por validar`} />}
            {socio.es_ejemplo && <EjemploTag />}
          </div>
        </div>
        <div className="row wrap">
          <Boton icono={<Wallet aria-hidden />} onClick={() => setPago(true)}>Registrar pago</Boton>
          <Boton variante="secondary" icono={<KeyRound aria-hidden />} onClick={reenviarPin}>{d.cred ? 'Nuevo PIN' : 'Crear acceso'}</Boton>
          <Boton variante="ghost" icono={<Ban aria-hidden />} onClick={cambiarEstado}>{socio.estado === 'activo' ? 'Desactivar' : 'Reactivar'}</Boton>
        </div>
      </section>

      {porValidar.length > 0 && (
        <Aviso tono="info">
          <div className="stack" style={{ ['--gap' as string]: '8px' }}>
            <b>Constancias por validar</b>
            {porValidar.map((p) => (
              <div key={p.id} className="row wrap"><span className="grow">{moneda(p.monto)} por {p.medio} · {fechaHora(p.creado_en)}{p.operacion ? ` · op. ${p.operacion}` : ''}</span><Boton tam="sm" onClick={() => verConstancia(p)}>Revisar</Boton></div>
            ))}
          </div>
        </Aviso>
      )}

      <Pestanas etiqueta="Secciones de la ficha" valor={tab} onCambio={setTab} opciones={[
        { valor: 'resumen', etiqueta: 'Resumen' }, { valor: 'cuotas', etiqueta: 'Cuotas' }, { valor: 'cuenta', etiqueta: 'Cuenta' }, { valor: 'pagos', etiqueta: 'Pagos', cuenta: porValidar.length }, { valor: 'actividad', etiqueta: 'Ingresos y reservas' }]} />

      {tab === 'resumen' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
          <Tarjeta titulo="Datos">
            <dl style={{ margin: 0 }}>
              <div className="kv"><dt>Celular</dt><dd>{socio.celular ?? '—'}</dd></div>
              <div className="kv"><dt>Correo</dt><dd>{socio.correo ?? '—'}</dd></div>
              <div className="kv"><dt>Cuota mensual</dt><dd>{socio.cuota_mensual ? moneda(socio.cuota_mensual) : 'La del club'}</dd></div>
              <div className="kv"><dt>Acceso a la app</dt><dd>{d.cred ? (d.cred.debe_cambiar_pin ? 'Con PIN temporal' : 'Activo') : 'Sin acceso'}</dd></div>
              <div className="kv"><dt>Último ingreso a la app</dt><dd>{d.cred?.ultimo_ingreso ? fechaHora(d.cred.ultimo_ingreso) : '—'}</dd></div>
            </dl>
          </Tarjeta>
          <Tarjeta titulo="Familia" accion={<Boton variante="ghost" tam="sm" icono={<Plus aria-hidden />} onClick={() => setFamiliar(true)}>Agregar</Boton>}>
            <div className="list">
              {d.miembros.map((m) => <ItemLista key={m.id} inicio={<Avatar nombre={`${m.nombres} ${m.apellidos}`} />} titulo={`${m.nombres} ${m.apellidos}`} sub={`${PARENTESCO[m.parentesco]}${m.dni ? ` · DNI ${m.dni}` : ''}${m.fecha_nacimiento ? ` · ${fechaCorta(m.fecha_nacimiento)}` : ''}`} />)}
            </div>
          </Tarjeta>
          <Tarjeta titulo="Notas internas">
            <AreaTexto etiqueta="Solo las ve la directiva" value={notas ?? socio.notas ?? ''} onChange={(e) => setNotas(e.target.value)} />
            {notas !== null && notas !== (socio.notas ?? '') && <div style={{ marginTop: 10 }}><Boton icono={<Save aria-hidden />} onClick={async () => { await supabase.from('socios').update({ notas }).eq('id', socio.id); avisar('Nota guardada.'); setNotas(null); recargar(true) }}>Guardar nota</Boton></div>}
          </Tarjeta>
        </div>
      )}

      {tab === 'cuotas' && (
        <Tarjeta titulo="Cuotas mes a mes">
          {!anios.length ? <p className="muted">Sin cuotas registradas.</p> : anios.map((a) => (
            <div key={a} className="stack" style={{ ['--gap' as string]: '10px', marginBottom: 18 }}>
              <b>{a}</b>
              <div className="meses">
                {d.cuotas.filter((c) => c.periodo.startsWith(a)).map((c) => (
                  <div key={c.id} className={`mes ${c.estado}`} title={`Vence ${fechaCorta(c.vencimiento)}`}>
                    <span style={{ textTransform: 'capitalize' }}>{mesCorto(c.periodo)}</span>
                    <small>{c.estado === 'pagado' ? 'Pagado' : c.estado === 'vencido' ? 'Vencido' : c.estado === 'pendiente' ? 'Pendiente' : 'Anulada'} · {moneda(c.monto)}</small>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="row wrap small" style={{ marginTop: 8 }}><span className="mes pagado" style={{ minHeight: 28, padding: '0 10px' }}>Pagado</span><span className="mes pendiente" style={{ minHeight: 28, padding: '0 10px' }}>Pendiente</span><span className="mes vencido" style={{ minHeight: 28, padding: '0 10px' }}>Vencido</span></div>
        </Tarjeta>
      )}

      {tab === 'cuenta' && (
        <section className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla">
            <thead><tr><th>Fecha</th><th>Concepto</th><th className="num">Cargo</th><th className="num">Abono</th><th className="num">Saldo</th></tr></thead>
            <tbody>{cuentaConSaldo.map((m) => (
              <tr key={m.id}><td className="num">{fechaCorta(m.fecha)}</td><td className="break">{m.concepto}</td><td className="num">{m.tipo === 'cargo' ? moneda(m.monto) : ''}</td><td className="num" style={{ color: 'var(--ok-tinta)' }}>{m.tipo === 'abono' ? moneda(m.monto) : ''}</td><td className="num bold">{moneda(m.saldo)}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {tab === 'pagos' && (
        <Tarjeta titulo="Pagos">
          {!d.pagos.length ? <p className="muted">Sin pagos.</p> : (
            <div className="list">
              {d.pagos.map((p) => (
                <div key={p.id} className="list-item">
                  <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{moneda(p.monto)} · {p.medio}{p.origen === 'oficina' ? ' · oficina' : ' · app'}</span><span className="li-sub" style={{ display: 'block' }}>{fechaHora(p.creado_en)}{p.operacion ? ` · op. ${p.operacion}` : ''}{p.motivo_rechazo ? ` · ${p.motivo_rechazo}` : ''}</span></span>
                  <span className="li-end"><PillEstado estado={p.estado} />{p.constancia_path || p.estado === 'por_validar' ? <Boton variante="ghost" tam="sm" onClick={() => verConstancia(p)}>Ver</Boton> : null}</span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      )}

      {tab === 'actividad' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
          <Tarjeta titulo="Últimos ingresos al club">
            {!d.ingresos.length ? <p className="muted">Sin ingresos registrados.</p> : <div className="list">{d.ingresos.map((i) => (
              <div key={i.id} className="list-item"><span className="li-main"><span className="li-title" style={{ display: 'block' }}>{i.persona === 'invitado' ? `Invitado: ${i.invitados?.nombres}` : i.miembros?.nombres}</span><span className="li-sub" style={{ display: 'block' }}>{fechaCorta(i.fecha)} · {hora(i.hora)} · {i.tipo_ingreso}{i.monto > 0 ? ` · ${moneda(i.monto)}` : ''}</span></span><span className="small muted">{i.metodo === 'qr' ? 'QR' : i.metodo}</span></div>
            ))}</div>}
          </Tarjeta>
          <Tarjeta titulo="Reservas de tenis">
            {!d.reservas.length ? <p className="muted">Sin reservas.</p> : <div className="list">{d.reservas.map((r) => (
              <div key={r.id} className="list-item"><span className="li-main"><span className="li-title" style={{ display: 'block' }}>{r.canchas?.nombre} · {r.hora_inicio.slice(0, 5)}</span><span className="li-sub" style={{ display: 'block' }}>{fechaCorta(r.fecha)}{r.miembros ? ` · ${r.miembros.nombres}` : ''}</span></span><PillEstado estado={r.estado as Estado} /></div>
            ))}</div>}
          </Tarjeta>
        </div>
      )}

      <PagoOficina abierta={pago} onCerrar={() => setPago(false)} socioId={socio.id} sugerido={Math.max(0, Number(estado?.saldo ?? 0))} onListo={() => { setPago(false); recargar(true) }} />
      <NuevoFamiliar abierta={familiar} onCerrar={() => setFamiliar(false)} socioId={socio.id} apellidos={socio.apellidos} onListo={() => { setFamiliar(false); recargar(true) }} />

      <Hoja abierta={Boolean(pin)} onCerrar={() => setPin(null)} titulo="PIN temporal del socio" subtitulo="Se muestra una sola vez. El socio lo cambiará al entrar.">
        <div className="stack" style={{ alignItems: 'center' }}>
          <span className="cifra xl num" style={{ letterSpacing: '0.12em' }}>{pin}</span>
          <p className="muted" style={{ textAlign: 'center' }}>Para entrar: DNI <b>{socio.dni}</b> y este PIN en <b>casino-pimentel.netlify.app/app</b>.</p>
          <div style={{ width: 160 }}><CodigoQR texto="https://casino-pimentel.netlify.app/app/ingresar" tam={160} etiqueta="Enlace a la app" /></div>
        </div>
      </Hoja>

      <Hoja abierta={Boolean(constancia)} onCerrar={() => setConstancia(null)} titulo="Revisar constancia" subtitulo={constancia ? `${moneda(constancia.pago.monto)} por ${constancia.pago.medio} · ${fechaHora(constancia.pago.creado_en)}` : ''}
        pie={constancia?.pago.estado === 'por_validar' ? <><Boton variante="danger" icono={<X aria-hidden />} disabled={motivo.trim().length < 3} onClick={() => validar(false)}>Rechazar</Boton><Boton variante="ok" icono={<Check aria-hidden />} onClick={() => validar(true)}>Validar pago</Boton></> : undefined}>
        {constancia && (
          <div className="stack">
            {constancia.url ? (constancia.url.includes('.pdf') ? <a className="btn btn-secondary" href={constancia.url} target="_blank" rel="noreferrer">Abrir PDF</a> : <img src={constancia.url} alt="Constancia de pago" style={{ width: '100%', borderRadius: 18, border: '1px solid var(--border)' }} />)
              : <Aviso tono="alerta">Constancia de ejemplo: no tiene imagen.</Aviso>}
            {constancia.pago.operacion && <p>N° de operación: <b className="num">{constancia.pago.operacion}</b></p>}
            {constancia.pago.estado === 'por_validar' && <Campo etiqueta="Motivo si la rechazas" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el monto no coincide" ayuda="El socio recibirá este motivo." />}
          </div>
        )}
      </Hoja>
    </div>
  )
}

function PagoOficina({ abierta, onCerrar, socioId, sugerido, onListo }: { abierta: boolean; onCerrar: () => void; socioId: string; sugerido: number; onListo: () => void }) {
  const avisar = useToast()
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState('efectivo')
  const [comp, setComp] = useState('')
  const [guardando, setGuardando] = useState(false)
  const guardar = async () => {
    setGuardando(true)
    try { const r = await rpc<{ mensaje: string }>('registrar_pago_oficina', { p_socio_id: socioId, p_monto: Number(monto || sugerido), p_medio: medio, p_comprobante: comp || null }); avisar(r.mensaje); setMonto(''); setComp(''); onListo() }
    catch (e) { avisar((e as Error).message, 'error') } finally { setGuardando(false) }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Registrar pago en oficina" subtitulo="Se aplica a las cuotas más antiguas. El efectivo entra a la caja de oficina."
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar} cargando={guardando}>Registrar {moneda(Number(monto || sugerido))}</Boton></>}>
      <div className="stack">
        <Campo etiqueta="Monto (S/)" inputMode="decimal" placeholder={String(sugerido || 80)} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} />
        <Selector etiqueta="Medio de pago" value={medio} onChange={(e) => setMedio(e.target.value)}>
          <option value="efectivo">Efectivo</option><option value="yape">Yape</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="plin">Plin</option>
        </Selector>
        <Campo etiqueta="N° de recibo u operación (opcional)" value={comp} onChange={(e) => setComp(e.target.value)} />
      </div>
    </Hoja>
  )
}

function NuevoFamiliar({ abierta, onCerrar, socioId, apellidos, onListo }: { abierta: boolean; onCerrar: () => void; socioId: string; apellidos: string; onListo: () => void }) {
  const { perfil } = useSesion()
  const avisar = useToast()
  const [f, setF] = useState({ nombres: '', apellidos, dni: '', fecha_nacimiento: '', parentesco: 'esposa' })
  const guardar = async () => {
    if (f.nombres.trim().length < 2) { avisar('Escribe los nombres.', 'alerta'); return }
    try { ok(await supabase.from('miembros').insert({ club_id: perfil!.club_id, socio_id: socioId, nombres: f.nombres.trim(), apellidos: f.apellidos.trim(), dni: f.dni || null, fecha_nacimiento: f.fecha_nacimiento || null, parentesco: f.parentesco })); avisar('Familiar agregado.'); onListo() }
    catch (e) { avisar((e as Error).message, 'error') }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Agregar familiar" pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton onClick={guardar}>Agregar</Boton></>}>
      <div className="stack">
        <Selector etiqueta="Parentesco" value={f.parentesco} onChange={(e) => setF({ ...f, parentesco: e.target.value })}>
          <option value="esposa">Esposa</option><option value="esposo">Esposo</option><option value="hijo">Hijo</option><option value="hija">Hija</option><option value="otro">Otro</option>
        </Selector>
        <Campo etiqueta="Nombres" value={f.nombres} onChange={(e) => setF({ ...f, nombres: e.target.value })} />
        <Campo etiqueta="Apellidos" value={f.apellidos} onChange={(e) => setF({ ...f, apellidos: e.target.value })} />
        <Campo etiqueta="DNI" inputMode="numeric" maxLength={8} value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, '') })} />
        <Campo etiqueta="Fecha de nacimiento" type="date" value={f.fecha_nacimiento} onChange={(e) => setF({ ...f, fecha_nacimiento: e.target.value })} ayuda="Necesaria para la regla de tenis de hijos menores de 25." />
      </div>
    </Hoja>
  )
}

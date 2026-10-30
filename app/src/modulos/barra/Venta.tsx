import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Banknote, CircleUserRound, CreditCard, Gift, Minus, Plus, QrCode, Receipt, Save, Search, Smartphone, Sparkles, Trash2, UserRound, Wallet, X } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos } from '../../lib/datos'
import { moneda, monedaCorta } from '../../lib/formato'
import { Aviso, Boton, Buscador, Campo, Chips, EjemploTag, Esqueleto, Hoja, LectorQR, PillEstado, PuntosPin, TecladoNumerico, useDebounce, useToast, type Estado } from '../../ui'
import { useTurno } from './Barra'

interface Producto { id: string; nombre: string; subgrupo: string | null; precio: number; precio_evento: number | null; por_confirmar: boolean; categoria_id: string; orden: number }
interface Categoria { id: string; nombre: string; orden: number }
interface Cliente { socio_id: string; miembro_id: string | null; nombre: string; numero: string; estado_cuenta: Estado; saldo: number }
interface Item { key: string; producto_id: string; nombre: string; precio: number; cantidad: number; cortesia?: { motivo: string; autorizado_por: string; pin?: string; autoriza: string; cortesia_id?: string } }
type Medio = 'tarjeta' | 'efectivo' | 'yape' | 'cuenta_socio'

const MOTIVOS = ['Cumpleaños del socio', 'Atención por demora', 'Directiva', 'Evento del club']

async function cargarCarta() {
  const [c, p, cfg, e] = await Promise.all([
    supabase.from('categorias').select('id, nombre, orden').eq('activa', true).order('orden'),
    supabase.from('productos').select('id, nombre, subgrupo, precio, precio_evento, por_confirmar, categoria_id, orden').eq('activo', true).is('eliminado_en', null).order('orden'),
    supabase.from('config').select('reglas').maybeSingle(),
    supabase.from('personal').select('id, nombres, apellidos, cargo').eq('es_encargado', true).eq('activo', true).is('eliminado_en', null),
  ])
  return {
    categorias: ok(c) as Categoria[], productos: ok(p) as Producto[],
    evento: Boolean((ok(cfg) as { reglas: { barra?: { modo_evento?: boolean } } } | null)?.reglas?.barra?.modo_evento),
    encargados: ok(e) as { id: string; nombres: string; apellidos: string; cargo: string }[],
  }
}

export default function Venta() {
  const { turno } = useTurno()
  const avisar = useToast()
  const reducir = useReducedMotion()
  const { datos } = useDatos(cargarCarta, [])
  const [cat, setCat] = useState<string>('')
  const [comandaId, setComandaId] = useState<string | null>(null)
  const [numero, setNumero] = useState<number | null>(null)
  const [mesa, setMesa] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [hojaCliente, setHojaCliente] = useState(false)
  const [hojaCobro, setHojaCobro] = useState(false)
  const [hojaMesas, setHojaMesas] = useState(false)
  const [cortesiaDe, setCortesiaDe] = useState<Item | null>(null)
  const [ticket, setTicket] = useState<{ numero: number; total: number; vuelto: number; medio: Medio; items: Item[]; mesa: string; cliente: string | null } | null>(null)
  const [verComanda, setVerComanda] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (datos && !cat) setCat(datos.categorias[0]?.id ?? '') }, [datos, cat])
  const precio = (p: Producto) => (datos?.evento && p.precio_evento != null ? p.precio_evento : p.precio)
  const productos = useMemo(() => (datos?.productos ?? []).filter((p) => p.categoria_id === cat), [datos, cat])
  const total = items.filter((i) => !i.cortesia).reduce((s, i) => s + i.precio * i.cantidad, 0)
  const enCarrito = (id: string) => items.filter((i) => i.producto_id === id && !i.cortesia).reduce((s, i) => s + i.cantidad, 0)

  const agregar = (p: Producto) => {
    setItems((l) => {
      const ex = l.find((i) => i.producto_id === p.id && !i.cortesia)
      if (ex) return l.map((i) => (i === ex ? { ...i, cantidad: i.cantidad + 1 } : i))
      return [...l, { key: crypto.randomUUID(), producto_id: p.id, nombre: p.nombre, precio: precio(p), cantidad: 1 }]
    })
    navigator.vibrate?.(8)
  }
  const cambiar = (key: string, d: number) => setItems((l) => l.flatMap((i) => (i.key !== key ? [i] : i.cantidad + d <= 0 ? [] : [{ ...i, cantidad: i.cantidad + d }])))
  const limpiar = () => { setComandaId(null); setNumero(null); setMesa(''); setCliente(null); setItems([]); setVerComanda(false) }

  const payload = () => ({
    id: comandaId, barra_id: turno.barra_id, turno_barra_id: turno.id, mesero_id: turno.mesero_id, mesa: mesa || null,
    socio_id: cliente?.socio_id ?? null, miembro_id: cliente?.miembro_id ?? null, cliente_nombre: cliente?.nombre ?? null,
    items: items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad, ...(i.cortesia ? { cortesia: true, motivo: i.cortesia.motivo, autorizado_por: i.cortesia.autorizado_por, ...(i.cortesia.pin ? { pin: i.cortesia.pin } : { cortesia_id: i.cortesia.cortesia_id }) } : {}) })),
  })

  const guardarMesa = async () => {
    if (!items.length) return
    setGuardando(true)
    try {
      const r = await rpc<{ comanda_id: string; numero: number }>('guardar_comanda', { p: payload() })
      avisar(`Comanda N° ${r.numero} guardada${mesa ? ` (mesa ${mesa})` : ''}. Cóbrala cuando pidan la cuenta.`)
      limpiar()
    } catch (e) { avisar((e as Error).message, 'error') } finally { setGuardando(false) }
  }

  const cobrar = async (medio: Medio, recibido?: number) => {
    const g = await rpc<{ comanda_id: string; numero: number; total: number }>('guardar_comanda', { p: payload() })
    const pagos = g.total > 0 ? [{ medio, monto: g.total, ...(medio === 'efectivo' && recibido ? { recibido } : {}) }] : []
    const r = await rpc<{ ok: boolean; mensaje: string; vuelto: number; numero: number; total: number }>('cerrar_comanda', { p_comanda_id: g.comanda_id, p_pagos: pagos })
    if (!r.ok) throw new Error(r.mensaje)
    setTicket({ numero: r.numero, total: r.total, vuelto: r.vuelto, medio, items, mesa, cliente: cliente?.nombre ?? null })
    avisar(r.mensaje)
    setHojaCobro(false); limpiar()
  }

  const abrirComanda = async (id: string) => {
    const c = ok(await supabase.from('comandas').select('id, numero, mesa, socio_id, miembro_id, cliente_nombre, socios(numero)').eq('id', id).single()) as unknown as { id: string; numero: number; mesa: string | null; socio_id: string | null; miembro_id: string | null; cliente_nombre: string | null; socios: { numero: string } | null }
    const its = ok(await supabase.from('comanda_items').select('id, producto_id, cantidad, precio_unitario, es_cortesia, cortesia_id, productos(nombre), cortesias(motivo, autorizado_por, personal(nombres))').eq('comanda_id', id).eq('anulado', false)) as unknown as
      { id: string; producto_id: string; cantidad: number; precio_unitario: number; es_cortesia: boolean; cortesia_id: string | null; productos: { nombre: string }; cortesias: { motivo: string; autorizado_por: string; personal: { nombres: string } } | null }[]
    setComandaId(c.id); setNumero(c.numero); setMesa(c.mesa ?? '')
    setCliente(c.socio_id ? { socio_id: c.socio_id, miembro_id: c.miembro_id, nombre: c.cliente_nombre ?? 'Socio', numero: c.socios?.numero ?? '', estado_cuenta: 'al_dia', saldo: 0 } : null)
    setItems(its.map((i) => ({ key: i.id, producto_id: i.producto_id, nombre: i.productos.nombre, precio: Number(i.precio_unitario), cantidad: Number(i.cantidad),
      ...(i.es_cortesia && i.cortesias ? { cortesia: { motivo: i.cortesias.motivo, autorizado_por: i.cortesias.autorizado_por, autoriza: i.cortesias.personal.nombres, cortesia_id: i.cortesia_id ?? undefined } } : {}) })))
    setHojaMesas(false)
  }

  if (ticket) return <TicketPantalla t={ticket} onNueva={() => setTicket(null)} />

  const panel = (
    <section className="card stack" style={{ ['--gap' as string]: '14px', position: 'sticky', top: 92 }} aria-label="Comanda">
      <div className="row between">
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--tinta)' }}>{numero ? `Comanda N° ${numero}` : 'Comanda nueva'}</h2>
        <Boton variante="ghost" tam="sm" onClick={() => setHojaMesas(true)}>Mesas abiertas</Boton>
      </div>
      <Chips etiqueta="Mesa" scroll valor={mesa} onCambio={setMesa} opciones={[{ valor: '', etiqueta: 'Barra' }, ...Array.from({ length: 12 }, (_, i) => ({ valor: String(i + 1), etiqueta: `Mesa ${i + 1}` }))]} />
      <button type="button" className="list-item" style={{ background: 'var(--surface-2)', minHeight: 60 }} onClick={() => setHojaCliente(true)}>
        {cliente ? <CircleUserRound aria-hidden color="var(--azul)" /> : <UserRound aria-hidden color="var(--tinta-2)" />}
        <span className="li-main">
          <span className="li-title" style={{ display: 'block' }}>{cliente ? cliente.nombre : 'Cliente externo'}</span>
          <span className="li-sub" style={{ display: 'block' }}>{cliente ? `Socio N° ${cliente.numero}` : 'Toca para elegir un socio'}</span>
        </span>
        {cliente && <PillEstado estado={cliente.estado_cuenta} />}
      </button>
      {!items.length ? (
        <p className="muted" style={{ padding: '18px 4px' }}>Toca los productos de la izquierda para agregarlos.</p>
      ) : (
        <ul className="list" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '38vh', overflowY: 'auto' }}>
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.li key={i.key} layout={!reducir} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                className="row" style={{ padding: '10px 4px', borderBottom: '1px solid var(--border)', ['--gap' as string]: '8px' }}>
                <div className="grow">
                  <div className="bold break">{i.nombre}</div>
                  <div className="small muted num">{i.cortesia ? <span className="pill pill-sol" style={{ minHeight: 24 }}><Gift aria-hidden />Cortesía · autoriza {i.cortesia.autoriza}</span> : `${monedaCorta(i.precio)} c/u`}</div>
                </div>
                <div className="row" style={{ ['--gap' as string]: '4px' }}>
                  <button type="button" className="icon-btn" aria-label={`Quitar uno de ${i.nombre}`} onClick={() => cambiar(i.key, -1)}>{i.cantidad === 1 ? <Trash2 aria-hidden /> : <Minus aria-hidden />}</button>
                  <span className="num bold" style={{ minWidth: 28, textAlign: 'center', fontSize: 'var(--text-lg)' }}>{i.cantidad}</span>
                  <button type="button" className="icon-btn" aria-label={`Agregar uno de ${i.nombre}`} onClick={() => cambiar(i.key, 1)}><Plus aria-hidden /></button>
                  {!i.cortesia && <button type="button" className="icon-btn" aria-label={`Dar ${i.nombre} como cortesía`} title="Cortesía" onClick={() => setCortesiaDe(i)} style={{ background: 'var(--arena)', color: 'var(--arena-tinta)' }}><Gift aria-hidden /></button>}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <span className="bold" style={{ fontSize: 'var(--text-lg)' }}>Total</span>
        <span className="cifra num" style={{ color: 'var(--tinta)' }}>{moneda(total)}</span>
      </div>
      <div className="row">
        <Boton variante="outline" tam="lg" icono={<Save aria-hidden />} disabled={!items.length} cargando={guardando} onClick={guardarMesa}>Guardar</Boton>
        <Boton variante="primary" tam="lg" className="grow" icono={<Wallet aria-hidden />} disabled={!items.length} onClick={() => setHojaCobro(true)}>{total > 0 ? `Cobrar ${moneda(total)}` : 'Cerrar cortesía'}</Boton>
      </div>
      {items.length > 0 && <Boton variante="ghost" tam="sm" icono={<X aria-hidden />} onClick={limpiar}>Vaciar</Boton>}
    </section>
  )

  return (
    <div className="venta">
      <div className="stack" style={{ ['--gap' as string]: '14px', minWidth: 0 }}>
        {datos?.evento && <Aviso tono="alerta" icono={<Sparkles aria-hidden />}>Modo evento activo: se cobran los precios de evento.</Aviso>}
        {datos ? (
          <div className="tabs" role="tablist" aria-label="Categorías" style={{ background: 'rgba(255,255,255,0.6)', maxWidth: '100%' }}>
            {datos.categorias.map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className="tab" onClick={() => setCat(c.id)} style={{ minHeight: 56, fontSize: 'var(--text-md)' }}>
                {cat === c.id && <motion.span layoutId="cat-barra" className="tab-fondo" transition={reducir ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 }} />}
                <span>{c.nombre}</span>
              </button>
            ))}
          </div>
        ) : <Esqueleto alto={56} radio={28} />}
        <div className="productos" role="list" aria-label="Productos">
          {productos.map((p) => {
            const n = enCarrito(p.id)
            return (
              <motion.button key={p.id} type="button" role="listitem" className="prod" onClick={() => agregar(p)} whileTap={reducir ? undefined : { scale: 0.96 }} transition={{ duration: 0.12 }}
                aria-label={`${p.nombre}, ${monedaCorta(precio(p))}${n ? `, ${n} en la comanda` : ''}`}>
                {n > 0 && <span className="badge prod-badge">{n}</span>}
                <span className="prod-nombre">{p.nombre}</span>
                <span className="prod-precio num">{monedaCorta(precio(p))}{p.por_confirmar && <span className="xs" style={{ display: 'block', color: 'var(--alerta-tinta)', fontWeight: 600 }}>precio por confirmar</span>}</span>
              </motion.button>
            )
          })}
        </div>
      </div>
      <div className="venta-panel">{panel}</div>
      <button type="button" className="venta-barra-movil btn btn-primary btn-lg" onClick={() => setVerComanda(true)} disabled={!items.length}>
        <Receipt aria-hidden /><span>Ver comanda ({items.reduce((s, i) => s + i.cantidad, 0)}) · {moneda(total)}</span>
      </button>
      <Hoja abierta={verComanda} onCerrar={() => setVerComanda(false)} titulo="Comanda" lado={false}>{panel}</Hoja>

      <ClienteHoja abierta={hojaCliente} onCerrar={() => setHojaCliente(false)} onElegir={(c) => { setCliente(c); setHojaCliente(false) }} actual={cliente} onQuitar={() => { setCliente(null); setHojaCliente(false) }} />
      <CortesiaHoja item={cortesiaDe} encargados={datos?.encargados ?? []} onCerrar={() => setCortesiaDe(null)}
        onListo={(c) => {
          const it = cortesiaDe!
          setItems((l) => {
            const resto = l.flatMap((i) => (i.key !== it.key ? [i] : i.cantidad > 1 ? [{ ...i, cantidad: i.cantidad - 1 }] : []))
            return [...resto, { key: crypto.randomUUID(), producto_id: it.producto_id, nombre: it.nombre, precio: it.precio, cantidad: 1, cortesia: c }]
          })
          setCortesiaDe(null)
        }} />
      <CobroHoja abierta={hojaCobro} onCerrar={() => setHojaCobro(false)} total={total} conSocio={Boolean(cliente)} onCobrar={cobrar} />
      <MesasHoja abierta={hojaMesas} onCerrar={() => setHojaMesas(false)} barraId={turno.barra_id} onAbrir={abrirComanda} />
    </div>
  )
}

function ClienteHoja({ abierta, onCerrar, onElegir, actual, onQuitar }: { abierta: boolean; onCerrar: () => void; onElegir: (c: Cliente) => void; actual: Cliente | null; onQuitar: () => void }) {
  const [modo, setModo] = useState<'buscar' | 'qr'>('buscar')
  const [q, setQ] = useState('')
  const qd = useDebounce(q, 250)
  const [res, setRes] = useState<{ miembro_id: string; socio_id: string; numero: string; nombres: string; apellidos: string; parentesco: string; estado_cuenta: Estado; saldo: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!abierta) { setQ(''); setRes([]); setError(null); setModo('buscar') } }, [abierta])
  useEffect(() => {
    if (qd.trim().length < 2) { setRes([]); return }
    rpc<typeof res>('buscar_miembros', { p_q: qd, p_limite: 12 }).then(setRes).catch(() => setRes([]))
  }, [qd])
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="¿Quién consume?" subtitulo="Elige un socio para cobrar a su cuenta o para el registro.">
      <div className="stack">
        <Chips etiqueta="Cómo buscar" valor={modo} onCambio={setModo} opciones={[{ valor: 'buscar', etiqueta: 'Buscar', icono: <Search aria-hidden /> }, { valor: 'qr', etiqueta: 'Escanear carnet', icono: <QrCode aria-hidden /> }]} />
        {modo === 'buscar' ? (
          <>
            <Buscador valor={q} onCambio={setQ} autoFocus placeholder="Nombre, N° de socio o DNI" />
            <div className="list">
              {res.map((r) => (
                <button key={r.miembro_id} type="button" className="list-item" onClick={() => onElegir({ socio_id: r.socio_id, miembro_id: r.miembro_id, nombre: `${r.nombres} ${r.apellidos}`, numero: r.numero, estado_cuenta: r.estado_cuenta, saldo: r.saldo })}>
                  <span className="li-main"><span className="li-title" style={{ display: 'block' }}>{r.nombres} {r.apellidos}</span><span className="li-sub" style={{ display: 'block' }}>N° {r.numero} · {r.parentesco}</span></span>
                  <PillEstado estado={r.estado_cuenta} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <LectorQR onLeido={async (t) => {
              try {
                const r = await rpc<{ miembro_id: string; socio_id: string; numero: string; nombres: string; apellidos: string; estado_cuenta: Estado; saldo: number }>('leer_carnet', { p_token: t })
                onElegir({ socio_id: r.socio_id, miembro_id: r.miembro_id, nombre: `${r.nombres} ${r.apellidos}`, numero: r.numero, estado_cuenta: r.estado_cuenta, saldo: r.saldo })
              } catch (e) { setError((e as Error).message) }
            }} />
            {error && <Aviso tono="peligro">{error}</Aviso>}
          </>
        )}
        {actual && <Boton variante="outline" onClick={onQuitar}>Cambiar a cliente externo</Boton>}
      </div>
    </Hoja>
  )
}

function CortesiaHoja({ item, encargados, onCerrar, onListo }: { item: Item | null; encargados: { id: string; nombres: string; apellidos: string; cargo: string }[]; onCerrar: () => void; onListo: (c: NonNullable<Item['cortesia']>) => void }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [otro, setOtro] = useState('')
  const [quien, setQuien] = useState('')
  const [pin, setPin] = useState('')
  useEffect(() => { if (item) { setMotivo(MOTIVOS[0]); setOtro(''); setQuien(encargados[0]?.id ?? ''); setPin('') } }, [item, encargados])
  const enc = encargados.find((e) => e.id === quien)
  const listo = quien && pin.length >= 4 && (motivo !== 'Otro' || otro.trim().length > 2)
  return (
    <Hoja abierta={Boolean(item)} onCerrar={onCerrar} titulo={`Cortesía: ${item?.nombre ?? ''}`} subtitulo="Necesita motivo y el PIN del encargado. Queda registrada."
      pie={<><Boton variante="outline" onClick={onCerrar}>Cancelar</Boton><Boton variante="arena" disabled={!listo} onClick={() => onListo({ motivo: motivo === 'Otro' ? otro.trim() : motivo, autorizado_por: quien, pin, autoriza: enc?.nombres.split(' ')[0] ?? '' })}>Dar cortesía</Boton></>}>
      <div className="stack">
        <Chips etiqueta="Motivo" valor={motivo} onCambio={setMotivo} opciones={[...MOTIVOS, 'Otro'].map((m) => ({ valor: m, etiqueta: m }))} />
        {motivo === 'Otro' && <Campo etiqueta="Escribe el motivo" value={otro} onChange={(e) => setOtro(e.target.value)} />}
        <div className="field"><span className="field-label">Autoriza</span>
          <Chips etiqueta="Encargado que autoriza" valor={quien} onCambio={setQuien} opciones={encargados.map((e) => ({ valor: e.id, etiqueta: `${e.nombres.split(' ')[0]} · ${e.cargo}` }))} />
        </div>
        <div className="stack" style={{ alignItems: 'center' }}>
          <span className="field-label">PIN de {enc?.nombres.split(' ')[0] ?? 'el encargado'}</span>
          <PuntosPin largo={pin.length} total={Math.max(4, pin.length)} />
          <TecladoNumerico onTecla={(d) => setPin((p) => (p.length < 6 ? p + d : p))} onBorrar={() => setPin((p) => p.slice(0, -1))} />
        </div>
      </div>
    </Hoja>
  )
}

function CobroHoja({ abierta, onCerrar, total, conSocio, onCobrar }: { abierta: boolean; onCerrar: () => void; total: number; conSocio: boolean; onCobrar: (m: Medio, recibido?: number) => Promise<void> }) {
  const [medio, setMedio] = useState<Medio>('tarjeta')
  const [recibido, setRecibido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cobrando, setCobrando] = useState(false)
  useEffect(() => { if (abierta) { setMedio('tarjeta'); setRecibido(''); setError(null) } }, [abierta])
  const rec = Number(recibido || 0)
  const vuelto = Math.max(0, rec - total)
  const MEDIOS: { valor: Medio; etiqueta: string; icono: typeof CreditCard }[] = [
    { valor: 'tarjeta', etiqueta: 'Tarjeta', icono: CreditCard }, { valor: 'efectivo', etiqueta: 'Efectivo', icono: Banknote },
    { valor: 'yape', etiqueta: 'Yape', icono: Smartphone }, { valor: 'cuenta_socio', etiqueta: 'A cuenta del socio', icono: Wallet },
  ]
  const confirmar = async () => {
    if (medio === 'efectivo' && recibido && rec < total) { setError('El efectivo recibido es menor que el total.'); return }
    setCobrando(true); setError(null)
    try { await onCobrar(medio, medio === 'efectivo' && recibido ? rec : undefined) } catch (e) { setError((e as Error).message) } finally { setCobrando(false) }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={`Cobrar ${moneda(total)}`}
      pie={<><Boton variante="outline" onClick={onCerrar}>Volver</Boton><Boton variante="ok" cargando={cobrando} onClick={confirmar} disabled={medio === 'cuenta_socio' && !conSocio}>{total > 0 ? 'Confirmar cobro' : 'Confirmar'}</Boton></>}>
      <div className="stack">
        {total > 0 && (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', ['--gap' as string]: '10px' }}>
            {MEDIOS.map((m) => (
              <button key={m.valor} type="button" className={`btn ${medio === m.valor ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={medio === m.valor}
                style={{ minHeight: 84, flexDirection: 'column', gap: 6, borderRadius: 22 }} onClick={() => setMedio(m.valor)} disabled={m.valor === 'cuenta_socio' && !conSocio}>
                <m.icono aria-hidden /><span>{m.etiqueta}</span>
              </button>
            ))}
          </div>
        )}
        {medio === 'cuenta_socio' && !conSocio && <Aviso tono="alerta">Para cargar a la cuenta, primero elige al socio en la comanda.</Aviso>}
        {medio === 'efectivo' && total > 0 && (
          <div className="stack" style={{ alignItems: 'center' }}>
            <span className="field-label">¿Con cuánto paga?</span>
            <div className="monto-display">{recibido ? moneda(rec) : <span className="muted">S/ —</span>}</div>
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              {[Math.ceil(total), 20, 50, 100, 200].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 4).map((v) => (
                <Boton key={v} variante="secondary" tam="sm" onClick={() => setRecibido(String(v))}>{monedaCorta(v)}</Boton>
              ))}
            </div>
            <TecladoNumerico decimal onTecla={(d) => setRecibido((r) => (d === '.' && r.includes('.') ? r : (r + d).slice(0, 8)))} onBorrar={() => setRecibido((r) => r.slice(0, -1))} />
            {rec >= total && <div className="aviso ok" style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--text-lg)' }}>Vuelto: <b className="num">{moneda(vuelto)}</b></div>}
          </div>
        )}
        {error && <Aviso tono="peligro">{error}</Aviso>}
      </div>
    </Hoja>
  )
}

function MesasHoja({ abierta, onCerrar, barraId, onAbrir }: { abierta: boolean; onCerrar: () => void; barraId: string; onAbrir: (id: string) => void }) {
  const { datos, recargar } = useDatos(async () => (abierta ? ok(await supabase.from('comandas').select('id, numero, mesa, total, cliente_nombre, abierta_en, es_ejemplo')
    .eq('barra_id', barraId).eq('estado', 'abierta').order('abierta_en')) as { id: string; numero: number; mesa: string | null; total: number; cliente_nombre: string | null; es_ejemplo: boolean }[] : []), [abierta, barraId])
  useEffect(() => { if (abierta) recargar(true) }, [abierta]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Mesas abiertas" subtitulo="Comandas guardadas sin cobrar.">
      {datos?.length ? (
        <div className="list">
          {datos.map((c) => (
            <button key={c.id} type="button" className="list-item" onClick={() => onAbrir(c.id)}>
              <span className="li-main"><span className="li-title" style={{ display: 'block' }}>N° {c.numero} · {c.mesa ? `Mesa ${c.mesa}` : 'Barra'}</span><span className="li-sub" style={{ display: 'block' }}>{c.cliente_nombre ?? 'Cliente externo'}</span></span>
              <b className="num">{moneda(c.total)}</b>
              {c.es_ejemplo && <EjemploTag texto="Ejemplo" />}
            </button>
          ))}
        </div>
      ) : <p className="muted">No hay mesas abiertas.</p>}
    </Hoja>
  )
}

function TicketPantalla({ t, onNueva }: { t: { numero: number; total: number; vuelto: number; medio: Medio; items: Item[]; mesa: string; cliente: string | null }; onNueva: () => void }) {
  const reducir = useReducedMotion()
  const medio = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', yape: 'Yape', cuenta_socio: 'A cuenta del socio' }[t.medio]
  return (
    <motion.div className="stack" style={{ alignItems: 'center', ['--gap' as string]: '18px', paddingTop: 12 }}
      initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(10px)' }} animate={reducir ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
      <h1 className="page-title">Cobrado</h1>
      {t.vuelto > 0 && <div className="aviso ok" style={{ fontSize: 'var(--text-xl)', padding: '16px 28px' }}>Vuelto: <b className="num">{moneda(t.vuelto)}</b></div>}
      <section className="card stack" style={{ width: 'min(100%, 460px)', ['--gap' as string]: '4px', borderTop: '6px solid var(--arena-oscura)' }} aria-label="Ticket de la comanda">
        <div className="row between"><b>El Astillero</b><b className="num">Comanda N° {t.numero}</b></div>
        <span className="small muted">{t.mesa ? `Mesa ${t.mesa}` : 'Barra'}{t.cliente ? ` · ${t.cliente}` : ''}</span>
        <hr className="hr" />
        {t.items.map((i) => (
          <div key={i.key} className="kv"><span>{i.cantidad} × {i.nombre}{i.cortesia ? ' (cortesía)' : ''}</span><span className="num">{i.cortesia ? moneda(0) : moneda(i.precio * i.cantidad)}</span></div>
        ))}
        <div className="kv"><b>Total</b><b className="num" style={{ fontSize: 'var(--text-lg)' }}>{moneda(t.total)}</b></div>
        <div className="kv"><span className="muted">Pago</span><span>{medio}</span></div>
      </section>
      <Boton tam="xl" variante="primary" onClick={onNueva}>Nueva venta</Boton>
    </motion.div>
  )
}

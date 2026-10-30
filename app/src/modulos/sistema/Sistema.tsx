import { useState } from 'react'
import { Bell, CalendarDays, Check, CreditCard, Inbox, Plus, Search, ShoppingBag, Users, Wallet } from 'lucide-react'
import {
  AreaTexto, Aviso, Avatar, Boton, BotonIcono, Buscador, CalendarioTurnos, Campo, Carnet, Chips, EjemploTag, Encabezado,
  Esqueleto, EsqueletoLista, Hoja, Indicador, Interruptor, ItemLista, LectorQR, Pestanas, PillEstado, PuntosPin, Selector,
  Tarjeta, TecladoNumerico, Vacio, Wordmark, useConfirmar, useToast, type Estado,
} from '../../ui'
import { moneda } from '../../lib/formato'

const COLORES: { nombre: string; token: string; hex: string; uso: string }[] = [
  { nombre: 'Cielo', token: '--cielo', hex: '#F6FAFD', uso: 'Fondo general' },
  { nombre: 'Blanco', token: '--blanco', hex: '#FFFFFF', uso: 'Superficie' },
  { nombre: 'Celeste', token: '--celeste', hex: '#E8F2FA', uso: 'Tarjetas secundarias, inputs' },
  { nombre: 'Azul Pimentel', token: '--azul', hex: '#1B4F8F', uso: 'Primario · 8.2:1' },
  { nombre: 'Azul activo', token: '--azul-activo', hex: '#2A6BC0', uso: 'Hover, enlaces · 5.3:1' },
  { nombre: 'Tinta', token: '--tinta', hex: '#0E2236', uso: 'Texto · 15.4:1' },
  { nombre: 'Texto secundario', token: '--tinta-2', hex: '#4A5B6E', uso: '6.6:1' },
  { nombre: 'Arena', token: '--arena', hex: '#EADFCB', uso: 'Solo El Astillero' },
  { nombre: 'Arena oscura', token: '--arena-oscura', hex: '#8C6D45', uso: 'Íconos sobre arena' },
  { nombre: 'Sol', token: '--sol', hex: '#F4B53F', uso: 'Solo destellos' },
  { nombre: 'Al día', token: '--ok', hex: '#1E9A68', uso: 'Texto: #0F6B47' },
  { nombre: 'Por vencer', token: '--alerta', hex: '#C98410', uso: 'Texto: #8A5A06' },
  { nombre: 'Deuda', token: '--peligro', hex: '#D14343', uso: 'Texto: #A72E2E' },
]

const ESTADOS: Estado[] = ['al_dia', 'por_vencer', 'deuda', 'presente', 'tardanza', 'falta', 'por_validar', 'pagado', 'vencido', 'nuevo']

export default function Sistema() {
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [filtro, setFiltro] = useState<'todos' | 'al_dia' | 'por_vencer' | 'deuda'>('todos')
  const [vista, setVista] = useState<'dia' | 'semana' | 'mes'>('dia')
  const [hoja, setHoja] = useState(false)
  const [pin, setPin] = useState('')
  const [buscar, setBuscar] = useState('')
  const [notif, setNotif] = useState(true)
  const [lector, setLector] = useState(false)
  const [cargando, setCargando] = useState(false)

  const dias = ['lun 27', 'mar 28', 'mié 29', 'jue 30', 'vie 31', 'sáb 1', 'dom 2'].map((e, i) => ({ fecha: String(i), etiqueta: e }))
  const personas = [{ id: 'a', nombre: 'Rosa Quispe' }, { id: 'b', nombre: 'Luis Vílchez' }, { id: 'c', nombre: 'María Fernanda de los Milagros Santisteban' }]

  return (
    <main className="contenedor vitrina" style={{ paddingBlock: 32 }}>
      <div className="row between wrap" style={{ marginBottom: 24 }}>
        <Wordmark sub="Sistema de diseño · Malecón de Pimentel" href="/app/" />
        <EjemploTag />
      </div>
      <Encabezado titulo="Sistema de diseño" explicacion="Todas las piezas que usan la web, el panel, la barra, la portería y la app del socio. Un cambio aquí se ve en todo el sistema." />

      <div className="stack" style={{ ['--gap' as string]: '40px' }}>
        <section className="stack">
          <h2 className="section-title">Color</h2>
          <div className="grid-auto" style={{ ['--min' as string]: '170px' }}>
            {COLORES.map((c) => (
              <div key={c.token} className="muestra-color">
                <div className="sw" style={{ background: `var(${c.token})` }} />
                <div className="info"><b>{c.nombre}</b><br /><code>{c.hex} · {c.token}</code><br /><span className="muted">{c.uso}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="stack">
          <h2 className="section-title">Tipografía</h2>
          <Tarjeta>
            <div className="stack">
              <span className="cifra xl">{moneda(1640)}</span>
              <h1 style={{ fontSize: 'var(--text-3xl)' }}>Tu club frente al mar</h1>
              <h2 style={{ fontSize: 'var(--text-2xl)' }}>Socios al día este mes</h2>
              <p style={{ fontSize: 'var(--text-md)' }}>Texto base de 17 px para que se lea sin lentes. Figtree para la interfaz, Outfit para títulos y cifras.</p>
              <p className="muted small">Texto secundario de 15 px. Nada baja de 14 px.</p>
              <p className="num">Cifras tabulares: 1,111.11 · 8,888.88 · 22:30</p>
            </div>
          </Tarjeta>
        </section>

        <section className="stack">
          <h2 className="section-title">Botones</h2>
          <div className="row wrap">
            <Boton icono={<Check aria-hidden />} onClick={() => avisar('Cobro registrado: S/ 45.00')}>Cobrar</Boton>
            <Boton variante="secondary">Secundario</Boton>
            <Boton variante="outline">Contorno</Boton>
            <Boton variante="ghost">Fantasma</Boton>
            <Boton variante="danger" onClick={async () => { if (await confirmar({ titulo: '¿Desactivar al socio?', texto: 'Ya no podrá ingresar con su carnet. Puedes reactivarlo después.', confirmar: 'Desactivar', peligro: true })) avisar('Socio desactivado', 'alerta') }}>Desactivar</Boton>
            <Boton variante="arena">Barra</Boton>
            <Boton cargando={cargando} onClick={() => { setCargando(true); setTimeout(() => setCargando(false), 1500) }}>Guardar</Boton>
            <Boton disabled>Deshabilitado</Boton>
          </div>
          <div className="row wrap">
            <Boton tam="lg" icono={<Plus aria-hidden />}>Botón de tablet</Boton>
            <BotonIcono icono={<Bell aria-hidden />} etiqueta="Avisos" />
            <BotonIcono icono={<Wallet aria-hidden />} etiqueta="Pagar" />
          </div>
        </section>

        <section className="stack">
          <h2 className="section-title">Pills de estado, chips y pestañas</h2>
          <div className="row wrap">{ESTADOS.map((e) => <PillEstado key={e} estado={e} />)}<PillEstado estado="deuda" texto="Debes S/ 160" /></div>
          <Chips etiqueta="Filtrar socios" valor={filtro} onCambio={setFiltro} opciones={[
            { valor: 'todos', etiqueta: 'Todos', cuenta: 60 }, { valor: 'al_dia', etiqueta: 'Al día', cuenta: 41 },
            { valor: 'por_vencer', etiqueta: 'Por vencer', cuenta: 7 }, { valor: 'deuda', etiqueta: 'Con deuda', cuenta: 12 }]} />
          <Pestanas etiqueta="Periodo" valor={vista} onCambio={setVista} opciones={[{ valor: 'dia', etiqueta: 'Día' }, { valor: 'semana', etiqueta: 'Semana' }, { valor: 'mes', etiqueta: 'Mes' }]} />
        </section>

        <section className="stack">
          <h2 className="section-title">Indicadores</h2>
          <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
            <Indicador etiqueta="Ventas de barra" valor={640} formato={moneda} icono={<ShoppingBag aria-hidden />} nota="2 barras · hoy" destacado />
            <Indicador etiqueta="Personas dentro" valor={84} icono={<Users aria-hidden />} nota="12 invitados" />
            <Indicador etiqueta="Pagos por validar" valor={3} icono={<CreditCard aria-hidden />} nota="Desde la app del socio" onClick={() => avisar('Abriría la lista de pagos', 'info')} />
          </div>
        </section>

        <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
          <Tarjeta titulo="Campos">
            <div className="stack">
              <Campo etiqueta="DNI del invitado" inputMode="numeric" placeholder="8 dígitos" ayuda="Lo usamos para contar sus visitas del mes." />
              <Campo etiqueta="Monto" defaultValue="12a" error="Escribe solo números. Ejemplo: 45.50" />
              <Campo etiqueta="Correo" placeholder="nombre@correo.com" disabled />
              <Campo etiqueta="Buscando DNI…" cargando defaultValue="4512" />
              <Selector etiqueta="Tipo de ingreso"><option>Club · S/ 10</option><option>Piscina · S/ 20</option><option>Comedor · libre</option></Selector>
              <AreaTexto etiqueta="Nota" placeholder="Escribe una nota para administración" />
              <Interruptor etiqueta="Notificaciones" descripcion="Te avisamos cuando vence tu cuota." activo={notif} onCambio={setNotif} />
            </div>
          </Tarjeta>
          <Tarjeta titulo="Teclado numérico (PIN)">
            <div className="stack" style={{ alignItems: 'center' }}>
              <PuntosPin largo={pin.length} />
              <TecladoNumerico onTecla={(d) => setPin((p) => (p.length < 6 ? p + d : p))} onBorrar={() => setPin((p) => p.slice(0, -1))} onAceptar={() => { avisar(`PIN de ${pin.length} dígitos`, 'info'); setPin('') }} aceptarTexto="Entrar" />
            </div>
          </Tarjeta>
        </section>

        <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
          <Tarjeta titulo="Buscador y lista">
            <div className="stack">
              <Buscador valor={buscar} onCambio={setBuscar} placeholder="Socio por nombre, N° o DNI" />
              <div className="list">
                <ItemLista inicio={<Avatar nombre="Carlos Alberto Montenegro" />} titulo="Carlos Alberto Montenegro" sub="N° 0142 · Titular" fin={<PillEstado estado="al_dia" />} onClick={() => setHoja(true)} />
                <ItemLista inicio={<Avatar nombre="Ana Lucía Bazán" />} titulo="Ana Lucía Bazán Chirinos de la Torre Ugarte" sub="N° 0087 · 3 cuotas vencidas" fin={<PillEstado estado="deuda" texto="S/ 240" />} onClick={() => setHoja(true)} />
                <ItemLista inicio={<Avatar nombre="Jorge Ruiz" />} titulo="Jorge Ruiz" sub="N° 0203" fin={<PillEstado estado="por_vencer" />} onClick={() => setHoja(true)} />
              </div>
              <Boton variante="secondary" onClick={() => setHoja(true)}>Abrir hoja / panel</Boton>
            </div>
          </Tarjeta>
          <Tarjeta titulo="Vacío y cargando">
            <Vacio icono={<Inbox />} titulo="Aún no hay pagos por validar" texto="Cuando un socio suba su constancia de Yape, aparecerá aquí para que la revises." />
            <EsqueletoLista filas={2} />
            <Esqueleto alto={120} radio={28} />
          </Tarjeta>
        </section>

        <section className="stack">
          <h2 className="section-title">Avisos</h2>
          <Aviso icono={<Bell aria-hidden />}>En iPhone, primero toca Compartir y luego "Agregar a pantalla de inicio".</Aviso>
          <Aviso tono="ok" icono={<Check aria-hidden />}>Pago validado. Tu cuenta está al día.</Aviso>
          <Aviso tono="alerta" icono={<CalendarDays aria-hidden />}>Tu cuota de noviembre vence el 15.</Aviso>
          <Aviso tono="peligro" icono={<Search aria-hidden />}>Este invitado ya vino 3 veces este mes. Podrá volver desde el 1 de diciembre.</Aviso>
        </section>

        <section className="stack">
          <h2 className="section-title">Calendario de turnos</h2>
          <Tarjeta>
            <CalendarioTurnos personas={personas} dias={dias} celda={(p, f) => (Number(f) === 6 ? null : p === 'a' ? { inicio: '07:00', fin: '15:00' } : p === 'b' ? { inicio: '14:00', fin: '22:00' } : Number(f) % 2 ? { inicio: '18:00', fin: '02:00' } : null)} />
          </Tarjeta>
        </section>

        <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
          <Tarjeta titulo="Carnet digital">
            <Carnet datos={{ nombre: 'Carlos Alberto Montenegro', tipo: 'Titular', numero: '0142', estado: 'al_dia' }}
              obtenerToken={async () => `CP1.demo.${Math.floor(Date.now() / 30000)}`} />
            <div style={{ height: 16 }} />
            <Carnet datos={{ nombre: 'Ana Lucía Bazán Chirinos', tipo: 'Titular', numero: '0087', estado: 'deuda', estadoTexto: 'Debes S/ 160' }}
              obtenerToken={async () => `CP1.demo2.${Math.floor(Date.now() / 30000)}`} />
          </Tarjeta>
          <Tarjeta titulo="Lector de QR">
            {lector ? <LectorQR onLeido={(t) => { avisar(`Leído: ${t.slice(0, 24)}…`, 'info'); setLector(false) }} /> : <Boton bloque tam="lg" onClick={() => setLector(true)}>Probar el lector</Boton>}
          </Tarjeta>
        </section>
      </div>

      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo="Carlos Alberto Montenegro" subtitulo="N° 0142 · Titular"
        pie={<><Boton variante="outline" onClick={() => setHoja(false)}>Cerrar</Boton><Boton onClick={() => { setHoja(false); avisar('Pago registrado') }}>Registrar pago</Boton></>}>
        <div className="stack">
          <div className="row"><Avatar nombre="Carlos Alberto Montenegro" tam="lg" /><PillEstado estado="al_dia" tam="lg" /></div>
          <dl style={{ margin: 0 }}>
            <div className="kv"><dt>Cuota mensual</dt><dd>{moneda(80)}</dd></div>
            <div className="kv"><dt>Deuda</dt><dd>{moneda(0)}</dd></div>
            <div className="kv"><dt>Último ingreso</dt><dd>hoy · 18:42</dd></div>
          </dl>
          <p className="muted">En el celular esta hoja se cierra arrastrándola hacia abajo. En la computadora aparece como panel lateral.</p>
        </div>
      </Hoja>
    </main>
  )
}

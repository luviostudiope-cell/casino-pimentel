import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, KeyRound, Upload } from 'lucide-react'
import { funcion, rpc } from '../../lib/supabase'
import { exportarExcel, leerExcel } from '../../lib/excel'
import { hoyLima } from '../../lib/formato'
import { Aviso, Boton, Encabezado, Tarjeta, useConfirmar, useToast } from '../../ui'

interface Fila { numero: string; apellidos: string; nombres: string; dni: string; celular: string; correo: string; fecha_ingreso: string }
interface Validacion { total: number; validas: number; errores: { fila: number; mensaje: string }[]; nuevos: number; actualizados: number }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** Convierte las columnas del Excel del club a los campos del sistema (acepta "APELLIDOS Y NOMBRES" en una sola columna). */
function mapear(filas: Record<string, unknown>[]): Fila[] {
  return filas.map((f) => {
    const v: Record<string, string> = {}
    for (const [k, val] of Object.entries(f)) v[norm(k)] = val instanceof Date ? val.toISOString().slice(0, 10) : String(val ?? '').trim()
    const buscar = (...claves: string[]) => { for (const c of claves) { const k = Object.keys(v).find((x) => x === c || x.startsWith(c)); if (k && v[k]) return v[k] } return '' }
    let apellidos = buscar('apellidos', 'apellido')
    let nombres = buscar('nombres', 'nombre')
    const junto = buscar('apellidos y nombres', 'apellidos nombres', 'socio', 'nombre completo')
    if (junto && (!apellidos || !nombres || apellidos === junto)) {
      if (junto.includes(',')) { [apellidos, nombres] = junto.split(',').map((s) => s.trim()) }
      else { const p = junto.split(/\s+/); apellidos = p.slice(0, 2).join(' '); nombres = p.slice(2).join(' ') }
    }
    return {
      numero: buscar('n', 'nro', 'numero', 'n socio', 'codigo').replace(/\D/g, ''),
      apellidos, nombres,
      dni: buscar('dni', 'documento').replace(/\D/g, ''),
      celular: buscar('celular', 'telefono', 'movil'),
      correo: buscar('correo', 'email', 'e mail'),
      fecha_ingreso: buscar('fecha de ingreso', 'fecha ingreso', 'ingreso'),
    }
  }).filter((f) => f.numero || f.apellidos)
}

export default function Importar() {
  const navegar = useNavigate()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const input = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<string | null>(null)
  const [filas, setFilas] = useState<Fila[]>([])
  const [val, setVal] = useState<Validacion | null>(null)
  const [hecho, setHecho] = useState<Validacion | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  const elegir = async (f: File) => {
    setTrabajando(true); setHecho(null); setVal(null)
    try {
      const datos = mapear(await leerExcel(f))
      setArchivo(f.name); setFilas(datos)
      setVal(await rpc<Validacion>('importar_socios', { p_filas: datos, p_solo_validar: true }))
    } catch (e) { avisar('No pudimos leer el archivo: ' + (e as Error).message, 'error') } finally { setTrabajando(false) }
  }
  const importar = async () => {
    if (!(await confirmar({ titulo: `¿Importar ${val!.validas} socios?`, texto: 'Los socios que ya existen (mismo N°) se actualizan. Los datos de ejemplo con ese N° dejan de marcarse como ejemplo.', confirmar: 'Importar' }))) return
    setTrabajando(true)
    try { const r = await rpc<Validacion>('importar_socios', { p_filas: filas, p_solo_validar: false }); setHecho(r); avisar(`Listo: ${r.nuevos} nuevos y ${r.actualizados} actualizados.`) }
    catch (e) { avisar((e as Error).message, 'error') } finally { setTrabajando(false) }
  }
  const crearAccesos = async () => {
    setTrabajando(true)
    try {
      const r = await funcion<{ cuentas: { numero?: string; nombre?: string; dni?: string; pin?: string; error?: string }[] }>('admin-socios', { accion: 'crear_cuentas' })
      const ok = r.cuentas.filter((c) => c.pin)
      if (ok.length) await exportarExcel(`accesos-socios-${hoyLima()}`, { Accesos: ok.map((c) => ({ 'N°': c.numero, Socio: c.nombre, DNI: c.dni, 'PIN temporal': c.pin })) })
      avisar(`${ok.length} accesos creados. Se descargó la lista con los PIN temporales para entregarlos.`)
    } catch (e) { avisar((e as Error).message, 'error') } finally { setTrabajando(false) }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 1000 }}>
      <Boton variante="ghost" tam="sm" icono={<ArrowLeft aria-hidden />} onClick={() => navegar('/admin/socios')} style={{ alignSelf: 'flex-start' }}>Socios</Boton>
      <Encabezado titulo="Importar padrón" explicacion="Sube el Excel del padrón. Primero se revisa fila por fila y recién después se guarda." />
      <Tarjeta titulo="1. Elige el archivo">
        <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && elegir(e.target.files[0])} />
        <div className="stack">
          <Boton tam="lg" variante="secondary" icono={<FileSpreadsheet aria-hidden />} cargando={trabajando && !val} onClick={() => input.current?.click()}>{archivo ?? 'Elegir Excel del padrón'}</Boton>
          <p className="small muted">Columnas que reconoce: N°, Apellidos y Nombres (juntos o separados), DNI, Celular, Correo y Fecha de ingreso. Los colores de las cuotas del Excel no se leen: las cuotas se registran desde el sistema.</p>
        </div>
      </Tarjeta>
      {val && (
        <Tarjeta titulo="2. Revisión">
          <div className="stack">
            <div className="row wrap">
              <span className="pill pill-ok pill-lg num">{val.validas} filas correctas</span>
              {val.errores.length > 0 && <span className="pill pill-peligro pill-lg num">{val.errores.length} con errores</span>}
            </div>
            {val.errores.length > 0 && (
              <Aviso tono="alerta"><b>Corrige estas filas en el Excel y vuelve a subirlo (o impórtalas después):</b>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{val.errores.slice(0, 20).map((e) => <li key={e.fila}>Fila {e.fila + 1}: {e.mensaje}</li>)}</ul>
              </Aviso>
            )}
            <div className="tabla-wrap">
              <table className="tabla">
                <thead><tr><th>N°</th><th>Apellidos</th><th>Nombres</th><th>DNI</th><th>Celular</th></tr></thead>
                <tbody>{filas.slice(0, 15).map((f, i) => <tr key={i}><td className="num">{f.numero}</td><td>{f.apellidos}</td><td>{f.nombres}</td><td className="num">{f.dni}</td><td className="num">{f.celular}</td></tr>)}</tbody>
              </table>
            </div>
            {filas.length > 15 && <p className="small muted">… y {filas.length - 15} filas más.</p>}
            {!hecho && <Boton tam="lg" icono={<Upload aria-hidden />} disabled={!val.validas} cargando={trabajando} onClick={importar}>Importar {val.validas} socios</Boton>}
          </div>
        </Tarjeta>
      )}
      {hecho && (
        <Tarjeta titulo="3. Listo">
          <div className="stack">
            <Aviso tono="ok" icono={<CheckCircle2 aria-hidden />}>{hecho.nuevos} socios nuevos y {hecho.actualizados} actualizados. Ahora agrega a la familia desde la ficha de cada socio.</Aviso>
            <Boton tam="lg" icono={<KeyRound aria-hidden />} cargando={trabajando} onClick={crearAccesos}>Crear accesos a la app y descargar los PIN</Boton>
            <p className="small muted">Se crea un PIN temporal para cada socio con DNI. Entrégalo en persona: al entrar, el socio lo cambia por uno propio.</p>
          </div>
        </Tarjeta>
      )}
    </div>
  )
}

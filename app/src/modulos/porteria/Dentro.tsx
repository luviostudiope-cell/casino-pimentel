import { useMemo, useState } from 'react'
import { LogOut, Users } from 'lucide-react'
import { rpc, supabase } from '../../lib/supabase'
import { ok, useDatos, useEnVivo } from '../../lib/datos'
import { hora, hoyLima, moneda, monedaCorta, numero } from '../../lib/formato'
import { Boton, Buscador, Chips, EjemploTag, EsqueletoLista, Indicador, PillEstado, Vacio, useToast } from '../../ui'

interface Fila {
  id: string; hora: string; persona: 'miembro' | 'invitado'; tipo_ingreso: string; monto: number; medio_pago: string | null; ticket: number | null; estado: 'dentro' | 'salio'; con_deuda: boolean; es_ejemplo: boolean
  miembros: { nombres: string; apellidos: string; parentesco: string } | null
  invitados: { nombres: string; dni: string } | null
  socios: { numero: string; apellidos: string } | null
}

export default function Dentro() {
  const avisar = useToast()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'dentro' | 'todos' | 'invitados'>('dentro')
  const { datos, cargando, recargar } = useDatos(async () => ok(await supabase.from('ingresos')
    .select('id, hora, persona, tipo_ingreso, monto, medio_pago, ticket, estado, con_deuda, es_ejemplo, miembros(nombres, apellidos, parentesco), invitados(nombres, dni), socios(numero, apellidos)')
    .eq('fecha', hoyLima()).in('estado', ['dentro', 'salio']).order('hora', { ascending: false }).limit(500)) as unknown as Fila[], [])
  useEnVivo(['ingresos'], () => recargar(true))

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (datos ?? []).filter((f) => (filtro === 'dentro' ? f.estado === 'dentro' : filtro === 'invitados' ? f.persona === 'invitado' : true))
      .filter((f) => !t || `${f.miembros?.nombres ?? ''} ${f.miembros?.apellidos ?? ''} ${f.invitados?.nombres ?? ''} ${f.invitados?.dni ?? ''} ${f.socios?.numero ?? ''} ${f.ticket ?? ''}`.toLowerCase().includes(t))
  }, [datos, q, filtro])
  const dentro = (datos ?? []).filter((f) => f.estado === 'dentro').length
  const invitados = (datos ?? []).filter((f) => f.persona === 'invitado').length
  const cobrado = (datos ?? []).reduce((s, f) => s + Number(f.monto), 0)

  const salida = async (id: string) => {
    try { const r = await rpc<{ ok: boolean; mensaje: string }>('registrar_salida', { p_ingreso_id: id }); avisar(r.mensaje, r.ok ? 'ok' : 'alerta'); recargar(true) }
    catch (e) { avisar((e as Error).message, 'error') }
  }

  return (
    <div className="stack" style={{ ['--gap' as string]: '20px', maxWidth: 1100, marginInline: 'auto' }}>
      <div>
        <h1 className="page-title">Dentro del club hoy</h1>
        <p className="page-lead">Quién entró, a qué hora y lo cobrado. Se actualiza solo.</p>
      </div>
      <div className="grid-auto" style={{ ['--min' as string]: '200px' }}>
        <Indicador etiqueta="Dentro ahora" valor={dentro} icono={<Users aria-hidden />} destacado />
        <Indicador etiqueta="Ingresos de hoy" valor={datos?.length ?? 0} nota={`${numero(invitados)} invitados`} />
        <Indicador etiqueta="Cobrado hoy" valor={cobrado} formato={moneda} />
      </div>
      <div className="row wrap">
        <div className="grow" style={{ minWidth: 260 }}><Buscador valor={q} onCambio={setQ} placeholder="Nombre, DNI, N° de socio o ticket" /></div>
        <Chips etiqueta="Mostrar" valor={filtro} onCambio={setFiltro} opciones={[{ valor: 'dentro', etiqueta: 'Dentro', cuenta: dentro }, { valor: 'invitados', etiqueta: 'Invitados', cuenta: invitados }, { valor: 'todos', etiqueta: 'Todos', cuenta: datos?.length ?? 0 }]} />
      </div>
      {cargando && !datos ? <EsqueletoLista filas={6} /> : !filas.length ? (
        <Vacio icono={<Users />} titulo={q ? 'Sin resultados' : 'Aún no hay nadie registrado'} texto={q ? 'Prueba con otro nombre o con el DNI.' : 'Cuando registres un ingreso en la pestaña Ingresos, aparecerá aquí.'} />
      ) : (
        <div className="card tabla-wrap" style={{ padding: 8 }}>
          <table className="tabla">
            <thead><tr><th>Hora</th><th>Persona</th><th>Socio</th><th>Ingreso</th><th className="num">Cobro</th><th>Estado</th><th><span className="sr-only">Acción</span></th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id}>
                  <td className="num bold">{hora(f.hora)}</td>
                  <td>
                    <div className="bold break">{f.persona === 'invitado' ? f.invitados?.nombres : `${f.miembros?.nombres} ${f.miembros?.apellidos}`}</div>
                    <div className="small muted">{f.persona === 'invitado' ? `Invitado · DNI ${f.invitados?.dni}` : f.miembros?.parentesco}{f.ticket ? ` · ticket ${f.ticket}` : ''}</div>
                  </td>
                  <td className="small">N° {f.socios?.numero}{f.con_deuda && <div><PillEstado estado="deuda" /></div>}</td>
                  <td className="small" style={{ textTransform: 'capitalize' }}>{f.tipo_ingreso}</td>
                  <td className="num">{f.monto > 0 ? `${monedaCorta(f.monto)} · ${f.medio_pago === 'cuenta_socio' ? 'a cuenta' : f.medio_pago}` : '—'}</td>
                  <td><PillEstado estado={f.estado} />{f.es_ejemplo && <div style={{ marginTop: 4 }}><EjemploTag texto="Ejemplo" /></div>}</td>
                  <td>{f.estado === 'dentro' && <Boton variante="ghost" tam="sm" icono={<LogOut aria-hidden />} onClick={() => salida(f.id)}>Salida</Boton>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

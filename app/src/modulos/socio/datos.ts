import { supabase, rpc, urlFirmada } from '../../lib/supabase'
import { ok } from '../../lib/datos'
import { hoyLima } from '../../lib/formato'
import type { Estado } from '../../ui'

export interface Miembro {
  id: string; socio_id: string; nombres: string; apellidos: string; dni: string | null
  fecha_nacimiento: string | null; parentesco: string; foto_path: string | null; puede_ingresar: boolean; es_ejemplo: boolean
}
export interface SocioFicha {
  id: string; numero: string; nombres: string; apellidos: string; estado: string; celular: string | null; correo: string | null; es_ejemplo: boolean
}
export interface EstadoCuenta { saldo: number; cuotas_vencidas: number; cuotas_pendientes: number; proximo_vencimiento: string | null; estado_cuenta: 'al_dia' | 'por_vencer' | 'deuda' }

export const PARENTESCO: Record<string, string> = { titular: 'Titular', esposa: 'Esposa', esposo: 'Esposo', hijo: 'Hijo', hija: 'Hija', otro: 'Familiar' }

export async function cargarFamilia(socioId: string) {
  const [s, m, e] = await Promise.all([
    supabase.from('socios').select('id, numero, nombres, apellidos, estado, celular, correo, es_ejemplo').eq('id', socioId).single(),
    supabase.from('miembros').select('*').eq('socio_id', socioId).is('eliminado_en', null),
    supabase.from('estado_socios').select('saldo, cuotas_vencidas, cuotas_pendientes, proximo_vencimiento, estado_cuenta').eq('socio_id', socioId).maybeSingle(),
  ])
  const orden = (p: string) => (p === 'titular' ? 0 : p === 'esposa' || p === 'esposo' ? 1 : 2)
  const miembros = (ok(m) as Miembro[]).sort((a, b) => orden(a.parentesco) - orden(b.parentesco) || (a.fecha_nacimiento ?? '').localeCompare(b.fecha_nacimiento ?? ''))
  const fotos = await Promise.all(miembros.map((x) => urlFirmada('fotos-socios', x.foto_path)))
  return {
    socio: ok(s) as SocioFicha,
    miembros: miembros.map((x, i) => ({ ...x, foto: fotos[i] })),
    cuenta: (ok(e) as EstadoCuenta | null) ?? { saldo: 0, cuotas_vencidas: 0, cuotas_pendientes: 0, proximo_vencimiento: null, estado_cuenta: 'al_dia' as const },
  }
}

export function estadoCarnet(c: EstadoCuenta): { estado: Estado; texto: string } {
  if (c.estado_cuenta === 'deuda') return { estado: 'deuda', texto: `Debes S/ ${Number(c.saldo).toLocaleString('es-PE', { maximumFractionDigits: 2 })}` }
  if (c.estado_cuenta === 'por_vencer') return { estado: 'por_vencer', texto: 'Cuota por vencer' }
  return { estado: 'al_dia', texto: 'Al día' }
}

export async function tokenCarnet(miembroId: string): Promise<string> {
  const r = await rpc<{ token: string }>('carnet_token', { p_miembro_id: miembroId })
  return r.token
}

export async function proximaReserva(socioId: string) {
  const r = await supabase.from('reservas_cancha').select('id, fecha, hora_inicio, hora_fin, canchas(nombre), miembros(nombres)')
    .eq('socio_id', socioId).eq('estado', 'confirmada').gte('fecha', hoyLima()).order('fecha').order('hora_inicio').limit(5)
  return ok(r) as unknown as { id: string; fecha: string; hora_inicio: string; hora_fin: string; canchas: { nombre: string }; miembros: { nombres: string } | null }[]
}

export async function avisos(limite = 30) {
  const r = await supabase.from('avisos').select('id, titulo, texto, foto_path, publicado_en, fijado, es_ejemplo')
    .is('eliminado_en', null).order('fijado', { ascending: false }).order('publicado_en', { ascending: false }).limit(limite)
  return ok(r) as { id: string; titulo: string; texto: string; foto_path: string | null; publicado_en: string; fijado: boolean; es_ejemplo: boolean }[]
}

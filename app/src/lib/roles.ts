export type RolStaff = 'presidente' | 'directivo' | 'admin' | 'barra' | 'porteria'
export type Rol = RolStaff | 'socio'

export interface Perfil {
  tipo: 'staff' | 'socio'
  rol: Rol
  user_id: string
  club_id: string
  club_nombre: string
  nombre: string
  socio_id: string | null
  miembro_id: string | null
  debe_cambiar_pin: boolean
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  presidente: 'Presidente',
  directivo: 'Directivo',
  admin: 'Administración',
  barra: 'Barra',
  porteria: 'Portería',
  socio: 'Socio',
}

export const esDirectiva = (r?: Rol | null) => r === 'presidente' || r === 'directivo' || r === 'admin'
export const puedeConfigurar = (r?: Rol | null) => r === 'admin'

/** Ruta de inicio según el rol */
export function inicioDeRol(r: Rol): string {
  if (esDirectiva(r)) return '/admin'
  if (r === 'barra') return '/barra'
  if (r === 'porteria') return '/porteria'
  return '/socio'
}

/** Qué módulos puede abrir cada rol */
export function puedeEntrar(r: Rol, modulo: 'admin' | 'barra' | 'porteria' | 'socio'): boolean {
  if (modulo === 'admin') return esDirectiva(r)
  if (modulo === 'barra') return r === 'barra' || esDirectiva(r)
  if (modulo === 'porteria') return r === 'porteria' || esDirectiva(r)
  return r === 'socio'
}

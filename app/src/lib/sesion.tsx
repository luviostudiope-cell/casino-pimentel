import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { funcion, rpc, supabase, supabaseConfigurado, traducirError } from './supabase'
import type { Perfil } from './roles'

interface SesionCtx {
  cargando: boolean
  sesion: Session | null
  perfil: Perfil | null
  ingresarStaff: (correo: string, clave: string) => Promise<Perfil>
  ingresarSocio: (dni: string, pin: string) => Promise<Perfil>
  salir: () => Promise<void>
  recargarPerfil: () => Promise<Perfil | null>
}

const Ctx = createContext<SesionCtx | null>(null)

export function dispositivo(): string {
  const ua = navigator.userAgent
  const tipo = /iPad|Tablet|SM-T|Tab/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Celular' : 'Computadora'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador'
  const local = localStorage.getItem('cp-dispositivo')
  return local ? `${local} (${tipo} · ${nav})` : `${tipo} · ${nav}`
}

export function SesionProveedor({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true)
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  const cargarPerfil = useCallback(async (): Promise<Perfil | null> => {
    try {
      const p = await rpc<Perfil | null>('mi_perfil')
      setPerfil(p)
      return p
    } catch {
      setPerfil(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigurado) { setCargando(false); return }
    let vivo = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      if (data.session) await cargarPerfil()
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      if (evento === 'SIGNED_OUT') setPerfil(null)
    })
    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [cargarPerfil])

  const ingresarStaff = useCallback(async (correo: string, clave: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: clave })
    if (error) {
      rpc('registrar_acceso', { p_evento: 'login', p_exito: false, p_identificador: correo.trim().toLowerCase(), p_dispositivo: dispositivo() }).catch(() => {})
      throw new Error(traducirError(error.message))
    }
    setSesion(data.session)
    const p = await cargarPerfil()
    if (!p) { await supabase.auth.signOut(); throw new Error('Tu usuario no tiene un rol asignado. Pide a administración que lo active.') }
    rpc('registrar_acceso', { p_evento: 'login', p_exito: true, p_identificador: correo.trim().toLowerCase(), p_dispositivo: dispositivo() }).catch(() => {})
    return p
  }, [cargarPerfil])

  const ingresarSocio = useCallback(async (dni: string, pin: string) => {
    const r = await funcion<{ access_token: string; refresh_token: string }>('login-socio', { dni, pin, dispositivo: dispositivo() })
    const { data, error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token })
    if (error) throw new Error(traducirError(error.message))
    setSesion(data.session)
    const p = await cargarPerfil()
    if (!p) throw new Error('No encontramos tu ficha de socio. Comunícate con administración.')
    return p
  }, [cargarPerfil])

  const salir = useCallback(async () => {
    await rpc('registrar_acceso', { p_evento: 'logout', p_exito: true, p_identificador: null, p_dispositivo: dispositivo() }).catch(() => {})
    await supabase.auth.signOut()
    setPerfil(null)
  }, [])

  const valor = useMemo(() => ({ cargando, sesion, perfil, ingresarStaff, ingresarSocio, salir, recargarPerfil: cargarPerfil }),
    [cargando, sesion, perfil, ingresarStaff, ingresarSocio, salir, cargarPerfil])
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useSesion() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSesion fuera de SesionProveedor')
  return c
}

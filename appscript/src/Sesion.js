/**
 * Ingreso, sesiones y permisos.
 * Socios: DNI + PIN de 6 números. Personal: usuario + clave.
 * Las claves y PIN se guardan como huella SHA-256 con una sal propia del sistema.
 */

const ROLES = {
  admin: 'Administración',
  directiva: 'Directiva',
  porteria: 'Portería',
  barra: 'Barra',
  socio: 'Socio',
};

const DURACION_SESION = 6 * 60 * 60; // 6 horas (máximo del caché de Apps Script)

function sal_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SAL');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SAL', s);
  }
  return s;
}

function huella_(texto) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal_() + '|' + texto, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function cache_() { return CacheService.getScriptCache(); }

/** Frena intentos repetidos: 5 fallos seguidos bloquean 5 minutos. */
function revisarIntentos_(clave) {
  const n = Number(cache_().get('intentos_' + clave) || 0);
  if (n >= 5) throw new Error('Demasiados intentos. Espera 5 minutos y vuelve a probar.');
}
function sumarIntento_(clave) {
  const n = Number(cache_().get('intentos_' + clave) || 0) + 1;
  cache_().put('intentos_' + clave, String(n), 300);
}

function crearSesion_(datos) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  cache_().put('ses_' + token, JSON.stringify(datos), DURACION_SESION);
  return token;
}

function sesion_(token) {
  if (!token) return null;
  const s = cache_().get('ses_' + token);
  if (!s) return null;
  cache_().put('ses_' + token, s, DURACION_SESION); // renueva al usarla
  const datos = JSON.parse(s);
  datos.token = token;
  return datos;
}

function ingresar_(d) {
  if (d.modo === 'socio') {
    const dni = String(d.dni || '').replace(/\D/g, '');
    const pin = String(d.pin || '').replace(/\D/g, '');
    if (dni.length !== 8) throw new Error('Escribe tu DNI completo: son 8 números.');
    if (pin.length !== 6) throw new Error('El PIN tiene 6 números.');
    revisarIntentos_('dni_' + dni);
    const s = leer_('Socios').find(function (x) { return x.dni === dni; });
    if (!s || s.pin_hash !== huella_('pin|' + pin)) {
      sumarIntento_('dni_' + dni);
      throw new Error('El DNI o el PIN no coinciden. Revisa e intenta otra vez.');
    }
    if (s.estado === 'retirado') throw new Error('Este socio ya no está activo. Consulta en administración.');
    const ses = { tipo: 'socio', id: s.id, rol: 'socio', nombre: s.nombres.split(' ')[0], nombreCompleto: s.nombres + ' ' + s.apellidos };
    return { token: crearSesion_(ses), perfil: perfilPublico_(ses, s) };
  }
  const usuario = String(d.usuario || '').trim().toLowerCase();
  const clave = String(d.clave || '');
  if (!usuario || !clave) throw new Error('Escribe tu usuario y tu clave.');
  revisarIntentos_('usr_' + usuario);
  const u = leer_('Usuarios').find(function (x) { return x.usuario === usuario && x.activo; });
  if (!u || u.clave_hash !== huella_('clave|' + clave)) {
    sumarIntento_('usr_' + usuario);
    throw new Error('El usuario o la clave no coinciden. Revisa e intenta otra vez.');
  }
  const ses = { tipo: 'personal', id: u.id, rol: u.rol, nombre: u.nombre, usuario: u.usuario };
  return { token: crearSesion_(ses), perfil: perfilPublico_(ses) };
}

function perfilPublico_(ses, socio) {
  const c = config_();
  const p = { rol: ses.rol, rolNombre: ROLES[ses.rol], nombre: ses.nombre, tipo: ses.tipo, ejemplo: c.datos_de_ejemplo === 'SI', club: c.club_nombre };
  if (ses.tipo === 'socio') {
    const s = socio || buscarPorId_('Socios', ses.id);
    p.debeCambiarPin = Boolean(s && s.debe_cambiar_pin);
    p.nombreCompleto = ses.nombreCompleto;
  }
  return p;
}

function salir_(d, ses) {
  cache_().remove('ses_' + ses.token);
  return true;
}

function miPerfil_(d, ses) {
  return perfilPublico_(ses);
}

function esPinFacil_(pin) {
  return /^(\d)\1+$/.test(pin) || '0123456789'.indexOf(pin) >= 0 || '9876543210'.indexOf(pin) >= 0;
}

function cambiarPin_(d, ses) {
  const pin = String(d.pin || '').replace(/\D/g, '');
  if (pin.length !== 6) throw new Error('El PIN tiene 6 números.');
  if (esPinFacil_(pin)) throw new Error('Ese PIN es muy fácil de adivinar. Elige otro.');
  actualizar_('Socios', ses.id, { pin_hash: huella_('pin|' + pin), debe_cambiar_pin: false });
  anotar_(ses, 'Cambió su PIN', '');
  return true;
}

function cambiarClave_(d, ses) {
  const actual = String(d.actual || '');
  const nueva = String(d.nueva || '');
  const u = buscarPorId_('Usuarios', ses.id);
  if (!u || u.clave_hash !== huella_('clave|' + actual)) throw new Error('La clave actual no es correcta.');
  if (nueva.length < 8) throw new Error('La clave nueva necesita al menos 8 caracteres.');
  actualizar_('Usuarios', ses.id, { clave_hash: huella_('clave|' + nueva) });
  anotar_(ses, 'Cambió su clave', '');
  return true;
}

/** Registro de quién hizo qué (hoja Bitacora). */
function anotar_(ses, accion, detalle) {
  insertar_('Bitacora', { fecha: hoy_(), hora: horaAhora_(), usuario: ses ? (ses.usuario || ses.nombreCompleto || ses.nombre) : 'sistema', accion: accion, detalle: detalle || '' });
}

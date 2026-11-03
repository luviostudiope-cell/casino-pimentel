/**
 * Acciones que llama la pantalla con google.script.run.api(accion, token, datos).
 * Cada acción vive en una función privada (termina en "_") para que nadie la llame sin pasar por aquí.
 */

const R_DIRECCION = ['admin', 'directiva'];
const R_PUERTA = ['porteria', 'admin', 'directiva'];

const ACCIONES = {
  estadoPublico: { publico: true },
  ingresar: { publico: true },
  salir: {},
  miPerfil: {},
  cambiarPin: { roles: ['socio'], escribe: true },
  cambiarClave: { roles: ['admin', 'directiva', 'porteria', 'barra'], escribe: true },
  resumenInicio: { roles: R_DIRECCION },
  porteriaHoy: { roles: R_PUERTA },
  buscarSocios: { roles: ['porteria', 'admin', 'directiva', 'barra'] },
  registrarIngreso: { roles: ['porteria', 'admin'], escribe: true },
  registrarInvitado: { roles: ['porteria', 'admin'], escribe: true },
  registrarSalida: { roles: ['porteria', 'admin'], escribe: true },
  marcarAsistencia: { roles: ['porteria', 'admin'], escribe: true },
  asistenciaHoy: { roles: R_PUERTA },
  listarSocios: { roles: R_DIRECCION },
  verSocio: { roles: R_DIRECCION },
  guardarSocio: { roles: ['admin'], escribe: true },
  cambiarEstadoSocio: { roles: ['admin'], escribe: true },
  registrarPago: { roles: ['admin'], escribe: true },
  cobrarConsumos: { roles: ['admin'], escribe: true },
  generarCuotas: { roles: ['admin'], escribe: true },
  reiniciarPinSocio: { roles: ['admin'], escribe: true },
  barraHoy: { roles: ['barra', 'admin', 'directiva'] },
  registrarVenta: { roles: ['barra', 'admin'], escribe: true },
  anularVenta: { roles: ['admin'], escribe: true },
  ingresarStock: { roles: ['barra', 'admin'], escribe: true },
  guardarProducto: { roles: ['admin'], escribe: true },
  cajaDia: { roles: R_DIRECCION },
  historial: { roles: R_DIRECCION },
  registrarMovimiento: { roles: ['admin'], escribe: true },
  cerrarCaja: { roles: ['admin'], escribe: true },
  personalResumen: { roles: R_DIRECCION },
  guardarTrabajador: { roles: ['admin'], escribe: true },
  reservasDia: { roles: ['admin', 'directiva', 'porteria', 'socio'] },
  reservar: { roles: ['admin', 'porteria', 'socio'], escribe: true },
  cancelarReserva: { roles: ['admin', 'porteria', 'socio'], escribe: true },
  listarAlquileres: { roles: R_DIRECCION },
  guardarAlquiler: { roles: ['admin'], escribe: true },
  cambiarEstadoAlquiler: { roles: ['admin'], escribe: true },
  listarAvisos: { roles: R_DIRECCION },
  guardarAviso: { roles: ['admin'], escribe: true },
  miCuenta: { roles: ['socio'] },
  ajustes: { roles: ['admin'] },
  guardarAjustes: { roles: ['admin'], escribe: true },
  cambiarClaveUsuario: { roles: ['admin'], escribe: true },
  reiniciarDatosEjemplo: { roles: ['admin'], escribe: true },
};

function api(accion, token, datos) {
  try {
    const def = ACCIONES[accion];
    if (!def) throw new Error('Acción no válida.');
    asegurarInstalacion_();
    let ses = null;
    if (!def.publico) {
      ses = sesion_(token);
      if (!ses) return { ok: false, sinSesion: true, error: 'Tu sesión terminó. Vuelve a ingresar.' };
      if (def.roles && def.roles.indexOf(ses.rol) < 0) throw new Error('No tienes permiso para hacer esto.');
    }
    const global = (typeof globalThis !== 'undefined') ? globalThis : this;
    const fn = global[accion + '_'];
    let res;
    if (def.escribe) {
      const candado = LockService.getScriptLock();
      if (!candado.tryLock(20000)) throw new Error('El sistema está ocupado. Intenta de nuevo en unos segundos.');
      try {
        res = fn(datos || {}, ses);
        SpreadsheetApp.flush();
      } finally {
        candado.releaseLock();
      }
    } else {
      res = fn(datos || {}, ses);
    }
    return { ok: true, datos: JSON.parse(JSON.stringify(res === undefined ? null : res)) };
  } catch (e) {
    console.error(accion, e && e.stack ? e.stack : e);
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    _tablas = {};
  }
}

// Sube este número cuando cambien las tablas o los datos de ejemplo: al publicar, el sistema se actualiza solo.
const VERSION_DATOS = '2';

function asegurarInstalacion_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('INSTALADO') && props.getProperty('VERSION_DATOS') === VERSION_DATOS) return;
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    if (!props.getProperty('INSTALADO')) {
      instalar_();
      props.setProperty('INSTALADO', new Date().toISOString());
    } else if (props.getProperty('VERSION_DATOS') !== VERSION_DATOS) {
      actualizarEsquema_();
      if (config_().datos_de_ejemplo === 'SI') {
        Object.keys(TABLAS).forEach(function (t) { if (t !== 'Config') vaciar_(t); });
        cargarEjemplo_();
      }
    }
    props.setProperty('VERSION_DATOS', VERSION_DATOS);
  } finally {
    candado.releaseLock();
  }
}

/** Pone al día los encabezados de las hojas y agrega las reglas nuevas a Config. */
function actualizarEsquema_() {
  Object.keys(TABLAS).forEach(function (t) {
    const cols = TABLAS[t];
    const h = hoja_(t);
    const actual = h.getRange(1, 1, 1, cols.length).getValues()[0];
    if (actual.join('|') !== cols.join('|')) {
      h.getRange(1, 1, h.getMaxRows(), cols.length).setNumberFormat('@');
      h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#EAF4FB');
    }
  });
  const existentes = leer_('Config').map(function (f) { return f.clave; });
  insertarVarios_('Config', CONFIG_POR_DEFECTO.filter(function (f) { return existentes.indexOf(f[0]) < 0; })
    .map(function (f) { return { clave: f[0], valor: f[1], descripcion: f[2] }; }));
}

// ---------- Utilidades comunes ----------

const MEDIOS = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', transferencia: 'Transferencia', cuenta: 'A la cuenta del socio' };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function quien_(ses) { return ses ? (ses.usuario || ses.nombre) : 'sistema'; }
function nombreSocio_(s) { return s ? s.nombres + ' ' + s.apellidos : '—'; }
function mesLegible_(periodo) {
  const p = String(periodo).split('-');
  return MESES[Number(p[1]) - 1] + ' ' + p[0];
}
function validarMedio_(medio, permitirCuenta) {
  if (!MEDIOS[medio] || (medio === 'cuenta' && !permitirCuenta)) throw new Error('Elige cómo pagó: efectivo, Yape, Plin, tarjeta o transferencia.');
  return medio;
}
function validarMonto_(monto, etiqueta) {
  const n = Math.round(Number(monto) * 100) / 100;
  if (!(n > 0)) throw new Error('Escribe ' + (etiqueta || 'un monto') + ' mayor a cero.');
  if (n > 100000) throw new Error('El monto parece demasiado alto. Revísalo.');
  return n;
}
function sinTildes_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function mapaPorId_(lista) { const m = {}; lista.forEach(function (x) { m[x.id] = x; }); return m; }
function sumar_(lista, campo) { return lista.reduce(function (a, x) { return a + (Number(x[campo]) || 0); }, 0); }
function redondear_(n) { return Math.round(n * 100) / 100; }

function estadoPublico_() {
  const c = config_();
  return { club: c.club_nombre, ejemplo: c.datos_de_ejemplo === 'SI' };
}

// ---------- Estado de cuenta de socios ----------

function cuotasPorSocio_() {
  const m = {};
  leer_('Cuotas').forEach(function (c) {
    if (c.estado === 'anulada') return;
    (m[c.socio_id] = m[c.socio_id] || []).push(c);
  });
  return m;
}

function cuentaDe_(lista, hoy) {
  let vencidas = 0, deudaVencida = 0, pendientes = 0, porPagar = 0, proxima = null;
  (lista || []).forEach(function (c) {
    if (c.estado !== 'pendiente') return;
    pendientes++;
    porPagar += c.monto;
    if (c.vence < hoy) { vencidas++; deudaVencida += c.monto; }
    else if (!proxima || c.vence < proxima.vence) proxima = c;
  });
  return { vencidas: vencidas, deudaVencida: deudaVencida, pendientes: pendientes, porPagar: porPagar, alDia: vencidas === 0, proximaVence: proxima ? proxima.vence : null };
}

function resumenSocio_(s, cuenta) {
  return {
    id: s.id, codigo: s.codigo, dni: s.dni, nombre: nombreSocio_(s), nombres: s.nombres, apellidos: s.apellidos,
    celular: s.celular, correo: s.correo, estado: s.estado, categoria: s.categoria, cuenta: cuenta,
    familiares: s.familiares || [], ejemplo: s.es_ejemplo,
  };
}

// ---------- Inicio (administración y directiva) ----------

function resumenInicio_() {
  const hoy = hoy_();
  const c = config_();
  const ingresos = leer_('Ingresos');
  const ingHoy = ingresos.filter(function (i) { return i.fecha === hoy; });
  const ventas = leer_('Ventas').filter(function (v) { return v.estado !== 'anulada'; });
  const ventasHoy = ventas.filter(function (v) { return v.fecha === hoy; });
  const caja = leer_('Caja').filter(function (m) { return m.fecha === hoy; });
  const entra = sumar_(caja.filter(function (m) { return m.tipo === 'ingreso'; }), 'monto');
  const sale = sumar_(caja.filter(function (m) { return m.tipo === 'egreso'; }), 'monto');

  const socios = leer_('Socios').filter(function (s) { return s.estado !== 'retirado'; });
  const cps = cuotasPorSocio_();
  let alDia = 0, deuda = 0, morosos = 0;
  socios.forEach(function (s) {
    const cu = cuentaDe_(cps[s.id], hoy);
    if (cu.alDia) alDia++;
    deuda += cu.deudaVencida;
    if (cu.vencidas >= 2) morosos++;
  });

  const stockBajo = leer_('Productos').filter(function (p) { return p.activo && p.stock_minimo >= 0 && p.stock <= p.stock_minimo; })
    .map(function (p) { return { nombre: p.nombre, stock: p.stock, minimo: p.stock_minimo }; });
  const asistencia = asistenciaHoy_();
  const noMarcaron = asistencia.personal.filter(function (p) { return p.estado === 'no_marco'; });
  const hasta = fechaMas_(hoy, 14);
  const alquileres = leer_('Alquileres').filter(function (a) { return a.estado !== 'cancelado' && a.fecha >= hoy && a.fecha <= hasta; })
    .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });

  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const f = fechaMas_(hoy, -i);
    dias.push({
      fecha: f,
      ventas: redondear_(sumar_(ventas.filter(function (v) { return v.fecha === f; }), 'total')),
      ingresos: ingresos.filter(function (x) { return x.fecha === f; }).length,
    });
  }
  const mes = hoy.slice(0, 7);
  const cobradoMes = sumar_(leer_('Pagos').filter(function (p) { return p.fecha.slice(0, 7) === mes; }), 'monto');
  const aCuenta = leer_('Ventas').filter(function (v) { return v.estado === 'a_cuenta'; });
  const sociosACuenta = {};
  aCuenta.forEach(function (v) { sociosACuenta[v.socio_id] = 1; });

  return {
    hoy: hoy,
    dentro: ingHoy.filter(function (i) { return !i.salida; }).length,
    ingresosHoy: ingHoy.length,
    invitadosHoy: ingHoy.filter(function (i) { return i.tipo === 'invitado'; }).length,
    ventasHoy: { total: redondear_(sumar_(ventasHoy, 'total')), cantidad: ventasHoy.length },
    caja: { ingresos: redondear_(entra), egresos: redondear_(sale), saldo: redondear_(entra - sale) },
    socios: { total: socios.length, alDia: alDia, deuda: redondear_(deuda), morosos: morosos },
    cobradoMes: redondear_(cobradoMes),
    consumosACuenta: { total: redondear_(sumar_(aCuenta, 'total')), socios: Object.keys(sociosACuenta).length },
    stockBajo: stockBajo,
    noMarcaron: noMarcaron.map(function (p) { return { nombre: p.nombre, horario: p.horario }; }),
    presentes: asistencia.personal.filter(function (p) { return p.estado === 'presente'; }).length,
    alquileres: alquileres.slice(0, 5).map(function (a) { return { fecha: a.fecha, ambiente: a.ambiente, cliente: a.cliente, saldo: redondear_(a.monto - a.adelanto), estado: a.estado }; }),
    dias: dias,
    movimientos: caja.sort(function (a, b) { return a.hora < b.hora ? 1 : -1; }).slice(0, 6)
      .map(function (m) { return { hora: m.hora, tipo: m.tipo, concepto: m.concepto, monto: m.monto, medio: MEDIOS[m.medio] || m.medio }; }),
    ejemplo: c.datos_de_ejemplo === 'SI',
  };
}

// ---------- Portería ----------

function porteriaHoy_() {
  const hoy = hoy_();
  const c = config_();
  const socios = mapaPorId_(leer_('Socios'));
  const ing = leer_('Ingresos').filter(function (i) { return i.fecha === hoy; })
    .sort(function (a, b) { return a.hora < b.hora ? 1 : -1; });
  return {
    hoy: hoy,
    dentro: ing.filter(function (i) { return !i.salida; }).length,
    total: ing.length,
    invitados: ing.filter(function (i) { return i.tipo === 'invitado'; }).length,
    tarifas: { club: Number(c.tarifa_invitado_club), piscina: Number(c.tarifa_invitado_piscina), comedor: Number(c.tarifa_invitado_comedor) || 0 },
    bloquearMorosos: c.bloquear_morosos === 'SI',
    ingresos: ing.map(function (i) {
      const s = socios[i.socio_id];
      return {
        id: i.id, hora: i.hora, tipo: i.tipo, salida: i.salida, tarifa: i.tarifa,
        nombre: i.tipo === 'socio' ? nombreSocio_(s) : i.nombre,
        detalle: i.tipo === 'socio' ? 'Socio ' + (s ? s.codigo : '') : (i.tipo === 'familiar' ? 'Familiar de ' : 'Invitado de ') + nombreSocio_(s),
      };
    }),
  };
}

function buscarSocios_(d) {
  const q = String(d.q || '').trim();
  if (q.length < 2) return [];
  let lista = leer_('Socios').filter(function (s) { return s.estado !== 'retirado'; });
  const carnet = q.match(/^CP[:\-\s]?(\d{1,6})/i);
  if (carnet) {
    const cod = ('0000' + carnet[1]).slice(-4);
    lista = lista.filter(function (s) { return s.codigo === cod; });
  } else if (/^\d+$/.test(q)) {
    const cod = q.length <= 4 ? ('0000' + q).slice(-4) : null;
    lista = lista.filter(function (s) { return s.dni.indexOf(q) === 0 || s.codigo === cod; });
  } else {
    const partes = sinTildes_(q).split(/\s+/);
    lista = lista.filter(function (s) {
      const t = sinTildes_(s.nombres + ' ' + s.apellidos);
      return partes.every(function (p) { return t.indexOf(p) >= 0; });
    });
  }
  const hoy = hoy_();
  const cps = cuotasPorSocio_();
  const ingHoy = leer_('Ingresos').filter(function (i) { return i.fecha === hoy; });
  return lista.slice(0, 10).map(function (s) {
    const r = resumenSocio_(s, cuentaDe_(cps[s.id], hoy));
    const dentro = ingHoy.find(function (i) { return i.socio_id === s.id && i.tipo === 'socio' && !i.salida; });
    r.dentroDesde = dentro ? dentro.hora : null;
    r.invitadosHoy = ingHoy.filter(function (i) { return i.socio_id === s.id && i.tipo === 'invitado'; }).length;
    r.familiaresDentro = ingHoy.filter(function (i) { return i.socio_id === s.id && i.tipo === 'familiar' && !i.salida; })
      .map(function (i) { return i.nombre; });
    return r;
  });
}

function registrarIngreso_(d, ses) {
  const s = buscarPorId_('Socios', d.socio_id);
  if (!s || s.estado === 'retirado') throw new Error('No se encontró al socio.');
  if (s.estado === 'suspendido') throw new Error('Este socio está suspendido. Debe pasar por administración.');
  const hoy = hoy_();
  const cuenta = cuentaDe_(cuotasPorSocio_()[s.id], hoy);
  if (config_().bloquear_morosos === 'SI' && cuenta.vencidas > 0) {
    throw new Error('Tiene ' + cuenta.vencidas + ' cuota(s) vencida(s). Debe pasar por administración antes de entrar.');
  }
  const familiar = d.familiar ? String(d.familiar) : '';
  if (familiar && !(s.familiares || []).some(function (f) { return f.nombre === familiar; })) throw new Error('Ese familiar no está registrado.');
  const tipo = familiar ? 'familiar' : 'socio';
  const ya = leer_('Ingresos').find(function (i) {
    return i.fecha === hoy && i.socio_id === s.id && i.tipo === tipo && (tipo === 'socio' || i.nombre === familiar) && !i.salida;
  });
  if (ya) throw new Error((familiar || nombreSocio_(s)) + ' ya está dentro desde las ' + ya.hora + '.');
  const ing = insertar_('Ingresos', {
    fecha: hoy, hora: horaAhora_(), tipo: tipo, socio_id: s.id, nombre: familiar, dni: '', tarifa: 0, medio: '', salida: '',
    registrado_por: quien_(ses), es_ejemplo: false,
  });
  return {
    hora: ing.hora,
    nombre: familiar || nombreSocio_(s),
    aviso: cuenta.vencidas > 0 ? 'Tiene ' + cuenta.vencidas + ' cuota(s) vencida(s) por S/ ' + cuenta.deudaVencida + '. Pídele que pase por administración.' : null,
  };
}

function registrarInvitado_(d, ses) {
  const s = buscarPorId_('Socios', d.socio_id);
  if (!s || s.estado !== 'activo') throw new Error('El socio anfitrión no está activo.');
  const nombre = String(d.nombre || '').trim().replace(/\s+/g, ' ');
  const dni = String(d.dni || '').replace(/\D/g, '');
  if (nombre.length < 5 || nombre.indexOf(' ') < 0) throw new Error('Escribe el nombre y apellido del invitado.');
  if (dni.length !== 8) throw new Error('El DNI del invitado tiene 8 números.');
  const c = config_();
  const hoy = hoy_();
  const todos = leer_('Ingresos').filter(function (i) { return i.tipo === 'invitado'; });
  const deHoy = todos.filter(function (i) { return i.fecha === hoy && i.socio_id === s.id; }).length;
  if (deHoy >= Number(c.max_invitados_dia)) throw new Error('Este socio ya trajo ' + deHoy + ' invitados hoy. El máximo es ' + c.max_invitados_dia + '.');
  const mes = hoy.slice(0, 7);
  const visitas = todos.filter(function (i) { return i.dni === dni && i.fecha.slice(0, 7) === mes; }).length;
  if (visitas >= Number(c.max_visitas_invitado_mes)) throw new Error('Este invitado ya vino ' + visitas + ' veces este mes. El máximo es ' + c.max_visitas_invitado_mes + '.');
  const tipoTarifa = ['club', 'piscina', 'comedor'].indexOf(d.tarifa) >= 0 ? d.tarifa : 'club';
  const monto = Number(c['tarifa_invitado_' + tipoTarifa]) || 0;
  const medio = monto > 0 ? validarMedio_(d.medio) : '';
  const hora = horaAhora_();
  const ing = insertar_('Ingresos', {
    fecha: hoy, hora: hora, tipo: 'invitado', socio_id: s.id, nombre: nombre, dni: dni, tarifa: monto, medio: medio, salida: '',
    registrado_por: quien_(ses), es_ejemplo: false,
  });
  if (monto > 0) {
    insertar_('Caja', {
      fecha: hoy, hora: hora, tipo: 'ingreso', origen: 'invitados', concepto: 'Invitado (' + tipoTarifa + ') de ' + nombreSocio_(s) + ': ' + nombre,
      monto: monto, medio: medio, referencia: ing.id, registrado_por: quien_(ses), es_ejemplo: false,
    });
  }
  return { fecha: hoy, hora: hora, monto: monto, nombre: nombre, dni: dni, anfitrion: nombreSocio_(s), codigo: s.codigo, entrada: tipoTarifa, medio: MEDIOS[medio] || '', atendido: quien_(ses) };
}

function registrarSalida_(d) {
  const i = buscarPorId_('Ingresos', d.id);
  if (!i) throw new Error('No se encontró el ingreso.');
  if (i.salida) throw new Error('Ya se marcó su salida a las ' + i.salida + '.');
  actualizar_('Ingresos', i.id, { salida: horaAhora_() });
  return true;
}

function marcarAsistencia_(d, ses) {
  const pin = String(d.pin || '').replace(/\D/g, '');
  if (pin.length !== 4) throw new Error('El PIN del personal tiene 4 números.');
  revisarIntentos_('asistencia');
  const huella = huella_('pinp|' + pin);
  const p = leer_('Personal').find(function (x) { return x.activo && x.pin_hash === huella; });
  if (!p) { sumarIntento_('asistencia'); throw new Error('PIN no reconocido. Vuelve a intentarlo.'); }
  const hoy = hoy_();
  const ahora = horaAhora_();
  const nombre = p.nombres.split(' ')[0] + ' ' + p.apellidos.split(' ')[0];
  const a = leer_('Asistencia').find(function (x) { return x.fecha === hoy && x.personal_id === p.id; });
  if (!a) {
    const tarde = minutos_(ahora) - minutos_(p.hora_entrada);
    const tardanza = tarde > configNum_('tolerancia_tardanza') ? tarde : 0;
    insertar_('Asistencia', { fecha: hoy, personal_id: p.id, entrada: ahora, salida: '', tardanza_min: tardanza, es_ejemplo: false });
    return { tipo: 'entrada', nombre: nombre, hora: ahora, tardanza: tardanza };
  }
  if (!a.salida) {
    if (minutos_(ahora) - minutos_(a.entrada) < 2) throw new Error(nombre + ', ya marcaste tu entrada a las ' + a.entrada + '.');
    actualizar_('Asistencia', a.id, { salida: ahora });
    return { tipo: 'salida', nombre: nombre, hora: ahora, tardanza: 0 };
  }
  throw new Error(nombre + ', hoy ya marcaste entrada (' + a.entrada + ') y salida (' + a.salida + ').');
}

function asistenciaHoy_() {
  const hoy = hoy_();
  const ahora = minutos_(horaAhora_());
  const tol = configNum_('tolerancia_tardanza');
  const asis = leer_('Asistencia').filter(function (a) { return a.fecha === hoy; });
  const personal = leer_('Personal').filter(function (p) { return p.activo; })
    .sort(function (a, b) { return a.hora_entrada < b.hora_entrada ? -1 : a.hora_entrada > b.hora_entrada ? 1 : (a.nombres < b.nombres ? -1 : 1); })
    .map(function (p) {
      const a = asis.find(function (x) { return x.personal_id === p.id; });
      let estado = 'por_llegar';
      if (a && a.salida) estado = 'salio';
      else if (a) estado = 'presente';
      else if (ahora > minutos_(p.hora_entrada) + tol) estado = 'no_marco';
      return {
        id: p.id, nombre: p.nombres + ' ' + p.apellidos, cargo: p.cargo, area: p.area, horario: p.hora_entrada + ' a ' + p.hora_salida,
        entrada: a ? a.entrada : '', salida: a ? a.salida : '', tardanza: a ? a.tardanza_min : 0, estado: estado,
      };
    });
  return { hoy: hoy, personal: personal };
}

// ---------- Socios ----------

function listarSocios_() {
  const hoy = hoy_();
  const cps = cuotasPorSocio_();
  const socios = leer_('Socios').filter(function (s) { return s.estado !== 'retirado'; })
    .sort(function (a, b) { return sinTildes_(a.apellidos) < sinTildes_(b.apellidos) ? -1 : 1; })
    .map(function (s) { return resumenSocio_(s, cuentaDe_(cps[s.id], hoy)); });
  const periodo = hoy.slice(0, 7);
  const tieneMes = leer_('Cuotas').some(function (c) { return c.periodo === periodo; });
  return {
    socios: socios,
    total: socios.length,
    alDia: socios.filter(function (s) { return s.cuenta.alDia; }).length,
    deuda: redondear_(socios.reduce(function (a, s) { return a + s.cuenta.deudaVencida; }, 0)),
    periodo: periodo, periodoLegible: mesLegible_(periodo), cuotasDelMesCreadas: tieneMes,
    cuota: configNum_('cuota_mensual'),
  };
}

function verSocio_(d) {
  const s = buscarPorId_('Socios', d.id);
  if (!s) throw new Error('No se encontró al socio.');
  const hoy = hoy_();
  const cuotas = leer_('Cuotas').filter(function (c) { return c.socio_id === s.id && c.estado !== 'anulada'; })
    .sort(function (a, b) { return a.periodo < b.periodo ? 1 : -1; })
    .map(function (c) { return { id: c.id, periodo: c.periodo, mes: mesLegible_(c.periodo), monto: c.monto, vence: c.vence, estado: c.estado === 'pendiente' && c.vence < hoy ? 'vencida' : c.estado }; });
  const pagos = leer_('Pagos').filter(function (p) { return p.socio_id === s.id; })
    .sort(function (a, b) { return a.fecha + a.hora < b.fecha + b.hora ? 1 : -1; }).slice(0, 12)
    .map(function (p) { return { fecha: p.fecha, monto: p.monto, medio: MEDIOS[p.medio] || p.medio, periodos: (p.periodos || []).map(mesLegible_) }; });
  const ingresos = leer_('Ingresos').filter(function (i) { return i.socio_id === s.id; })
    .sort(function (a, b) { return a.fecha + a.hora < b.fecha + b.hora ? 1 : -1; }).slice(0, 8)
    .map(function (i) { return { fecha: i.fecha, hora: i.hora, tipo: i.tipo, nombre: i.nombre }; });
  const r = resumenSocio_(s, cuentaDe_(cuotasPorSocio_()[s.id], hoy));
  const consumos = leer_('Ventas').filter(function (v) { return v.socio_id === s.id && v.estado === 'a_cuenta'; })
    .sort(function (a, b) { return a.fecha + a.hora < b.fecha + b.hora ? 1 : -1; })
    .map(function (v) { return { id: v.id, numero: v.numero, fecha: v.fecha, hora: v.hora, total: v.total, resumen: (v.items || []).map(function (i) { return i.cant + '× ' + i.nombre; }).join(', ') }; });
  r.consumos = consumos;
  r.consumosTotal = redondear_(sumar_(consumos, 'total'));
  r.fecha_nacimiento = s.fecha_nacimiento;
  r.fecha_ingreso = s.fecha_ingreso;
  r.debeCambiarPin = s.debe_cambiar_pin;
  r.cuotas = cuotas;
  r.pagos = pagos;
  r.ingresos = ingresos;
  return r;
}

function leerFamiliares_(texto) {
  if (Array.isArray(texto)) return texto;
  return String(texto || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    const i = l.lastIndexOf(',');
    return i > 0 ? { nombre: l.slice(0, i).trim(), parentesco: l.slice(i + 1).trim().toLowerCase() } : { nombre: l, parentesco: 'familiar' };
  });
}

function guardarSocio_(d, ses) {
  const nombres = String(d.nombres || '').trim().replace(/\s+/g, ' ');
  const apellidos = String(d.apellidos || '').trim().replace(/\s+/g, ' ');
  const dni = String(d.dni || '').replace(/\D/g, '');
  const celular = String(d.celular || '').replace(/\D/g, '');
  const correo = String(d.correo || '').trim().toLowerCase();
  if (nombres.length < 2) throw new Error('Escribe los nombres del socio.');
  if (apellidos.length < 2) throw new Error('Escribe los apellidos del socio.');
  if (dni.length !== 8) throw new Error('El DNI tiene 8 números.');
  if (celular && celular.length !== 9) throw new Error('El celular tiene 9 números.');
  if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw new Error('Revisa el correo: parece incompleto.');
  const otro = leer_('Socios').find(function (s) { return s.dni === dni && s.id !== d.id; });
  if (otro) throw new Error('Ya existe un socio con ese DNI: ' + nombreSocio_(otro) + '.');
  const datos = {
    nombres: nombres, apellidos: apellidos, dni: dni, celular: celular, correo: correo,
    categoria: d.categoria || 'Titular', fecha_nacimiento: d.fecha_nacimiento || '', familiares: leerFamiliares_(d.familiares),
  };
  if (d.id) {
    actualizar_('Socios', d.id, datos);
    anotar_(ses, 'Editó socio', nombres + ' ' + apellidos);
    return { id: d.id };
  }
  const codigo = ('0000' + (leer_('Socios').reduce(function (m, s) { return Math.max(m, Number(s.codigo) || 0); }, 0) + 1)).slice(-4);
  const pin = dni.slice(-6);
  datos.codigo = codigo;
  datos.fecha_ingreso = d.fecha_ingreso || hoy_();
  datos.estado = 'activo';
  datos.pin_hash = huella_('pin|' + pin);
  datos.debe_cambiar_pin = true;
  datos.es_ejemplo = false;
  datos.creado = hoy_() + ' ' + horaAhora_();
  const s = insertar_('Socios', datos);
  const periodo = hoy_().slice(0, 7);
  insertar_('Cuotas', { socio_id: s.id, periodo: periodo, monto: configNum_('cuota_mensual'), vence: venceDe_(periodo), estado: 'pendiente', pago_id: '', es_ejemplo: false });
  anotar_(ses, 'Registró socio', nombres + ' ' + apellidos + ' (' + codigo + ')');
  return { id: s.id, codigo: codigo, pin: pin };
}

function cambiarEstadoSocio_(d, ses) {
  if (['activo', 'suspendido', 'retirado'].indexOf(d.estado) < 0) throw new Error('Estado no válido.');
  const s = actualizar_('Socios', d.id, { estado: d.estado });
  anotar_(ses, 'Cambió estado de socio a ' + d.estado, nombreSocio_(s));
  return true;
}

function reiniciarPinSocio_(d, ses) {
  const s = buscarPorId_('Socios', d.id);
  if (!s) throw new Error('No se encontró al socio.');
  const pin = s.dni.slice(-6);
  actualizar_('Socios', s.id, { pin_hash: huella_('pin|' + pin), debe_cambiar_pin: true });
  anotar_(ses, 'Reinició PIN de socio', nombreSocio_(s));
  return { pin: pin };
}

function venceDe_(periodo) {
  const p = periodo.split('-').map(Number);
  const anio = p[1] === 12 ? p[0] + 1 : p[0];
  const mes = p[1] === 12 ? 1 : p[1] + 1;
  return anio + '-' + ('0' + mes).slice(-2) + '-' + ('0' + configNum_('dia_vencimiento')).slice(-2);
}

function registrarPago_(d, ses) {
  const s = buscarPorId_('Socios', d.socio_id);
  if (!s) throw new Error('No se encontró al socio.');
  const ids = Array.isArray(d.cuotas) ? d.cuotas : [];
  const lista = leer_('Cuotas').filter(function (c) { return ids.indexOf(c.id) >= 0 && c.socio_id === s.id && c.estado === 'pendiente'; })
    .sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; });
  if (!lista.length) throw new Error('Elige al menos una cuota pendiente.');
  const medio = validarMedio_(d.medio);
  const total = redondear_(sumar_(lista, 'monto'));
  const hoy = hoy_();
  const hora = horaAhora_();
  const periodos = lista.map(function (c) { return c.periodo; });
  const pago = insertar_('Pagos', {
    fecha: hoy, hora: hora, socio_id: s.id, monto: total, medio: medio, periodos: periodos, nota: String(d.nota || '').slice(0, 200),
    registrado_por: quien_(ses), es_ejemplo: false,
  });
  lista.forEach(function (c) { actualizar_('Cuotas', c.id, { estado: 'pagada', pago_id: pago.id }); });
  insertar_('Caja', {
    fecha: hoy, hora: hora, tipo: 'ingreso', origen: 'cuotas', concepto: 'Cuotas de ' + nombreSocio_(s) + ': ' + periodos.map(mesLegible_).join(', '),
    monto: total, medio: medio, referencia: pago.id, registrado_por: quien_(ses), es_ejemplo: false,
  });
  anotar_(ses, 'Registró pago de cuotas', nombreSocio_(s) + ' S/ ' + total);
  return { total: total, meses: periodos.map(mesLegible_), fecha: hoy, hora: hora, socio: nombreSocio_(s), codigo: s.codigo, medio: MEDIOS[medio], numero: pago.id.slice(0, 6).toUpperCase(), atendido: quien_(ses) };
}

function cobrarConsumos_(d, ses) {
  const s = buscarPorId_('Socios', d.socio_id);
  if (!s) throw new Error('No se encontró al socio.');
  const lista = leer_('Ventas').filter(function (v) { return v.socio_id === s.id && v.estado === 'a_cuenta'; });
  if (!lista.length) throw new Error('Este socio no tiene consumos a cuenta por cobrar.');
  const medio = validarMedio_(d.medio);
  const total = redondear_(sumar_(lista, 'total'));
  const hoy = hoy_();
  const hora = horaAhora_();
  lista.forEach(function (v) { actualizar_('Ventas', v.id, { estado: 'pagada' }); });
  const numeros = lista.map(function (v) { return v.numero; }).sort(function (a, b) { return a - b; });
  insertar_('Caja', {
    fecha: hoy, hora: hora, tipo: 'ingreso', origen: 'barra', concepto: 'Consumos a cuenta de ' + nombreSocio_(s) + ' (N° ' + numeros.join(', ') + ')',
    monto: total, medio: medio, referencia: s.id, registrado_por: quien_(ses), es_ejemplo: false,
  });
  anotar_(ses, 'Cobró consumos a cuenta', nombreSocio_(s) + ' S/ ' + total);
  return {
    total: total, fecha: hoy, hora: hora, socio: nombreSocio_(s), codigo: s.codigo, medio: MEDIOS[medio], atendido: quien_(ses),
    lineas: lista.map(function (v) { return { numero: v.numero, fecha: v.fecha, total: v.total }; }),
  };
}

function generarCuotas_(d, ses) {
  const periodo = /^\d{4}-\d{2}$/.test(String(d.periodo || '')) ? d.periodo : hoy_().slice(0, 7);
  const existentes = {};
  leer_('Cuotas').forEach(function (c) { if (c.periodo === periodo) existentes[c.socio_id] = 1; });
  const monto = configNum_('cuota_mensual');
  const vence = venceDe_(periodo);
  const nuevas = leer_('Socios').filter(function (s) { return s.estado === 'activo' && !existentes[s.id]; })
    .map(function (s) { return { socio_id: s.id, periodo: periodo, monto: monto, vence: vence, estado: 'pendiente', pago_id: '', es_ejemplo: false }; });
  insertarVarios_('Cuotas', nuevas);
  anotar_(ses, 'Generó cuotas', mesLegible_(periodo) + ': ' + nuevas.length);
  return { creadas: nuevas.length, mes: mesLegible_(periodo) };
}

// ---------- Barra ----------

const CATEGORIAS_BARRA = ['Tragos de autor', 'Preparados', 'Botellas', 'Cervezas', 'Gaseosas y agua', 'Otros'];

function barraHoy_(d, ses) {
  const hoy = hoy_();
  const productos = leer_('Productos')
    .sort(function (a, b) { return CATEGORIAS_BARRA.indexOf(a.categoria) - CATEGORIAS_BARRA.indexOf(b.categoria) || a.orden - b.orden; })
    .map(function (p) {
      return { id: p.id, categoria: p.categoria, nombre: p.nombre, detalle: p.detalle, precio: p.precio, stock: p.stock, minimo: p.stock_minimo, controla: p.stock_minimo >= 0, activo: p.activo, porConfirmar: p.por_confirmar };
    });
  const socios = mapaPorId_(leer_('Socios'));
  const ventas = leer_('Ventas').filter(function (v) { return v.fecha === hoy; })
    .sort(function (a, b) { return b.numero - a.numero; });
  const validas = ventas.filter(function (v) { return v.estado !== 'anulada'; });
  const porMedio = {};
  validas.forEach(function (v) { porMedio[v.medio] = redondear_((porMedio[v.medio] || 0) + v.total); });
  return {
    hoy: hoy,
    categorias: CATEGORIAS_BARRA,
    productos: productos,
    ventas: ventas.map(function (v) {
      const s = socios[v.socio_id];
      return { id: v.id, numero: v.numero, hora: v.hora, items: v.items || [], total: v.total, medio: MEDIOS[v.medio] || v.medio, mesa: v.mesa, atendido: v.atendido_por, estado: v.estado, socio: s ? nombreSocio_(s) : '', codigo: s ? s.codigo : '' };
    }),
    total: redondear_(sumar_(validas, 'total')),
    cantidad: validas.length,
    porMedio: Object.keys(porMedio).map(function (k) { return { medio: MEDIOS[k] || k, total: porMedio[k] }; }),
    puedeAnular: ses.rol === 'admin',
  };
}

function registrarVenta_(d, ses) {
  if (!Array.isArray(d.items) || !d.items.length) throw new Error('El pedido está vacío.');
  const medio = validarMedio_(d.medio, true);
  let socio = null;
  if (medio === 'cuenta') {
    socio = buscarPorId_('Socios', d.socio_id);
    if (!socio) throw new Error('Busca y elige al socio que carga el consumo a su cuenta.');
    if (socio.estado !== 'activo') throw new Error('Ese socio no está activo; no se puede cargar a su cuenta.');
  }
  const prods = mapaPorId_(leer_('Productos'));
  let total = 0;
  const items = d.items.map(function (it) {
    const p = prods[it.id];
    if (!p || !p.activo) throw new Error('Uno de los productos ya no está disponible.');
    const cant = Math.max(1, Math.min(99, Math.floor(Number(it.cant) || 0)));
    if (p.stock_minimo >= 0 && p.stock < cant) throw new Error('No alcanza el stock de ' + p.nombre + ': quedan ' + p.stock + '.');
    total += p.precio * cant;
    return { id: p.id, nombre: p.nombre, precio: p.precio, cant: cant };
  });
  total = redondear_(total);
  const hoy = hoy_();
  const hora = horaAhora_();
  const numero = leer_('Ventas').reduce(function (m, v) { return Math.max(m, v.numero); }, 0) + 1;
  const v = insertar_('Ventas', {
    numero: numero, fecha: hoy, hora: hora, items: items, total: total, medio: medio, mesa: String(d.mesa || '').slice(0, 20),
    atendido_por: quien_(ses), estado: socio ? 'a_cuenta' : 'pagada', es_ejemplo: false, socio_id: socio ? socio.id : '',
  });
  items.forEach(function (it) {
    const p = prods[it.id];
    if (p.stock_minimo >= 0) actualizar_('Productos', p.id, { stock: p.stock - it.cant });
  });
  // Lo cargado a la cuenta del socio no entra a caja hasta que lo paga
  if (!socio) {
    insertar_('Caja', {
      fecha: hoy, hora: hora, tipo: 'ingreso', origen: 'barra', concepto: 'Venta de barra N° ' + numero, monto: total, medio: medio,
      referencia: v.id, registrado_por: quien_(ses), es_ejemplo: false,
    });
  }
  return { numero: numero, total: total, fecha: hoy, hora: hora, items: items, medio: MEDIOS[medio], mesa: v.mesa, atendido: quien_(ses), socio: socio ? nombreSocio_(socio) : '', codigo: socio ? socio.codigo : '' };
}

function anularVenta_(d, ses) {
  const v = buscarPorId_('Ventas', d.id);
  if (!v) throw new Error('No se encontró la venta.');
  if (v.estado === 'anulada') throw new Error('Esta venta ya estaba anulada.');
  if (v.medio === 'cuenta' && v.estado === 'pagada') throw new Error('Este consumo a cuenta ya se cobró al socio; no se puede anular.');
  const motivo = String(d.motivo || '').trim();
  if (motivo.length < 4) throw new Error('Escribe el motivo de la anulación.');
  actualizar_('Ventas', v.id, { estado: 'anulada' });
  const prods = mapaPorId_(leer_('Productos'));
  (v.items || []).forEach(function (it) {
    const p = prods[it.id];
    if (p && p.stock_minimo >= 0) actualizar_('Productos', p.id, { stock: p.stock + it.cant });
  });
  if (v.estado !== 'a_cuenta') {
    insertar_('Caja', {
      fecha: hoy_(), hora: horaAhora_(), tipo: 'egreso', origen: 'barra', concepto: 'Anulación de venta N° ' + v.numero + ': ' + motivo,
      monto: v.total, medio: v.medio, referencia: v.id, registrado_por: quien_(ses), es_ejemplo: false,
    });
  }
  anotar_(ses, 'Anuló venta de barra', 'N° ' + v.numero + ' · ' + motivo);
  return true;
}

function ingresarStock_(d, ses) {
  const p = buscarPorId_('Productos', d.id);
  if (!p) throw new Error('No se encontró el producto.');
  const cant = Math.floor(Number(d.cantidad) || 0);
  if (cant < 1 || cant > 999) throw new Error('Escribe una cantidad entre 1 y 999.');
  actualizar_('Productos', p.id, { stock: p.stock + cant, stock_minimo: p.stock_minimo < 0 ? 0 : p.stock_minimo });
  anotar_(ses, 'Ingresó mercadería', p.nombre + ' +' + cant);
  return { stock: p.stock };
}

function guardarProducto_(d, ses) {
  const p = buscarPorId_('Productos', d.id);
  if (!p) throw new Error('No se encontró el producto.');
  const precio = validarMonto_(d.precio, 'el precio');
  const minimo = d.controla ? Math.max(0, Math.floor(Number(d.minimo) || 0)) : -1;
  actualizar_('Productos', p.id, { precio: precio, stock_minimo: minimo, activo: Boolean(d.activo), por_confirmar: false });
  anotar_(ses, 'Editó producto', p.nombre + ' S/ ' + precio);
  return true;
}

// ---------- Caja ----------

const ORIGENES = { cuotas: 'Cuotas', barra: 'Barra', invitados: 'Invitados', alquileres: 'Alquileres', otros: 'Otros' };

function resumenCaja_(fecha) {
  const movs = leer_('Caja').filter(function (m) { return m.fecha === fecha; });
  const ingresos = movs.filter(function (m) { return m.tipo === 'ingreso'; });
  const egresos = movs.filter(function (m) { return m.tipo === 'egreso'; });
  const efectivo = sumar_(ingresos.filter(function (m) { return m.medio === 'efectivo'; }), 'monto') - sumar_(egresos.filter(function (m) { return m.medio === 'efectivo'; }), 'monto');
  return { movs: movs, ingresos: redondear_(sumar_(ingresos, 'monto')), egresos: redondear_(sumar_(egresos, 'monto')), efectivo: redondear_(efectivo) };
}

/** Todo lo que pasó en el sistema un día: acciones de la bitácora, ventas, portería y marcaciones del personal. Solo lectura. */
function historial_(d) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || '')) ? d.fecha : hoy_();
  const socios = mapaPorId_(leer_('Socios'));
  const personal = mapaPorId_(leer_('Personal'));
  const eventos = [];
  const anotar = function (hora, tipo, quien, que, detalle) { eventos.push({ hora: String(hora || ''), tipo: tipo, quien: quien || '—', que: que, detalle: detalle || '' }); };
  const monto = function (n) { return 'S/ ' + (Number(n) || 0).toFixed(2); };

  leer_('Bitacora').forEach(function (b) {
    if (b.fecha === fecha) anotar(b.hora, 'acciones', b.usuario, b.accion, b.detalle);
  });
  leer_('Ventas').forEach(function (v) {
    if (v.fecha !== fecha) return;
    const items = (v.items || []).map(function (i) { return i.cant + '× ' + i.nombre; }).join(', ');
    const que = 'Venta N° ' + v.numero + (v.medio === 'cuenta' ? ' a la cuenta de ' + nombreSocio_(socios[v.socio_id]) : '') + (v.estado === 'anulada' ? ' (anulada después)' : '');
    anotar(v.hora, 'barra', v.atendido_por, que, [items, monto(v.total), v.medio === 'cuenta' ? '' : MEDIOS[v.medio] || v.medio, v.mesa ? 'mesa ' + v.mesa : ''].filter(String).join(' · '));
  });
  leer_('Ingresos').forEach(function (i) {
    if (i.fecha !== fecha) return;
    const s = socios[i.socio_id];
    const quien = i.tipo === 'socio' ? nombreSocio_(s) : i.nombre;
    if (i.tipo === 'invitado') anotar(i.hora, 'porteria', i.registrado_por, 'Entró el invitado ' + i.nombre, 'De ' + nombreSocio_(s) + ' · ' + (Number(i.tarifa) > 0 ? monto(i.tarifa) + ' · ' + (MEDIOS[i.medio] || i.medio) : 'sin costo'));
    else if (i.tipo === 'familiar') anotar(i.hora, 'porteria', i.registrado_por, 'Entró ' + i.nombre, 'Familia de ' + nombreSocio_(s));
    else anotar(i.hora, 'porteria', i.registrado_por, 'Entró el socio ' + nombreSocio_(s), s ? 'Socio ' + s.codigo : '');
    if (i.salida) anotar(i.salida, 'porteria', 'Portería', 'Salió ' + quien, '');
  });
  leer_('Asistencia').forEach(function (a) {
    if (a.fecha !== fecha) return;
    const p = personal[a.personal_id];
    const nombre = p ? p.nombres + ' ' + p.apellidos : 'Trabajador';
    if (a.entrada) anotar(a.entrada, 'personal', nombre, 'Marcó su entrada', Number(a.tardanza_min) > 0 ? 'Llegó ' + a.tardanza_min + ' min tarde' : 'A tiempo');
    if (a.salida) anotar(a.salida, 'personal', nombre, 'Marcó su salida', '');
  });

  eventos.sort(function (a, b) { return b.hora.localeCompare(a.hora); });
  return { fecha: fecha, hoy: hoy_(), eventos: eventos };
}

function cajaDia_(d) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || '')) ? d.fecha : hoy_();
  const r = resumenCaja_(fecha);
  const porOrigen = Object.keys(ORIGENES).map(function (k) {
    const ms = r.movs.filter(function (m) { return (m.origen || 'otros') === k; });
    return {
      origen: ORIGENES[k],
      ingresos: redondear_(sumar_(ms.filter(function (m) { return m.tipo === 'ingreso'; }), 'monto')),
      egresos: redondear_(sumar_(ms.filter(function (m) { return m.tipo === 'egreso'; }), 'monto')),
    };
  });
  const porMedio = Object.keys(MEDIOS).map(function (k) {
    const ms = r.movs.filter(function (m) { return m.medio === k; });
    return { medio: MEDIOS[k], total: redondear_(sumar_(ms.filter(function (m) { return m.tipo === 'ingreso'; }), 'monto') - sumar_(ms.filter(function (m) { return m.tipo === 'egreso'; }), 'monto')) };
  }).filter(function (x) { return x.total !== 0; });
  const cierres = leer_('CierresCaja').filter(function (c) { return c.fecha === fecha; });
  return {
    fecha: fecha, hoy: hoy_(),
    ingresos: r.ingresos, egresos: r.egresos, saldo: redondear_(r.ingresos - r.egresos), efectivo: r.efectivo,
    porOrigen: porOrigen, porMedio: porMedio,
    cierre: cierres.length ? cierres[cierres.length - 1] : null,
    movimientos: r.movs.sort(function (a, b) { return a.hora < b.hora ? 1 : -1; }).map(function (m) {
      return { hora: m.hora, tipo: m.tipo, origen: ORIGENES[m.origen] || 'Otros', concepto: m.concepto, monto: m.monto, medio: MEDIOS[m.medio] || m.medio, por: m.registrado_por };
    }),
  };
}

function registrarMovimiento_(d, ses) {
  const tipo = d.tipo === 'egreso' ? 'egreso' : 'ingreso';
  const concepto = String(d.concepto || '').trim();
  if (concepto.length < 3) throw new Error('Escribe el concepto: por ejemplo "Compra de hielo".');
  const monto = validarMonto_(d.monto);
  const medio = validarMedio_(d.medio);
  const origen = ORIGENES[d.origen] ? d.origen : 'otros';
  insertar_('Caja', {
    fecha: hoy_(), hora: horaAhora_(), tipo: tipo, origen: origen, concepto: concepto.slice(0, 160), monto: monto, medio: medio,
    referencia: '', registrado_por: quien_(ses), es_ejemplo: false,
  });
  anotar_(ses, 'Registró ' + tipo + ' de caja', concepto + ' S/ ' + monto);
  return true;
}

function cerrarCaja_(d, ses) {
  const fecha = hoy_();
  const contado = Math.round(Number(d.contado) * 100) / 100;
  if (!(contado >= 0)) throw new Error('Escribe cuánto efectivo contaste.');
  const r = resumenCaja_(fecha);
  const dif = redondear_(contado - r.efectivo);
  insertar_('CierresCaja', { fecha: fecha, hora: horaAhora_(), esperado: r.efectivo, contado: contado, diferencia: dif, nota: String(d.nota || '').slice(0, 200), registrado_por: quien_(ses) });
  anotar_(ses, 'Cerró caja', 'Esperado S/ ' + r.efectivo + ' · contado S/ ' + contado);
  return { esperado: r.efectivo, contado: contado, diferencia: dif };
}

// ---------- Personal ----------

function personalResumen_() {
  const hoy = hoy_();
  const desde = fechaMas_(hoy, -6);
  const asis = leer_('Asistencia').filter(function (a) { return a.fecha >= desde && a.fecha <= hoy; });
  const deHoy = asistenciaHoy_().personal;
  const trabajadores = leer_('Personal').sort(function (a, b) { return a.area < b.area ? -1 : a.area > b.area ? 1 : (a.nombres < b.nombres ? -1 : 1); })
    .map(function (p) {
      const suyas = asis.filter(function (a) { return a.personal_id === p.id; });
      const hoyP = deHoy.find(function (x) { return x.id === p.id; });
      return {
        id: p.id, nombres: p.nombres, apellidos: p.apellidos, nombre: p.nombres + ' ' + p.apellidos, dni: p.dni, area: p.area, cargo: p.cargo,
        hora_entrada: p.hora_entrada, hora_salida: p.hora_salida, activo: p.activo,
        dias: suyas.length, tardanzas: suyas.filter(function (a) { return a.tardanza_min > 0; }).length,
        minutosTarde: sumar_(suyas, 'tardanza_min'), hoy: hoyP || null,
      };
    });
  return {
    hoy: hoy,
    presentes: deHoy.filter(function (p) { return p.estado === 'presente'; }).length,
    noMarcaron: deHoy.filter(function (p) { return p.estado === 'no_marco'; }).length,
    deHoy: deHoy,
    trabajadores: trabajadores,
  };
}

function guardarTrabajador_(d, ses) {
  const nombres = String(d.nombres || '').trim();
  const apellidos = String(d.apellidos || '').trim();
  const dni = String(d.dni || '').replace(/\D/g, '');
  if (nombres.length < 2 || apellidos.length < 2) throw new Error('Escribe nombres y apellidos.');
  if (dni.length !== 8) throw new Error('El DNI tiene 8 números.');
  if (!/^\d{2}:\d{2}$/.test(d.hora_entrada || '') || !/^\d{2}:\d{2}$/.test(d.hora_salida || '')) throw new Error('Escribe el horario como 08:00.');
  const datos = {
    nombres: nombres, apellidos: apellidos, dni: dni, area: String(d.area || 'general').toLowerCase(), cargo: String(d.cargo || '').trim(),
    hora_entrada: d.hora_entrada, hora_salida: d.hora_salida, activo: d.activo !== false,
  };
  const pin = String(d.pin || '').replace(/\D/g, '');
  if (pin) {
    if (pin.length !== 4) throw new Error('El PIN del personal tiene 4 números.');
    const huella = huella_('pinp|' + pin);
    if (leer_('Personal').some(function (p) { return p.pin_hash === huella && p.id !== d.id; })) throw new Error('Ese PIN ya lo usa otra persona. Elige otro.');
    datos.pin_hash = huella;
  } else if (!d.id) {
    throw new Error('Asigna un PIN de 4 números para que marque su asistencia.');
  }
  if (d.id) {
    actualizar_('Personal', d.id, datos);
    anotar_(ses, 'Editó trabajador', nombres + ' ' + apellidos);
    return { id: d.id };
  }
  datos.es_ejemplo = false;
  const p = insertar_('Personal', datos);
  anotar_(ses, 'Registró trabajador', nombres + ' ' + apellidos);
  return { id: p.id };
}

// ---------- Reservas de tenis ----------

// El club tiene una cancha de tenis (la única que se reserva) y una de básquet de uso libre.
const CANCHAS = ['Tenis'];

function inicioSemana_(fecha) {
  const p = fecha.split('-').map(Number);
  const dia = (new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay() + 6) % 7;
  return fechaMas_(fecha, -dia);
}
function reservasSemana_(socioId, fecha) {
  const desde = inicioSemana_(fecha), hasta = fechaMas_(desde, 6);
  return leer_('Reservas').filter(function (r) { return r.socio_id === socioId && r.estado === 'reservada' && r.fecha >= desde && r.fecha <= hasta; }).length;
}

function reservasDia_(d, ses) {
  const hoy = hoy_();
  const c = config_();
  const ant = Number(c.tenis_dias_anticipacion) || 7;
  let fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha || '')) ? d.fecha : hoy;
  if (ses.rol === 'socio' && (fecha < hoy || fecha > fechaMas_(hoy, ant))) fecha = hoy;
  const horas = [];
  for (let h = Number(c.tenis_hora_inicio); h < Number(c.tenis_hora_fin); h++) horas.push(('0' + h).slice(-2) + ':00');
  const dias = [];
  for (let i = 0; i <= ant; i++) dias.push(fechaMas_(hoy, i));
  const socios = mapaPorId_(leer_('Socios'));
  const reservas = leer_('Reservas').filter(function (r) { return r.fecha === fecha && r.estado === 'reservada'; }).map(function (r) {
    const mia = ses.rol === 'socio' && r.socio_id === ses.id;
    const s = socios[r.socio_id];
    return { id: r.id, hora: r.hora, cancha: r.cancha, mia: mia, socio: ses.rol === 'socio' ? (mia ? 'Tu reserva' : 'Ocupado') : nombreSocio_(s) };
  });
  const maxSemana = Number(c.tenis_max_semana) || 3;
  return {
    fecha: fecha, hoy: hoy, ahora: horaAhora_(), dias: dias, horas: horas, canchas: CANCHAS, reservas: reservas, puedeElegirSocio: ses.rol !== 'socio',
    maxDia: Number(c.tenis_max_dia) || 1, maxSemana: maxSemana, quedanSemana: ses.rol === 'socio' ? Math.max(0, maxSemana - reservasSemana_(ses.id, fecha)) : null,
  };
}

function reservar_(d, ses) {
  const hoy = hoy_();
  const c = config_();
  const fecha = String(d.fecha || '');
  const hora = String(d.hora || '');
  if (CANCHAS.indexOf(d.cancha) < 0) throw new Error('Elige una cancha.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy) throw new Error('Elige un día desde hoy.');
  if (fecha > fechaMas_(hoy, Number(c.tenis_dias_anticipacion))) throw new Error('Solo se puede reservar con ' + c.tenis_dias_anticipacion + ' días de anticipación.');
  if (fecha === hoy && minutos_(hora) <= minutos_(horaAhora_())) throw new Error('Esa hora ya pasó. Elige otra.');
  const socioId = ses.rol === 'socio' ? ses.id : d.socio_id;
  const s = buscarPorId_('Socios', socioId);
  if (!s) throw new Error('Elige al socio que reserva.');
  if (s.estado !== 'activo') throw new Error('El socio no está activo.');
  const todas = leer_('Reservas').filter(function (r) { return r.estado === 'reservada' && r.fecha === fecha; });
  if (todas.some(function (r) { return r.hora === hora && r.cancha === d.cancha; })) throw new Error('Ese horario ya fue tomado. Elige otro.');
  const suyas = todas.filter(function (r) { return r.socio_id === s.id; }).length;
  if (suyas >= Number(c.tenis_max_dia)) throw new Error(ses.rol === 'socio' ? 'Ya tienes una reserva ese día.' : 'Ese socio ya tiene una reserva ese día.');
  const maxSemana = Number(c.tenis_max_semana) || 3;
  if (reservasSemana_(s.id, fecha) >= maxSemana) throw new Error((ses.rol === 'socio' ? 'Ya tienes ' : 'Ese socio ya tiene ') + maxSemana + ' reservas esa semana (de lunes a domingo). El máximo es ' + maxSemana + '.');
  insertar_('Reservas', { fecha: fecha, hora: hora, cancha: d.cancha, socio_id: s.id, estado: 'reservada', creado_por: quien_(ses), es_ejemplo: false });
  return { socio: nombreSocio_(s) };
}

function cancelarReserva_(d, ses) {
  const r = buscarPorId_('Reservas', d.id);
  if (!r || r.estado !== 'reservada') throw new Error('No se encontró la reserva.');
  if (ses.rol === 'socio' && r.socio_id !== ses.id) throw new Error('Solo puedes cancelar tus reservas.');
  actualizar_('Reservas', r.id, { estado: 'cancelada' });
  return true;
}

// ---------- Alquileres de ambientes ----------

const AMBIENTES = [
  { nombre: 'Salón principal', grupo: 'salon', completo: true, tarifas: { socio: 1500, no_socio: 3000, institucion: 3500 }, garantia: 1500 },
  { nombre: 'Salón principal 1/2', grupo: 'salon', tarifas: { socio: 700 }, garantia: 0 },
  { nombre: 'Salón principal 1/3', grupo: 'salon', tarifas: { socio: 350 }, garantia: 0 },
  { nombre: 'Rincón parrillero', grupo: 'parrilla', tarifas: { socio: 400, no_socio: 700, institucion: 1000 }, garantia: 1000 },
  { nombre: 'Rincón parrillero + jardín', grupo: 'parrilla', completo: true, tarifas: { socio: 600, no_socio: 1200, institucion: 2000 }, garantia: 1500 },
  { nombre: 'Piscina', grupo: 'piscina', tarifas: { socio: 500 }, garantia: 0, nota: 'Solo temporada baja' },
  { nombre: 'Deck', grupo: 'deck', tarifas: {}, garantia: 0, nota: 'Tarifa por confirmar' },
];
const ADICIONAL_COCINA = { nombre: 'Uso de cocina (rincón parrillero)', precio: 400, grupo: 'parrilla' };
const ESTADOS_ALQUILER = ['reservado', 'confirmado', 'realizado', 'cancelado'];

function listarAlquileres_() {
  const hoy = hoy_();
  const lista = leer_('Alquileres').sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }).map(function (a) {
    return { id: a.id, fecha: a.fecha, ambiente: a.ambiente, cliente: a.cliente, tipo: a.tipo_cliente, celular: a.celular, monto: a.monto, adelanto: a.adelanto, saldo: redondear_(a.monto - a.adelanto), estado: a.estado, nota: a.nota, pasado: a.fecha < hoy };
  });
  return { hoy: hoy, alquileres: lista, ambientes: AMBIENTES, cocina: ADICIONAL_COCINA };
}

function guardarAlquiler_(d, ses) {
  const amb = AMBIENTES.find(function (a) { return a.nombre === d.ambiente; });
  if (!amb) throw new Error('Elige el ambiente.');
  const fecha = String(d.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Elige la fecha del evento.');
  if (!d.id && fecha < hoy_()) throw new Error('La fecha del evento ya pasó.');
  const cliente = String(d.cliente || '').trim();
  if (cliente.length < 3) throw new Error('Escribe el nombre del cliente.');
  const tipo = ['socio', 'no_socio', 'institucion'].indexOf(d.tipo) >= 0 ? d.tipo : 'socio';
  const celular = String(d.celular || '').replace(/\D/g, '');
  if (celular && celular.length !== 9) throw new Error('El celular tiene 9 números.');
  const monto = validarMonto_(d.monto, 'el precio del alquiler');
  const adelanto = Math.max(0, Math.round(Number(d.adelanto || 0) * 100) / 100);
  if (adelanto > monto) throw new Error('El adelanto no puede ser mayor que el precio.');
  const choca = leer_('Alquileres').find(function (a) {
    if (a.id === d.id || a.estado === 'cancelado' || a.fecha !== fecha) return false;
    if (a.ambiente === amb.nombre) return true;
    const otro = AMBIENTES.find(function (x) { return x.nombre === a.ambiente; });
    return otro && otro.grupo === amb.grupo && (otro.completo || amb.completo);
  });
  if (choca) throw new Error('Ese día ya está reservado: ' + choca.ambiente + ' para ' + choca.cliente + '.');
  let nota = String(d.nota || '').trim();
  if (d.cocina === 'si') {
    if (amb.grupo !== ADICIONAL_COCINA.grupo) throw new Error('El uso de cocina es solo para el rincón parrillero.');
    if (nota.indexOf('Incluye uso de cocina') < 0) nota = ('Incluye uso de cocina (S/ ' + ADICIONAL_COCINA.precio + '). ' + nota).trim();
  }
  const datos = { fecha: fecha, ambiente: amb.nombre, cliente: cliente, tipo_cliente: tipo, celular: celular, monto: monto, nota: nota.slice(0, 300) };
  if (d.id) {
    actualizar_('Alquileres', d.id, datos);
    anotar_(ses, 'Editó alquiler', amb.nombre + ' ' + fecha);
    return { id: d.id };
  }
  datos.adelanto = adelanto;
  datos.estado = adelanto > 0 ? 'confirmado' : 'reservado';
  datos.registrado_por = quien_(ses);
  datos.es_ejemplo = false;
  const a = insertar_('Alquileres', datos);
  if (adelanto > 0) {
    insertar_('Caja', {
      fecha: hoy_(), hora: horaAhora_(), tipo: 'ingreso', origen: 'alquileres', concepto: 'Adelanto alquiler ' + amb.nombre + ' (' + fecha + ') · ' + cliente,
      monto: adelanto, medio: validarMedio_(d.medio), referencia: a.id, registrado_por: quien_(ses), es_ejemplo: false,
    });
  }
  anotar_(ses, 'Registró alquiler', amb.nombre + ' ' + fecha + ' · ' + cliente);
  return { id: a.id };
}

function cambiarEstadoAlquiler_(d, ses) {
  const a = buscarPorId_('Alquileres', d.id);
  if (!a) throw new Error('No se encontró el alquiler.');
  if (ESTADOS_ALQUILER.indexOf(d.estado) < 0) throw new Error('Estado no válido.');
  const cambios = { estado: d.estado };
  if (d.cobrar) {
    const saldo = redondear_(a.monto - a.adelanto);
    if (saldo <= 0) throw new Error('Este alquiler ya está pagado.');
    insertar_('Caja', {
      fecha: hoy_(), hora: horaAhora_(), tipo: 'ingreso', origen: 'alquileres', concepto: 'Saldo alquiler ' + a.ambiente + ' (' + a.fecha + ') · ' + a.cliente,
      monto: saldo, medio: validarMedio_(d.medio), referencia: a.id, registrado_por: quien_(ses), es_ejemplo: false,
    });
    cambios.adelanto = a.monto;
    if (d.estado === 'reservado') cambios.estado = 'confirmado';
  }
  actualizar_('Alquileres', a.id, cambios);
  anotar_(ses, 'Alquiler ' + cambios.estado, a.ambiente + ' ' + a.fecha);
  return true;
}

// ---------- Avisos ----------

function listarAvisos_() {
  return leer_('Avisos').sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })
    .map(function (a) { return { id: a.id, fecha: a.fecha, titulo: a.titulo, texto: a.texto, activo: a.activo }; });
}

function guardarAviso_(d, ses) {
  const titulo = String(d.titulo || '').trim();
  const texto = String(d.texto || '').trim();
  if (titulo.length < 3) throw new Error('Escribe un título para el aviso.');
  if (texto.length < 5) throw new Error('Escribe el texto del aviso.');
  if (d.id) {
    actualizar_('Avisos', d.id, { titulo: titulo, texto: texto, activo: d.activo !== false });
  } else {
    insertar_('Avisos', { fecha: hoy_(), titulo: titulo.slice(0, 100), texto: texto.slice(0, 600), activo: true, es_ejemplo: false });
  }
  anotar_(ses, 'Guardó aviso', titulo);
  return true;
}

// ---------- Vista del socio ----------

function miCuenta_(d, ses) {
  const r = verSocio_({ id: ses.id });
  const hoy = hoy_();
  const reservas = leer_('Reservas').filter(function (x) { return x.socio_id === ses.id && x.estado === 'reservada' && x.fecha >= hoy; })
    .sort(function (a, b) { return a.fecha + a.hora < b.fecha + b.hora ? -1 : 1; })
    .map(function (x) { return { id: x.id, fecha: x.fecha, hora: x.hora, cancha: x.cancha }; });
  r.reservas = reservas;
  r.avisos = listarAvisos_().filter(function (a) { return a.activo; }).slice(0, 5);
  r.carnet = 'CP:' + r.codigo;
  r.hoy = hoy;
  return r;
}

// ---------- Ajustes ----------

function ajustes_() {
  const c = config_();
  return {
    config: CONFIG_POR_DEFECTO.map(function (f) { return { clave: f[0], valor: c[f[0]], descripcion: f[2] }; }),
    usuarios: leer_('Usuarios').map(function (u) { return { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: ROLES[u.rol] || u.rol, activo: u.activo }; }),
    hojaUrl: libro_().getUrl(),
  };
}

function guardarAjustes_(d, ses) {
  const valores = d.valores || {};
  const h = hoja_('Config');
  const filas = leer_('Config');
  const numericas = ['cuota_mensual', 'dia_vencimiento', 'tarifa_invitado_club', 'tarifa_invitado_piscina', 'tarifa_invitado_comedor', 'max_invitados_dia', 'max_visitas_invitado_mes', 'tolerancia_tardanza', 'tenis_hora_inicio', 'tenis_hora_fin', 'tenis_max_dia', 'tenis_max_semana', 'tenis_dias_anticipacion'];
  CONFIG_POR_DEFECTO.forEach(function (f) {
    const clave = f[0];
    if (!(clave in valores)) return;
    let v = String(valores[clave]).trim();
    if (numericas.indexOf(clave) >= 0 && !(Number(v) >= 0)) throw new Error('Revisa "' + f[2] + '": debe ser un número.');
    if (clave === 'dia_vencimiento' && (Number(v) < 1 || Number(v) > 28)) throw new Error('El día de vencimiento va del 1 al 28.');
    if (['bloquear_morosos', 'datos_de_ejemplo'].indexOf(clave) >= 0) v = v === 'SI' ? 'SI' : 'NO';
    const fila = filas.find(function (x) { return x.clave === clave; });
    if (fila) h.getRange(fila._fila, 2).setValue(v);
    else insertar_('Config', { clave: clave, valor: v, descripcion: f[2] });
  });
  anotar_(ses, 'Cambió ajustes', Object.keys(valores).join(', '));
  return true;
}

function cambiarClaveUsuario_(d, ses) {
  const u = buscarPorId_('Usuarios', d.id);
  if (!u) throw new Error('No se encontró el usuario.');
  const nueva = String(d.clave || '');
  if (nueva.length < 8) throw new Error('La clave necesita al menos 8 caracteres.');
  actualizar_('Usuarios', u.id, { clave_hash: huella_('clave|' + nueva) });
  anotar_(ses, 'Cambió la clave de un usuario', u.usuario);
  return true;
}

function reiniciarDatosEjemplo_(d, ses) {
  if (config_().datos_de_ejemplo !== 'SI') throw new Error('El sistema ya tiene datos reales. No se puede reiniciar.');
  Object.keys(TABLAS).forEach(function (t) { if (t !== 'Config') vaciar_(t); });
  cargarEjemplo_();
  anotar_(ses, 'Reinició los datos de ejemplo', '');
  return true;
}

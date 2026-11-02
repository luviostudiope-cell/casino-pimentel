/**
 * Base de datos en Google Sheets.
 * Cada tabla es una hoja; la fila 1 tiene los nombres de columna.
 * Todo se guarda como texto (formato "@") para que Sheets no cambie fechas ni códigos.
 */

const ZONA = 'America/Lima';

const TABLAS = {
  Config: ['clave', 'valor', 'descripcion'],
  Usuarios: ['id', 'usuario', 'nombre', 'rol', 'clave_hash', 'activo', 'creado'],
  Socios: ['id', 'codigo', 'dni', 'nombres', 'apellidos', 'categoria', 'celular', 'correo', 'fecha_nacimiento',
    'fecha_ingreso', 'estado', 'pin_hash', 'debe_cambiar_pin', 'familiares', 'es_ejemplo', 'creado'],
  Cuotas: ['id', 'socio_id', 'periodo', 'monto', 'vence', 'estado', 'pago_id', 'es_ejemplo'],
  Pagos: ['id', 'fecha', 'hora', 'socio_id', 'monto', 'medio', 'periodos', 'nota', 'registrado_por', 'es_ejemplo'],
  Ingresos: ['id', 'fecha', 'hora', 'tipo', 'socio_id', 'nombre', 'dni', 'tarifa', 'medio', 'salida', 'registrado_por', 'es_ejemplo'],
  Personal: ['id', 'nombres', 'apellidos', 'dni', 'area', 'cargo', 'pin_hash', 'hora_entrada', 'hora_salida', 'activo', 'es_ejemplo'],
  Asistencia: ['id', 'fecha', 'personal_id', 'entrada', 'salida', 'tardanza_min', 'es_ejemplo'],
  Productos: ['id', 'categoria', 'nombre', 'detalle', 'precio', 'stock', 'stock_minimo', 'activo', 'por_confirmar', 'orden'],
  Ventas: ['id', 'numero', 'fecha', 'hora', 'items', 'total', 'medio', 'mesa', 'atendido_por', 'estado', 'es_ejemplo', 'socio_id'],
  Caja: ['id', 'fecha', 'hora', 'tipo', 'origen', 'concepto', 'monto', 'medio', 'referencia', 'registrado_por', 'es_ejemplo'],
  CierresCaja: ['id', 'fecha', 'hora', 'esperado', 'contado', 'diferencia', 'nota', 'registrado_por'],
  Reservas: ['id', 'fecha', 'hora', 'cancha', 'socio_id', 'estado', 'creado_por', 'es_ejemplo'],
  Alquileres: ['id', 'fecha', 'ambiente', 'cliente', 'tipo_cliente', 'celular', 'monto', 'adelanto', 'estado', 'nota', 'registrado_por', 'es_ejemplo'],
  Avisos: ['id', 'fecha', 'titulo', 'texto', 'activo', 'es_ejemplo'],
  Bitacora: ['id', 'fecha', 'hora', 'usuario', 'accion', 'detalle'],
};

const COL_NUMERO = { monto: 1, total: 1, tarifa: 1, precio: 1, stock: 1, stock_minimo: 1, orden: 1, esperado: 1, contado: 1, diferencia: 1, adelanto: 1, tardanza_min: 1, numero: 1 };
const COL_SINO = { activo: 1, es_ejemplo: 1, debe_cambiar_pin: 1, por_confirmar: 1 };
const COL_JSON = { items: 1, periodos: 1, familiares: 1 };

// Caché por ejecución: cada llamada lee una hoja una sola vez
let _tablas = {};
let _libro = null;

function libro_() {
  if (_libro) return _libro;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('HOJA_ID');
  if (id) {
    _libro = SpreadsheetApp.openById(id);
  } else {
    _libro = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create('Casino de Pimentel · Base de datos');
    props.setProperty('HOJA_ID', _libro.getId());
  }
  return _libro;
}

function hoja_(nombre) {
  const cols = TABLAS[nombre];
  if (!cols) throw new Error('Tabla desconocida: ' + nombre);
  const libro = libro_();
  let h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.getRange(1, 1, h.getMaxRows(), cols.length).setNumberFormat('@');
    h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#EAF4FB');
    h.setFrozenRows(1);
  }
  return h;
}

function aValor_(col, v) {
  if (v instanceof Date) v = Utilities.formatDate(v, ZONA, 'yyyy-MM-dd HH:mm');
  if (COL_NUMERO[col]) return v === '' || v === null || v === undefined ? 0 : Number(v);
  if (COL_SINO[col]) return v === true || v === 'TRUE' || v === 'true' || v === 'SI' || v === 'sí';
  if (COL_JSON[col]) { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  return v === null || v === undefined ? '' : String(v);
}

function aCelda_(col, v) {
  if (v === undefined || v === null) return '';
  if (COL_JSON[col]) return JSON.stringify(v);
  if (COL_SINO[col]) return v ? 'TRUE' : 'FALSE';
  return String(v);
}

/** Todas las filas de una tabla como objetos. */
function leer_(nombre) {
  if (_tablas[nombre]) return _tablas[nombre];
  const cols = TABLAS[nombre];
  const h = hoja_(nombre);
  const n = h.getLastRow();
  if (n < 2) return (_tablas[nombre] = []);
  const valores = h.getRange(2, 1, n - 1, cols.length).getValues();
  const filas = [];
  for (let i = 0; i < valores.length; i++) {
    const fila = valores[i];
    if (fila.every(function (c) { return c === '' || c === null; })) continue;
    const o = { _fila: i + 2 };
    for (let j = 0; j < cols.length; j++) o[cols[j]] = aValor_(cols[j], fila[j]);
    filas.push(o);
  }
  return (_tablas[nombre] = filas);
}

function asegurarFilas_(h, hasta, ancho) {
  const max = h.getMaxRows();
  if (hasta <= max) return;
  const extra = Math.max(hasta - max, 500);
  h.insertRowsAfter(max, extra);
  h.getRange(max + 1, 1, extra, ancho).setNumberFormat('@');
}

function nuevoId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

/** Agrega varias filas de una vez (más rápido que una por una). */
function insertarVarios_(nombre, lista) {
  if (!lista.length) return [];
  const cols = TABLAS[nombre];
  const h = hoja_(nombre);
  const desde = h.getLastRow() + 1;
  asegurarFilas_(h, desde + lista.length - 1, cols.length);
  const valores = lista.map(function (o) {
    if (cols.indexOf('id') >= 0 && !o.id) o.id = nuevoId_();
    return cols.map(function (c) { return aCelda_(c, o[c]); });
  });
  h.getRange(desde, 1, valores.length, cols.length).setValues(valores);
  const cache = _tablas[nombre];
  lista.forEach(function (o, i) {
    o._fila = desde + i;
    if (cache) cache.push(o);
  });
  return lista;
}

function insertar_(nombre, obj) {
  return insertarVarios_(nombre, [obj])[0];
}

/** Cambia campos de una fila buscada por id. */
function actualizar_(nombre, id, cambios) {
  const o = leer_(nombre).find(function (f) { return f.id === id; });
  if (!o) throw new Error('No se encontró el registro.');
  Object.keys(cambios).forEach(function (k) { o[k] = cambios[k]; });
  const cols = TABLAS[nombre];
  hoja_(nombre).getRange(o._fila, 1, 1, cols.length).setValues([cols.map(function (c) { return aCelda_(c, o[c]); })]);
  return o;
}

/** Borra el contenido de una tabla (solo para reiniciar los datos de ejemplo). */
function vaciar_(nombre) {
  const h = hoja_(nombre);
  const n = h.getLastRow();
  if (n > 1) h.getRange(2, 1, n - 1, TABLAS[nombre].length).clearContent();
  _tablas[nombre] = [];
}

function buscarPorId_(nombre, id) {
  return leer_(nombre).find(function (f) { return f.id === id; }) || null;
}

// ---------- Configuración del club (hoja Config) ----------

const CONFIG_POR_DEFECTO = [
  ['club_nombre', 'Casino de Pimentel', 'Nombre que se muestra en el sistema'],
  ['cuota_mensual', '80', 'Cuota de mantenimiento por socio (S/)'],
  ['dia_vencimiento', '10', 'Día del mes siguiente en que vence la cuota'],
  ['tarifa_invitado_club', '10', 'Pago por invitado al club (S/)'],
  ['tarifa_invitado_piscina', '20', 'Pago por invitado a la piscina (S/)'],
  ['tarifa_invitado_comedor', '0', 'Pago por invitado al comedor (S/, 0 = libre)'],
  ['max_invitados_dia', '5', 'Máximo de invitados por socio en un día'],
  ['max_visitas_invitado_mes', '3', 'Veces al mes que puede venir el mismo invitado'],
  ['bloquear_morosos', 'NO', 'SI = un socio con cuotas vencidas no puede entrar'],
  ['tolerancia_tardanza', '10', 'Minutos de tolerancia para el personal'],
  ['tenis_hora_inicio', '6', 'Primera hora para reservar tenis'],
  ['tenis_hora_fin', '22', 'Hora en que cierra la cancha'],
  ['tenis_max_dia', '1', 'Reservas de tenis por socio por día'],
  ['tenis_max_semana', '3', 'Reservas de tenis por socio por semana (lunes a domingo)'],
  ['tenis_dias_anticipacion', '7', 'Con cuántos días de anticipación se puede reservar'],
  ['datos_de_ejemplo', 'SI', 'SI mientras el sistema use datos de ejemplo'],
];

function config_() {
  const c = {};
  CONFIG_POR_DEFECTO.forEach(function (f) { c[f[0]] = f[1]; });
  leer_('Config').forEach(function (f) { c[f.clave] = f.valor; });
  return c;
}

function configNum_(clave) {
  return Number(config_()[clave]) || 0;
}

// ---------- Fechas en hora de Lima ----------

function hoy_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd'); }
function horaAhora_() { return Utilities.formatDate(new Date(), ZONA, 'HH:mm'); }
function fechaMas_(fecha, dias) {
  const p = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias, 12));
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}
function minutos_(hhmm) {
  if (!hhmm) return 0;
  const p = String(hhmm).split(':').map(Number);
  return p[0] * 60 + (p[1] || 0);
}

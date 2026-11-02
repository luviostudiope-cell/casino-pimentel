/**
 * Crea las hojas y carga los datos de ejemplo la primera vez que se abre el sistema.
 * Los socios y el personal son ficticios. La carta, los ambientes y las tarifas son los reales del club.
 * Todo lo de ejemplo queda con es_ejemplo = TRUE y la pantalla muestra "Datos de ejemplo".
 */

// Accesos del personal para la demostración. Cámbialos en Ajustes antes de usar el sistema con datos reales.
const USUARIOS_EJEMPLO = [
  { usuario: 'admin', nombre: 'Administración', rol: 'admin', clave: 'Admin2026' },
  { usuario: 'directiva', nombre: 'Directiva', rol: 'directiva', clave: 'Directiva2026' },
  { usuario: 'porteria', nombre: 'Portería', rol: 'porteria', clave: 'Porteria2026' },
  { usuario: 'barra', nombre: 'Barra', rol: 'barra', clave: 'Barra2026' },
];

// Dos socios de demostración con PIN conocido (ficticios)
const SOCIOS_DEMO = { 1: { nombres: 'Gonzalo', apellidos: 'Peralta Ugaz', pin: '246810', perfil: 0 }, 2: { nombres: 'Mariela', apellidos: 'Chirinos Vera', pin: '135790', perfil: 2 } };

const APELLIDOS = ['Alarcón', 'Barrios', 'Bazán', 'Cabrera', 'Castañeda', 'Chirinos', 'Córdova', 'Delgado', 'Espinoza', 'Falla', 'Flores', 'Gálvez', 'Guevara', 'Herrera', 'Ibáñez',
  'Jiménez', 'Larrea', 'León', 'Linares', 'Lozada', 'Medina', 'Mendoza', 'Montenegro', 'Morales', 'Muñoz', 'Navarro', 'Núñez', 'Olivares', 'Paredes', 'Peralta',
  'Quiroz', 'Ramírez', 'Reyes', 'Ríos', 'Romero', 'Ruiz', 'Salazar', 'Sánchez', 'Santisteban', 'Soto', 'Tello', 'Torres', 'Ugaz', 'Vallejos', 'Vásquez',
  'Vera', 'Villanueva', 'Zapata', 'Zevallos', 'Burga', 'Carranza', 'Dávila', 'Rivadeneira', 'Saavedra', 'Távara', 'Benites', 'Aguinaga', 'Cornejo'];
const NOMBRES_H = ['Alberto', 'Alfredo', 'Andrés', 'Antonio', 'Arturo', 'Carlos', 'César', 'Daniel', 'Eduardo', 'Enrique', 'Ernesto', 'Fernando', 'Francisco', 'Gonzalo', 'Guillermo',
  'Gustavo', 'Héctor', 'Hugo', 'Javier', 'Jorge', 'José', 'Juan', 'Julio', 'Luis', 'Manuel', 'Mario', 'Miguel', 'Óscar', 'Pablo', 'Pedro', 'Raúl', 'Ricardo', 'Roberto', 'Rodrigo', 'Sergio', 'Víctor'];
const NOMBRES_M = ['Ana', 'Andrea', 'Beatriz', 'Carmen', 'Cecilia', 'Claudia', 'Diana', 'Elena', 'Gabriela', 'Gloria', 'Isabel', 'Julia', 'Karina', 'Laura', 'Liliana', 'Lucía', 'María',
  'Mariela', 'Mónica', 'Patricia', 'Pilar', 'Rocío', 'Rosa', 'Silvia', 'Sofía', 'Susana', 'Teresa', 'Verónica', 'Ximena', 'Valeria', 'Camila', 'Daniela', 'Fernanda', 'Natalia', 'Paola'];

// Personal de ejemplo (ficticio) con su PIN de 4 números para marcar asistencia
const PERSONAL_EJEMPLO = [
  ['Rosa', 'Quispe Llontop', '97000101', 'barra', 'Bartender', '11:00', '19:00', '2468'],
  ['Luis', 'Vílchez Sánchez', '97000102', 'barra', 'Bartender', '15:00', '23:00', '1357'],
  ['Jhonatan', 'Cieza Díaz', '97000103', 'barra', 'Mesero', '15:00', '23:00', '8080'],
  ['Marco Antonio', 'Neyra Ruiz', '97000104', 'barra', 'Encargado de barra', '14:00', '22:00', '4321'],
  ['Segundo', 'Carrasco Bances', '97000105', 'portería', 'Portero', '07:00', '15:00', '1010'],
  ['Wilmer', 'Guevara Ñopo', '97000106', 'portería', 'Portero', '15:00', '23:00', '2020'],
  ['Milagros', 'Ortiz Paz', '97000107', 'administración', 'Asistente administrativa', '08:00', '16:00', '3030'],
  ['Pedro', 'Llontop Chapoñán', '97000108', 'mantenimiento', 'Técnico de mantenimiento', '07:00', '15:00', '4040'],
  ['José', 'Fiestas Ayasta', '97000109', 'mantenimiento', 'Ayudante', '07:00', '15:00', '5050'],
  ['Juana', 'Sandoval Cumpa', '97000110', 'limpieza', 'Limpieza', '07:00', '15:00', '6060'],
  ['Doris', 'Purizaca Vidaurre', '97000111', 'limpieza', 'Limpieza', '07:00', '15:00', '7070'],
  ['Kevin', 'Mío Santamaría', '97000112', 'piscina', 'Salvavidas', '09:00', '18:00', '9090'],
  ['Brenda', 'Uypan Siesquén', '97000113', 'piscina', 'Salvavidas', '09:00', '18:00', '1212'],
  ['Ronald', 'Chancafe Huamán', '97000114', 'seguridad', 'Vigilante', '22:00', '23:59', '3434'],
  ['Eusebio', 'Sirlopú Inoñán', '97000115', 'jardinería', 'Jardinero', '07:00', '15:00', '5656'],
];

// Carta real de la barra (precios en soles). stock_minimo -1 = se prepara en barra, no se cuenta por unidad.
const CARTA = [
  ['Tragos de autor', 'Bienvenido a Pimentel', 'Hierba buena, kion, gin, limón y ginger ale', 15],
  ['Tragos de autor', 'Sunset Beach', 'Piña, Smirnoff spicy y coco', 15, true],
  ['Tragos de autor', 'Tropicana', 'Piña, fresa, vodka, vermut rosso, coco y limón', 15],
  ['Tragos de autor', 'Capitán', 'Whisky, crema de cognac, café y vermut rosso', 20],
  ['Preparados', 'Pisco Sour', '', 15], ['Preparados', 'Chilcano', '', 12], ['Preparados', 'Algarrobina', '', 15],
  ['Preparados', 'Gin Tonic London', '', 15], ['Preparados', 'Moscow Mule', '', 15], ['Preparados', 'Margarita', '', 20, true],
  ['Preparados', 'Negroni', '', 20, true], ['Preparados', 'Vodka Tonic', '', 12], ['Preparados', 'Vodka Tonic Grey Goose', '', 25],
  ['Preparados', 'Whisky', 'Vaso', 15], ['Preparados', 'Cuba Libre', '', 12], ['Preparados', 'Piña Colada', '', 15],
  ['Preparados', 'Daiquiri de fresa', '', 15], ['Preparados', 'Daiquiri de durazno', '', 15], ['Preparados', 'Tinto de Verano', '', 15],
  ['Preparados', 'Aperol', '', 18], ['Preparados', 'Baileys', '', 12], ['Preparados', 'Disaronno', '', 15],
  ['Botellas', "Hendrick's", 'Gin', 170], ['Botellas', 'Bombay Sapphire', 'Gin', 120], ['Botellas', 'Bombay Bramble', 'Gin', 140],
  ['Botellas', 'Tanqueray Royal Berry 700 ml', 'Gin', 130], ['Botellas', 'Gran Cruz', 'Pisco', 120], ['Botellas', 'Portón', 'Pisco', 120],
  ['Botellas', '4 Gallos Quebranta', 'Pisco', 80], ['Botellas', 'Bacardí Añejo', 'Ron', 70], ['Botellas', 'Diplomático Mantuano', 'Ron', 180],
  ['Botellas', 'Diplomático Reserva Exclusiva', 'Ron', 240], ['Botellas', 'Jimador', 'Tequila', 120], ['Botellas', 'Patrón Silver', 'Tequila', 240],
  ['Botellas', 'Patrón Reposado', 'Tequila', 260], ['Botellas', 'Patrón Añejo', 'Tequila', 390], ['Botellas', 'Absolut', 'Vodka', 80],
  ['Botellas', 'Grey Goose 750 ml', 'Vodka', 220], ['Botellas', 'Old Parr 750 ml', 'Whisky', 120], ['Botellas', 'Chivas 13 años', 'Whisky', 120],
  ['Botellas', 'Chivas XV', 'Whisky', 230], ['Botellas', 'Johnnie Walker Swing', 'Whisky', 250], ['Botellas', 'Johnnie Walker Gold Label', 'Whisky', 550],
  ['Botellas', 'Johnnie Walker Blue', 'Whisky', 1600],
  ['Cervezas', 'Cerveza', 'Personal', 6],
  ['Gaseosas y agua', 'Gaseosa', 'Personal', 4], ['Gaseosas y agua', 'Agua', 'Personal', 3], ['Gaseosas y agua', 'Red Bull', '', 10],
  ['Gaseosas y agua', 'Agua tónica lata (Britvic)', '', 6], ['Gaseosas y agua', 'Agua tónica botella 1.5 L', '', 15],
  ['Gaseosas y agua', 'Ginger 1.5 L', '', 15], ['Gaseosas y agua', 'Coca-Cola 1.5 L', '', 12],
  ['Otros', 'Hielera', '', 5], ['Otros', 'Cigarros x10', '', 15], ['Otros', 'Derecho de corcho', '', 20],
];

function instalar_() {
  Object.keys(TABLAS).forEach(function (t) { hoja_(t); });
  const libro = libro_();
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    const h = libro.getSheetByName(n);
    if (h && libro.getSheets().length > 1) libro.deleteSheet(h);
  });
  if (!leer_('Config').length) {
    insertarVarios_('Config', CONFIG_POR_DEFECTO.map(function (f) { return { clave: f[0], valor: f[1], descripcion: f[2] }; }));
  }
  if (!leer_('Usuarios').length) cargarEjemplo_();
}

/** Generador de números al azar con semilla: los datos de ejemplo salen siempre iguales. */
function semilla_(n) {
  let a = n >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hhmm_(min) {
  min = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

function cargarEjemplo_() {
  const azar = semilla_(20261101);
  const elegir = function (arr) { return arr[Math.floor(azar() * arr.length)]; };
  const entre = function (a, b) { return a + Math.floor(azar() * (b - a + 1)); };
  const hoy = hoy_();
  const ahora = minutos_(horaAhora_());
  const ahoraTexto = hoy + ' ' + horaAhora_();

  // Usuarios del personal
  insertarVarios_('Usuarios', USUARIOS_EJEMPLO.map(function (u) {
    return { usuario: u.usuario, nombre: u.nombre, rol: u.rol, clave_hash: huella_('clave|' + u.clave), activo: true, creado: ahoraTexto };
  }));

  // Socios ficticios
  const socios = [];
  const perfiles = {};
  for (let i = 1; i <= 60; i++) {
    const demo = SOCIOS_DEMO[i];
    const mujer = demo ? i === 2 : azar() < 0.25;
    const lista = mujer ? NOMBRES_M : NOMBRES_H;
    const ap1 = elegir(APELLIDOS), ap2 = elegir(APELLIDOS);
    let nombres = elegir(lista) + (azar() < 0.4 ? ' ' + elegir(lista) : '');
    let apellidos = ap1 + ' ' + ap2;
    if (demo) { nombres = demo.nombres; apellidos = demo.apellidos; }
    const dni = '99' + ('000000' + (100000 + (i * 7919) % 899999)).slice(-6);
    const familiares = [];
    if (azar() < 0.7 || demo) familiares.push({ nombre: elegir(mujer ? NOMBRES_H : NOMBRES_M) + ' ' + elegir(APELLIDOS), parentesco: mujer ? 'esposo' : 'esposa' });
    const hijos = demo ? 2 : entre(0, 3);
    for (let h = 0; h < hijos; h++) {
      const hija = azar() < 0.5;
      familiares.push({ nombre: elegir(hija ? NOMBRES_M : NOMBRES_H) + ' ' + apellidos.split(' ')[0], parentesco: hija ? 'hija' : 'hijo' });
    }
    const pin = demo ? demo.pin : dni.slice(-6);
    const s = {
      codigo: ('0000' + i).slice(-4), dni: dni, nombres: nombres, apellidos: apellidos, categoria: 'Titular',
      celular: '9' + ('00000000' + entre(10000000, 99999999)).slice(-8),
      correo: azar() < 0.5 ? sinTildes_(nombres.split(' ')[0] + '.' + apellidos.split(' ')[0]) + '@ejemplo.com' : '',
      fecha_nacimiento: entre(1950, 1985) + '-' + ('0' + entre(1, 12)).slice(-2) + '-' + ('0' + entre(1, 28)).slice(-2),
      fecha_ingreso: entre(1995, 2025) + '-' + ('0' + entre(1, 12)).slice(-2) + '-' + ('0' + entre(1, 28)).slice(-2),
      estado: (i === 17 || i === 43) ? 'suspendido' : 'activo',
      pin_hash: huella_('pin|' + pin), debe_cambiar_pin: !demo, familiares: familiares, es_ejemplo: true, creado: ahoraTexto,
    };
    socios.push(s);
    const r = azar();
    perfiles[i] = demo ? demo.perfil : (r < 0.68 ? 0 : r < 0.88 ? entre(1, 2) : entre(3, 5));
  }
  insertarVarios_('Socios', socios);

  // Cuotas de los últimos 10 meses y sus pagos
  const periodos = [];
  const p0 = hoy.slice(0, 7).split('-').map(Number);
  for (let k = 9; k >= 0; k--) {
    let m = p0[1] - k, a = p0[0];
    while (m < 1) { m += 12; a--; }
    periodos.push(a + '-' + ('0' + m).slice(-2));
  }
  const cuota = configNum_('cuota_mensual');
  const cuotas = [], pagos = [], caja = [];
  const medios = ['efectivo', 'efectivo', 'yape', 'yape', 'transferencia', 'plin'];
  socios.forEach(function (s, idx) {
    const atraso = perfiles[idx + 1];
    let sinPagar = atraso === 0 ? (azar() < 0.4 ? 2 : 1) : atraso + 2;
    if (s.estado === 'suspendido') sinPagar = 6;
    periodos.forEach(function (per, j) {
      const vence = venceDe_(per);
      const c = { id: nuevoId_(), socio_id: s.id, periodo: per, monto: cuota, vence: vence, estado: 'pendiente', pago_id: '', es_ejemplo: true };
      if (j < periodos.length - sinPagar) {
        let fecha = fechaMas_(vence, -entre(1, 20));
        if (fecha > hoy) fecha = fechaMas_(hoy, -entre(0, 3));
        let horaPago = entre(9 * 60, 19 * 60);
        if (fecha === hoy) {
          if (ahora < 9 * 60 + 30) fecha = fechaMas_(hoy, -1);
          else horaPago = entre(9 * 60, ahora - 10);
        }
        const medio = elegir(medios);
        const pago = { id: nuevoId_(), fecha: fecha, hora: hhmm_(horaPago), socio_id: s.id, monto: cuota, medio: medio, periodos: [per], nota: '', registrado_por: 'admin', es_ejemplo: true };
        pagos.push(pago);
        c.estado = 'pagada';
        c.pago_id = pago.id;
        if (fecha >= fechaMas_(hoy, -6)) {
          caja.push({ fecha: fecha, hora: pago.hora, tipo: 'ingreso', origen: 'cuotas', concepto: 'Cuotas de ' + s.nombres + ' ' + s.apellidos + ': ' + mesLegible_(per), monto: cuota, medio: medio, referencia: pago.id, registrado_por: 'admin', es_ejemplo: true });
        }
      }
      cuotas.push(c);
    });
  });
  insertarVarios_('Cuotas', cuotas);
  insertarVarios_('Pagos', pagos);

  // Personal y su asistencia de la última semana
  const personal = PERSONAL_EJEMPLO.map(function (p) {
    return { nombres: p[0], apellidos: p[1], dni: p[2], area: p[3], cargo: p[4], hora_entrada: p[5], hora_salida: p[6], pin_hash: huella_('pinp|' + p[7]), activo: true, es_ejemplo: true };
  });
  insertarVarios_('Personal', personal);
  const tol = configNum_('tolerancia_tardanza');
  const asistencia = [];
  for (let k = 6; k >= 0; k--) {
    const f = fechaMas_(hoy, -k);
    personal.forEach(function (p, j) {
      if ((k + j) % 7 === 3) return; // día libre
      const ini = minutos_(p.hora_entrada), fin = minutos_(p.hora_salida);
      if (k === 0 && ini + 5 > ahora) return; // todavía no le toca
      if (azar() < (k === 0 ? 0.12 : 0.06)) return; // faltó o no marcó
      const llegada = ini + entre(-12, 22);
      if (k === 0 && llegada > ahora) return;
      const tarde = llegada - ini;
      const salida = fin + entre(0, 12);
      asistencia.push({ fecha: f, personal_id: p.id, entrada: hhmm_(llegada), salida: (k > 0 || salida <= ahora) ? hhmm_(salida) : '', tardanza_min: tarde > tol ? tarde : 0, es_ejemplo: true });
    });
  }
  insertarVarios_('Asistencia', asistencia);

  // Productos de la carta con stock de ejemplo
  const productos = CARTA.map(function (c, i) {
    let stock = 0, minimo = -1;
    if (c[0] === 'Botellas') { stock = entre(0, 8); minimo = 2; }
    if (c[0] === 'Cervezas') { stock = entre(30, 120); minimo = 24; }
    if (c[0] === 'Gaseosas y agua') { stock = entre(4, 48); minimo = 12; }
    return { categoria: c[0], nombre: c[1], detalle: c[2], precio: c[3], stock: stock, stock_minimo: minimo, activo: true, por_confirmar: Boolean(c[4]), orden: i + 1 };
  });
  insertarVarios_('Productos', productos);

  // Ventas de barra de la semana (de 11:00 a 23:00)
  const sueltos = productos.filter(function (p) { return p.categoria !== 'Botellas'; });
  const botellas = productos.filter(function (p) { return p.categoria === 'Botellas' && p.precio <= 260; });
  const ventas = [];
  let numero = 1000;
  const mediosBarra = ['efectivo', 'efectivo', 'yape', 'yape', 'plin', 'tarjeta', 'tarjeta', 'cuenta'];
  const meseros = ['barra', 'barra', 'admin'];
  const activos = socios.filter(function (s) { return s.estado === 'activo'; });
  for (let k = 6; k >= 0; k--) {
    const f = fechaMas_(hoy, -k);
    const n = entre(16, 32);
    const horas = [];
    for (let v = 0; v < n; v++) horas.push(entre(11 * 60, 23 * 60 - 10));
    horas.sort(function (a, b) { return a - b; }).forEach(function (h) {
      if (k === 0 && h > ahora) return;
      const items = [];
      const lineas = entre(1, 3);
      for (let l = 0; l < lineas; l++) {
        const p = (azar() < 0.06) ? elegir(botellas) : elegir(sueltos);
        const ya = items.find(function (x) { return x.id === p.id; });
        if (ya) ya.cant++;
        else items.push({ id: p.id, nombre: p.nombre, precio: p.precio, cant: p.precio <= 6 ? entre(1, 4) : 1 });
      }
      const total = items.reduce(function (a, x) { return a + x.precio * x.cant; }, 0);
      // Los consumos a la cuenta del socio quedan por cobrar (solo en los últimos días) y no entran a caja
      let medio = elegir(mediosBarra);
      if (medio === 'cuenta' && k > 3) medio = 'efectivo';
      numero++;
      const aCuenta = medio === 'cuenta';
      const venta = { id: nuevoId_(), numero: numero, fecha: f, hora: hhmm_(h), items: items, total: total, medio: medio, mesa: String(entre(1, 14)), atendido_por: elegir(meseros), estado: aCuenta ? 'a_cuenta' : 'pagada', es_ejemplo: true, socio_id: aCuenta ? elegir(activos.slice(2)).id : '' };
      ventas.push(venta);
      if (!aCuenta) caja.push({ fecha: f, hora: venta.hora, tipo: 'ingreso', origen: 'barra', concepto: 'Venta de barra N° ' + numero, monto: total, medio: medio, referencia: venta.id, registrado_por: venta.atendido_por, es_ejemplo: true });
    });
  }
  // Un consumo a cuenta del socio de demostración, para verlo en su app
  const pisco = productos.find(function (p) { return p.nombre === 'Pisco Sour'; });
  const agua = productos.find(function (p) { return p.nombre === 'Agua'; });
  numero++;
  ventas.push({ id: nuevoId_(), numero: numero, fecha: fechaMas_(hoy, -1), hora: '20:15', items: [{ id: pisco.id, nombre: pisco.nombre, precio: pisco.precio, cant: 2 }, { id: agua.id, nombre: agua.nombre, precio: agua.precio, cant: 1 }], total: pisco.precio * 2 + agua.precio, medio: 'cuenta', mesa: '6', atendido_por: 'barra', estado: 'a_cuenta', es_ejemplo: true, socio_id: socios[0].id });
  insertarVarios_('Ventas', ventas);

  // Ingresos al club de la semana (de 8:00 a 22:00) e invitados
  const ingresos = [];
  for (let k = 6; k >= 0; k--) {
    const f = fechaMas_(hoy, -k);
    const dia = new Date(f + 'T12:00:00Z').getUTCDay();
    const fin = dia === 0 || dia === 6;
    const lista = activos.slice().sort(function () { return azar() - 0.5; }).slice(0, entre(fin ? 30 : 16, fin ? 44 : 28));
    lista.forEach(function (s, j) {
      const h = entre(8 * 60, 21 * 60);
      if (k === 0 && h > ahora) return;
      const salida = h + entre(90, 300);
      const salio = k > 0 || salida <= ahora;
      ingresos.push({ fecha: f, hora: hhmm_(h), tipo: 'socio', socio_id: s.id, nombre: '', dni: '', tarifa: 0, medio: '', salida: salio ? hhmm_(salida) : '', registrado_por: 'porteria', es_ejemplo: true });
      (s.familiares || []).forEach(function (fam) {
        if (azar() < 0.35) ingresos.push({ fecha: f, hora: hhmm_(h), tipo: 'familiar', socio_id: s.id, nombre: fam.nombre, dni: '', tarifa: 0, medio: '', salida: salio ? hhmm_(salida) : '', registrado_por: 'porteria', es_ejemplo: true });
      });
      if (j % 6 === 0) {
        const r = azar();
        const entrada = r < 0.25 ? 'comedor' : r < 0.55 ? 'piscina' : 'club';
        const monto = Number(config_()['tarifa_invitado_' + entrada]) || 0;
        const medio = monto > 0 ? elegir(['efectivo', 'yape', 'plin']) : '';
        const inv = { id: nuevoId_(), fecha: f, hora: hhmm_(h + 1), tipo: 'invitado', socio_id: s.id, nombre: elegir(NOMBRES_H.concat(NOMBRES_M)) + ' ' + elegir(APELLIDOS) + ' ' + elegir(APELLIDOS), dni: '7' + entre(1000000, 9999999), tarifa: monto, medio: medio, salida: salio ? hhmm_(salida) : '', registrado_por: 'porteria', es_ejemplo: true };
        ingresos.push(inv);
        if (monto > 0) caja.push({ fecha: f, hora: inv.hora, tipo: 'ingreso', origen: 'invitados', concepto: 'Invitado (' + entrada + ') de ' + s.nombres + ' ' + s.apellidos + ': ' + inv.nombre, monto: monto, medio: medio, referencia: inv.id, registrado_por: 'porteria', es_ejemplo: true });
      }
    });
  }
  insertarVarios_('Ingresos', ingresos.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; }));

  // Gastos chicos de caja
  const gastos = [['Compra de hielo', 45, 'barra'], ['Limones para la barra', 38, 'barra'], ['Balón de gas', 58, 'otros'], ['Artículos de limpieza', 72, 'otros'], ['Movilidad para compras', 20, 'otros']];
  for (let k = 6; k >= 0; k--) {
    const f = fechaMas_(hoy, -k);
    const g = elegir(gastos);
    const h = entre(10 * 60, 18 * 60);
    if (k === 0 && h > ahora) continue;
    caja.push({ fecha: f, hora: hhmm_(h), tipo: 'egreso', origen: g[2], concepto: g[0], monto: g[1], medio: 'efectivo', referencia: '', registrado_por: 'admin', es_ejemplo: true });
  }

  // Reservas de tenis de esta semana
  const reservas = [];
  for (let k = 0; k <= 6; k++) {
    const f = fechaMas_(hoy, k);
    const usadas = {};
    const n = entre(2, 6);
    for (let r = 0; r < n; r++) {
      const hora = ('0' + entre(6, 20)).slice(-2) + ':00';
      const cancha = elegir(CANCHAS);
      if (usadas[hora + cancha] || (k === 0 && minutos_(hora) <= ahora)) continue;
      usadas[hora + cancha] = 1;
      reservas.push({ fecha: f, hora: hora, cancha: cancha, socio_id: elegir(activos.slice(2)).id, estado: 'reservada', creado_por: 'admin', es_ejemplo: true });
    }
  }
  reservas.push({ fecha: fechaMas_(hoy, 2), hora: '07:00', cancha: CANCHAS[0], socio_id: socios[0].id, estado: 'reservada', creado_por: 'socio', es_ejemplo: true });
  insertarVarios_('Reservas', reservas);

  // Alquileres de ambientes
  const alquileres = [
    [fechaMas_(hoy, -9), 'Rincón parrillero', 'Familia Torres Vera (ejemplo)', 'socio', 800, 800, 'realizado', 'Incluye uso de cocina (S/ 400). Almuerzo familiar'],
    [fechaMas_(hoy, -3), 'Salón principal 1/2', 'Cumpleaños de socio (ejemplo)', 'socio', 700, 700, 'realizado', ''],
    [fechaMas_(hoy, 5), 'Salón principal', 'Matrimonio de ejemplo', 'no_socio', 3000, 1500, 'confirmado', 'Decoración el día anterior'],
    [fechaMas_(hoy, 8), 'Rincón parrillero + jardín', 'Empresa de ejemplo S.A.C.', 'institucion', 2000, 0, 'reservado', 'Falta el adelanto'],
    [fechaMas_(hoy, 12), 'Piscina', 'Promoción escolar (ejemplo)', 'socio', 500, 250, 'confirmado', ''],
    [fechaMas_(hoy, 20), 'Salón principal 1/3', 'Reunión de exalumnos (ejemplo)', 'socio', 350, 0, 'reservado', ''],
  ].map(function (a) {
    return { fecha: a[0], ambiente: a[1], cliente: a[2], tipo_cliente: a[3], celular: '9' + entre(10000000, 99999999), monto: a[4], adelanto: a[5], estado: a[6], nota: a[7], registrado_por: 'admin', es_ejemplo: true };
  });
  insertarVarios_('Alquileres', alquileres);

  insertarVarios_('Caja', caja.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; }));

  insertarVarios_('Avisos', [
    { fecha: fechaMas_(hoy, -1), titulo: 'Mantenimiento de la piscina', texto: 'El lunes la piscina estará cerrada por limpieza y mantenimiento. Gracias por su comprensión.', activo: true, es_ejemplo: true },
    { fecha: fechaMas_(hoy, -4), titulo: 'Campeonato interno de tenis', texto: 'Inscripciones abiertas en administración hasta el viernes. Categorías libre y senior.', activo: true, es_ejemplo: true },
    { fecha: fechaMas_(hoy, -12), titulo: 'Nuevo horario de la barra', texto: 'La barra atiende de martes a domingo de 11:00 a 23:00.', activo: false, es_ejemplo: true },
  ]);
}

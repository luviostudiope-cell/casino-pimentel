/**
 * Casino de Pimentel · sistema del club
 * Web app de Google Apps Script con Google Sheets como base de datos.
 *
 * Archivos:
 *   Codigo.js    entrada de la web app
 *   Datos.js     tablas, lectura y escritura en la hoja
 *   Sesion.js    ingreso, sesiones y permisos
 *   Api.js       todas las acciones que llama la pantalla
 *   Instalar.js  crea las hojas y carga los datos de ejemplo
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Casino de Pimentel')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Ejecútala una vez desde el editor (botón "Ejecutar"): pide los permisos de Google
 * y crea la hoja "Casino de Pimentel · Base de datos" con los datos de ejemplo.
 * Si el sistema ya está instalado no cambia nada.
 */
function prepararSistema() {
  asegurarInstalacion_();
  const url = libro_().getUrl();
  console.log('Sistema listo. Base de datos: ' + url);
  return 'Sistema listo';
}

/** Inserta otro archivo HTML dentro de Index (estilos, recursos, cliente). */
function incluir(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

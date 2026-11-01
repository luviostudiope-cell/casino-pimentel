# Sistema del Casino de Pimentel · Google Apps Script

Web app de Google Apps Script con Google Sheets como base de datos. Gratis y sin servidores propios.

## Verlo en esta PC

```bash
node appscript/dev/servidor.mjs
```

Abre http://localhost:3000. El servidor local corre el mismo código de `src/` con una hoja de cálculo simulada que se guarda en `dev/datos-locales.json` (bórralo para empezar de cero). Las hojas se pueden ver en http://localhost:3000/hoja. Los accesos de prueba están en [ACCESOS.md](../ACCESOS.md).

## Probarlo de punta a punta

```bash
node appscript/dev/probar.mjs capturas
```

Entra con cada rol, recorre las pantallas, hace las acciones principales y guarda capturas.

## Publicado en Google

- Web app: https://script.google.com/macros/s/AKfycbyIuh872nN7qy3mP9R3z6mOwbKDSsZkpSzU7OVp17ypTo8J34uEkT1TSh-MBw_ixb9L/exec
- Proyecto (cuenta luviostudiope@gmail.com): https://script.google.com/d/1JHnG1GtkJ6jClpuGBqbKa9KXepw6-U7B3mZeDuViUbo5doUTmZ4_lcKa/edit
- Prueba del enlace publicado: `node appscript/dev/probar-google.mjs <url-de-la-web-app> capturas-google`

Para subir cambios manteniendo el mismo enlace (desde la carpeta `appscript`):

```bash
npx clasp push --force
npx clasp create-deployment -i AKfycbyIuh872nN7qy3mP9R3z6mOwbKDSsZkpSzU7OVp17ypTo8J34uEkT1TSh-MBw_ixb9L -d "descripción del cambio"
```

Si algún día se agregan permisos nuevos en `appsscript.json` (por ejemplo para Telegram), hay que ejecutar `prepararSistema` una vez desde el editor y volver a tocar "Permitir".

### Cómo se publicó la primera vez

1. Activar la API de Apps Script en https://script.google.com/home/usersettings
2. `npx clasp login` con la cuenta de Google del club
3. `npx clasp create-script --type standalone --title "Casino de Pimentel" --rootDir src`
4. `npx clasp push --force` y `npx clasp create-deployment`
5. En el editor, ejecutar `prepararSistema` y tocar "Permitir": autoriza Sheets y crea la hoja "Casino de Pimentel · Base de datos" con los datos de ejemplo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/Codigo.js` | Entrada de la web app |
| `src/Datos.js` | Tablas (una hoja por tabla), lectura y escritura |
| `src/Sesion.js` | Ingreso con DNI + PIN o usuario + clave, sesiones y permisos |
| `src/Api.js` | Todas las acciones: portería, socios, barra, caja, personal, tenis, alquileres, avisos |
| `src/Instalar.js` | Crea las hojas y carga los datos de ejemplo |
| `src/Index.html`, `Estilos.html`, `Cliente.html` | La pantalla |
| `src/Recursos.html` | Logo e íconos embebidos (se genera con `npm run recursos`) |

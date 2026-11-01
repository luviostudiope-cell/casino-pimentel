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

## Publicarlo en Google

1. Activa la API de Apps Script en https://script.google.com/home/usersettings
2. Inicia sesión con la cuenta de Google del club: `npx clasp login` (desde la carpeta `appscript`)
3. La primera vez: `npx clasp create-script --type standalone --title "Casino de Pimentel" --rootDir src`
4. Sube y publica: `npm run publicar`
5. Abre el enlace de la web app. La primera vez Google pide autorizar el acceso a Sheets; al entrar se crea la hoja "Casino de Pimentel · Base de datos" con los datos de ejemplo.

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

// Construye la web (Astro) y la app (React) y las une en dist/ para un solo despliegue.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'

const correr = (cmd) => execSync(cmd, { stdio: 'inherit' })
correr('npm --prefix web run build')
correr('npm --prefix app run build')
if (existsSync('dist')) rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })
cpSync('web/dist', 'dist', { recursive: true })
cpSync('app/dist', 'dist/app', { recursive: true })
console.log('\nListo: dist/ (web en "/" y app en "/app")')

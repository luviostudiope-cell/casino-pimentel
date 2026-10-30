import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@design/base.css'
import './styles/ui.css'
import './styles/app.css'
import App from './App'
import { SesionProveedor } from './lib/sesion'
import { ConfirmarProveedor, ToastProveedor } from './ui'
import { registrarServiceWorker } from './lib/push'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/app">
      <SesionProveedor>
        <ToastProveedor>
          <ConfirmarProveedor>
            <App />
          </ConfirmarProveedor>
        </ToastProveedor>
      </SesionProveedor>
    </BrowserRouter>
  </StrictMode>,
)

registrarServiceWorker()

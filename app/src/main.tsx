import './ds'
import '../../design/design-system/components/bundle.js'
import '../../design/design-system/components/bundle.css'
// Fontes empacotadas no app (sem Google Fonts), para abrir sem internet.
import '@fontsource/instrument-sans/latin-400.css'
import '@fontsource/instrument-sans/latin-500.css'
import '@fontsource/instrument-sans/latin-600.css'
import '@fontsource/instrument-sans/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import './app.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Guarda o app no aparelho para abrir sem internet (só no build; ver vite.config.ts).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'))
}

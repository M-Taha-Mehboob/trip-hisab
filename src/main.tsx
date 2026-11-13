import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import './index.css'

// Amount fields: select the whole value on focus so typing replaces it.
// Deferred a tick because iOS Safari / Chrome clear the selection on tap.
document.addEventListener('focusin', (e) => {
  const el = e.target
  if (!(el instanceof HTMLInputElement)) return
  if (el.inputMode !== 'numeric' && el.inputMode !== 'decimal') return
  setTimeout(() => {
    if (document.activeElement === el) el.setSelectionRange(0, el.value.length)
  }, 0)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

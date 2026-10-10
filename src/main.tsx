import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from '@/context/AuthContext'
import { DialogProvider } from '@/context/DialogContext'
import { LookupsProvider } from '@/context/LookupsContext'
import { ReloadProvider } from '@/context/ReloadContext'
import { ToastProvider } from '@/context/ToastContext'
import './styles/styles.css'

// Service worker (PWA): hanya di produksi supaya server dev Vite tidak ter-cache.
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  navigator.serviceWorker
    .register('./sw.js', { updateViaCache: 'none' })
    .catch((error: unknown) => console.warn('[PWA] Service worker gagal didaftarkan:', error))
}

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan di index.html.')

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <ReloadProvider>
            <LookupsProvider>
              <DialogProvider>
                <App />
              </DialogProvider>
            </LookupsProvider>
          </ReloadProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>
)

registerServiceWorker()

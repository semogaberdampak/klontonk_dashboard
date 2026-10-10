import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { APP_VERSION } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useDialog } from '@/context/DialogContext'
import { useLookups } from '@/context/LookupsContext'
import { useReload } from '@/context/ReloadContext'
import { useConnection } from '@/hooks/useConnection'
import { initialOf } from '@/lib/format'
import { NAV_GROUPS, routeFor } from '@/routes'
import { Loading } from '@/components/ui'

function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const connection = useConnection()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">K</div>
        <div className="brand-text">
          <strong>Klontonk</strong>
          <span>Dashboard</span>
        </div>
      </div>
      <nav className="nav" aria-label="Navigasi utama">
        {NAV_GROUPS.map((group) => (
          <div key={group.name} style={{ display: 'contents' }}>
            <p className="nav-group">{group.name}</p>
            {group.routes.map((route) => {
              const active = pathname === route.path
              return (
                <button
                  key={route.path}
                  type="button"
                  className={`nav-item${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => navigate(route.path)}
                >
                  <span>{route.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="conn" data-state={connection.state}>
          <span className="dot" />
          <span>{connection.text}</span>
        </div>
        <p className="ver">v{APP_VERSION} &#183; multi-tenant</p>
      </div>
    </aside>
  )
}

function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  const { admin, logout } = useAuth()
  const { refresh } = useLookups()
  const { reload } = useReload()
  const dialog = useDialog()
  const name = admin?.name || 'Admin'

  const onLogout = async () => {
    const yakin = await dialog.confirm({
      title: 'Keluar',
      message: 'Keluar dari dashboard sekarang?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      variant: 'danger'
    })
    if (yakin) await logout()
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="btn btn-ghost"
          title="Muat ulang data halaman ini"
          onClick={() => {
            void refresh()
            reload()
          }}
        >
          Muat ulang
        </button>
        <div className="user-chip">
          <span className="avatar">{initialOf(name)}</span>
          <span>{name}</span>
        </div>
        <button type="button" className="btn btn-ghost danger" onClick={() => void onLogout()}>
          Keluar
        </button>
      </div>
    </header>
  )
}

/** Kerangka halaman: sidebar, topbar, dan area isi. Halaman baru dirender setelah daftar acuan siap. */
export function AppShell() {
  const { pathname } = useLocation()
  const { ready } = useLookups()
  const route = routeFor(pathname)
  const title = route?.title ?? 'Klontonk Dashboard'

  useEffect(() => {
    document.title = `${title} - Klontonk Dashboard`
  }, [title])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content">
        <Topbar title={title} subtitle={route?.subtitle ?? ''} />
        <main className="main" role="main">
          {ready ? <Outlet /> : <Loading />}
        </main>
      </div>
    </div>
  )
}

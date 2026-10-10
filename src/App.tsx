import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loading } from '@/components/ui'
import { DEFAULT_PATH, ROUTES } from '@/routes'
import { AppShell } from '@/views/AppShell'
import { LoginPage } from '@/views/LoginPage'
import { NotFoundPage } from '@/views/NotFoundPage'

export function App() {
  const { status } = useAuth()

  if (status === 'loading') return <Loading text="Memeriksa sesi..." />
  if (status === 'anonymous') return <LoginPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={DEFAULT_PATH} replace />} />
        {ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

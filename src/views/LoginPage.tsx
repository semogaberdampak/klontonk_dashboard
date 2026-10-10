import { useEffect, useRef, useState, type FormEvent } from 'react'
import { APP_VERSION } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

// Halaman login admin platform. Memakai EMAIL + PASSWORD; akunnya harus terdaftar di tabel
// platform_admins (lihat README bagian "Pasang sekali"). Tanpa baris itu, login ditolak.

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => emailRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.')
      return
    }

    setBusy(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        toast(`Selamat datang, ${result.admin.name}.`, { type: 'success' })
      } else {
        setError(result.error)
        setPassword('')
        passwordRef.current?.focus()
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-logo">K</div>
          <h1>Klontonk Dashboard</h1>
          <p>Manajemen client, langganan, dan log</p>
        </div>

        <form className="login-form" noValidate onSubmit={submit}>
          <div className="field">
            <label htmlFor="loginEmail">Email admin platform</label>
            <input
              ref={emailRef}
              type="email"
              id="loginEmail"
              name="email"
              autoComplete="username"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="loginPassword">Password</label>
            <input
              ref={passwordRef}
              type="password"
              id="loginPassword"
              name="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="login-note">v{APP_VERSION} &middot; khusus admin platform (vendor)</p>
      </div>
    </div>
  )
}

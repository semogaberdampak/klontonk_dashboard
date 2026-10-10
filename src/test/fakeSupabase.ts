import { vi } from 'vitest'

export type Call = [method: string, args: unknown[]]

export interface FakeResponse {
  data?: unknown
  error?: unknown
  status?: number
  count?: number | null
}

/**
 * Pembangun query palsu: mencatat setiap pemanggilan berantai (select, eq, in, range, ...)
 * dan "await"-nya menghasilkan respons yang ditentukan test.
 */
export function fakeQuery(response: FakeResponse = { data: [], error: null }) {
  const calls: Call[] = []
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: FakeResponse) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve({ error: null, ...response }).then(resolve, reject)
        }
        return (...args: unknown[]) => {
          calls.push([String(prop), args])
          return proxy
        }
      }
    }
  )
  return { query: proxy, calls }
}

export const callsOf = (calls: Call[], method: string): unknown[][] => calls.filter(([name]) => name === method).map(([, args]) => args)

export const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  }
}

export const detachedAuthMock = { signUp: vi.fn() }

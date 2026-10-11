/**
 * Filter halaman disimpan di URL (bisa dibagikan/di-bookmark). `key` berubah setiap kali
 * parameter berubah, dipakai sebagai dependensi pemuatan data.
 */
export function useUrlFilters<F>(parse: (params: URLSearchParams) => F) {
  const route = useRoute()

  const params = computed(() => {
    const search = new URLSearchParams()
    for (const [name, value] of Object.entries(route.query)) {
      const first = Array.isArray(value) ? value[0] : value
      if (first !== undefined && first !== null) search.set(name, String(first))
      else search.set(name, '')
    }
    return search
  })

  const key = computed(() => params.value.toString())
  const filters = computed<F>(() => parse(new URLSearchParams(key.value)))

  return { filters, key }
}

/** Ambil nilai parameter hanya bila termasuk daftar yang diizinkan; selain itu kosong. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.find((item) => item === value) ?? ''
}

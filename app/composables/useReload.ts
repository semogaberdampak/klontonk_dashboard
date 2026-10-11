/** Pemicu muat-ulang tunggal: tombol "Muat ulang" dan setiap simpan/hapus memakainya. */
export function useReload() {
  const version = useState<number>('reload-version', () => 0)
  const reload = (): void => {
    version.value += 1
  }
  return { version, reload }
}

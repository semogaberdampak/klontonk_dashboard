import { usePaketController, type PaketData } from '@/controllers/usePaketController'
import { formatNumber, formatRupiah, toNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Resource, RowActions, Stat, StatGrid } from '@/components/ui'

type Controller = ReturnType<typeof usePaketController>

function Content({ data, controller }: { data: PaketData; controller: Controller }) {
  const { paket, dipakai } = data
  const harga = paket.map((p) => toNumber(p.price_month)).filter((n) => n > 0)

  return (
    <>
      <StatGrid>
        <Stat label="Jumlah paket" value={formatNumber(paket.length)} note={`${formatNumber(paket.filter((p) => p.is_active).length)} aktif`} />
        <Stat label="Termurah" value={harga.length ? formatRupiah(Math.min(...harga)) : '-'} />
        <Stat label="Termahal" value={harga.length ? formatRupiah(Math.max(...harga)) : '-'} />
      </StatGrid>
      <div className="filters">
        <span className="hint">Batas jumlah cabang dan pengguna ditegakkan oleh database saat client menambah cabang/pengguna.</span>
        <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={controller.tambah}>
          + Tambah paket
        </button>
      </div>
      <Card title="Daftar paket">
        <DataTable
          rows={paket}
          rowKey={(r) => r.code}
          empty="Belum ada paket. Tambahkan paket pertama."
          columns={[
            { label: 'Paket', render: (r) => <CellStack strong main={r.name} sub={r.code} /> },
            { label: 'Harga / bulan', align: 'num', render: (r) => (toNumber(r.price_month) ? formatRupiah(r.price_month) : 'gratis') },
            { label: 'Maks cabang', align: 'num', render: (r) => r.max_branches },
            { label: 'Maks pengguna', align: 'num', render: (r) => r.max_users },
            { label: 'Status', render: (r) => <Badge tone={r.is_active ? 'ok' : ''}>{r.is_active ? 'aktif' : 'nonaktif'}</Badge> },
            { label: 'Dipakai', align: 'num', render: (r) => formatNumber(dipakai[r.code] ?? 0) },
            { label: 'Catatan', render: (r) => r.note },
            {
              label: '',
              align: 'num',
              render: (r) => (
                <RowActions
                  buttons={[
                    { label: 'Ubah', onClick: () => controller.ubah(r) },
                    { label: r.is_active ? 'Nonaktifkan' : 'Aktifkan', onClick: () => void controller.toggle(r) },
                    { label: 'Hapus', onClick: () => void controller.hapus(r) }
                  ]}
                />
              )
            }
          ]}
        />
      </Card>
    </>
  )
}

export function PaketPage() {
  const controller = usePaketController()
  return <Resource state={controller.state}>{(data) => <Content data={data} controller={controller} />}</Resource>
}

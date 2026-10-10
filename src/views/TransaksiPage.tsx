import { METODE_OPTIONS, TRANSAKSI_LIMIT, useTransaksiController } from '@/controllers/useTransaksiController'
import { formatDateTime, formatNumber, formatRupiah, toNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Mono, Pager, Resource, Stat, StatGrid } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function TransaksiPage() {
  const c = useTransaksiController()
  const { filters, api } = c
  const opsiCabang = api.tenantOptions({ clientId: filters.client || null, includeAll: true, withClient: !filters.client })
  const namaCabang = filters.tenant ? (api.tenant(filters.tenant)?.name ?? '') : ''

  return (
    <>
      <FilterBar
        onSubmit={c.apply}
        onClear={c.clear}
        trailing={
          <button type="button" className="btn btn-secondary" onClick={c.exportCsv}>
            Unduh CSV
          </button>
        }
      >
        <SelectField id="ftClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={c.changeClient} />
        <SelectField id="ftCabang" label="Cabang" value={c.draft.tenant} options={opsiCabang} onChange={(v) => c.setField('tenant', v)} />
        <InputField id="ftDari" label="Dari tanggal" type="date" value={c.draft.dari} onChange={(v) => c.setField('dari', v)} />
        <InputField id="ftSampai" label="Sampai tanggal" type="date" value={c.draft.sampai} onChange={(v) => c.setField('sampai', v)} />
        <SelectField id="ftMetode" label="Metode" value={c.draft.metode} options={METODE_OPTIONS} onChange={(v) => c.setField('metode', v)} />
        <InputField id="ftCari" label="Cari no. / kasir" value={c.draft.cari} placeholder="cth: TRX-2026" onChange={(v) => c.setField('cari', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total }) => (
          <>
            <StatGrid>
              <Stat label="Transaksi (filter)" value={formatNumber(total)} />
              <Stat label="Total di halaman ini" value={formatRupiah(rows.reduce((t, r) => t + toNumber(r.total), 0))} note={`${formatNumber(rows.length)} baris terlihat`} />
              <Stat label="Periode" value={`${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`} note="waktu Asia/Jakarta" />
            </StatGrid>
            <Card
              title="Riwayat penjualan"
              hint={namaCabang ? `Cabang: ${namaCabang}. Data hanya bisa dibaca.` : 'Data hanya bisa dibaca -- penjualan dicatat lewat kasir di POS.'}
            >
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.tenant_id}/${r.no}`}
                empty="Tidak ada transaksi pada periode/filter ini."
                columns={[
                  { label: 'Waktu', render: (r) => formatDateTime(r.at) },
                  { label: 'No. transaksi', render: (r) => <Mono>{r.no}</Mono> },
                  { label: 'Cabang', render: (r) => <CellStack main={r.tenant?.name ?? r.tenant_id} sub={r.tenant ? api.clientName(r.tenant.client_id) : '-'} /> },
                  { label: 'Kasir', render: (r) => r.cashier },
                  { label: 'Metode', render: (r) => <Badge tone={r.method === 'tunai' ? '' : 'info'}>{r.method === 'tunai' ? 'Tunai' : 'Non-tunai'}</Badge> },
                  { label: 'Total', align: 'num', render: (r) => formatRupiah(r.total) },
                  { label: 'Dibayar', align: 'num', render: (r) => formatRupiah(r.paid) },
                  { label: 'Kembali', align: 'num', render: (r) => formatRupiah(r.method === 'tunai' ? toNumber(r.paid) - toNumber(r.total) : 0) }
                ]}
              />
              <Pager total={total} limit={TRANSAKSI_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}

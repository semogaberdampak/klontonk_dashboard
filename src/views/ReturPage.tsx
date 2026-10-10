import { ALASAN_OPTIONS, JENIS_OPTIONS, LABEL_ALASAN, RETUR_LIMIT, useReturController } from '@/controllers/useReturController'
import { formatDateTime, formatNumber, formatRupiah, toNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Mono, Pager, Resource, Stat, StatGrid } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function ReturPage() {
  const c = useReturController()
  const { filters, api } = c
  const opsiCabang = api.tenantOptions({ clientId: filters.client || null, includeAll: true, withClient: !filters.client })

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
        <SelectField id="frClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={c.changeClient} />
        <SelectField id="frCabang" label="Cabang" value={c.draft.tenant} options={opsiCabang} onChange={(v) => c.setField('tenant', v)} />
        <InputField id="frDari" label="Dari tanggal" type="date" value={c.draft.dari} onChange={(v) => c.setField('dari', v)} />
        <InputField id="frSampai" label="Sampai tanggal" type="date" value={c.draft.sampai} onChange={(v) => c.setField('sampai', v)} />
        <SelectField id="frJenis" label="Jenis" value={c.draft.jenis} options={JENIS_OPTIONS} onChange={(v) => c.setField('jenis', v)} />
        <SelectField id="frAlasan" label="Alasan" value={c.draft.alasan} options={ALASAN_OPTIONS} onChange={(v) => c.setField('alasan', v)} />
        <InputField id="frCari" label="Cari no. / barang / kasir" value={c.draft.cari} placeholder="cth: RTR-2026" onChange={(v) => c.setField('cari', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total }) => (
          <>
            <StatGrid>
              <Stat label="Retur (filter)" value={formatNumber(total)} />
              <Stat label="Baris di halaman ini" value={formatNumber(rows.length)} />
              <Stat
                label="Total nilai di halaman"
                value={formatRupiah(rows.reduce((t, r) => t + toNumber(r.amount), 0))}
                note={`${formatNumber(rows.reduce((t, r) => t + toNumber(r.qty), 0))} unit`}
              />
            </StatGrid>
            <Card title="Riwayat retur" hint="Data hanya bisa dibaca -- retur dicatat lewat aplikasi POS.">
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.tenant_id}/${r.no}/${r.item_id}`}
                empty="Tidak ada retur pada periode/filter ini."
                columns={[
                  { label: 'Waktu', render: (r) => formatDateTime(r.at) },
                  { label: 'No. retur', render: (r) => <Mono>{r.no}</Mono> },
                  { label: 'Cabang', render: (r) => <CellStack main={r.tenant?.name ?? r.tenant_id} sub={r.tenant ? api.clientName(r.tenant.client_id) : '-'} /> },
                  { label: 'Jenis', render: (r) => <Badge tone={r.kind === 'pelanggan' ? 'ok' : 'warn'}>{r.kind === 'pelanggan' ? 'Dari pelanggan' : 'Ke supplier'}</Badge> },
                  { label: 'Barang', render: (r) => <CellStack main={r.name} sub={r.item_id} /> },
                  { label: 'Jumlah', align: 'num', render: (r) => `${formatNumber(r.qty)} ${r.unit}` },
                  { label: 'Nilai', align: 'num', render: (r) => formatRupiah(r.amount) },
                  { label: 'Alasan', render: (r) => LABEL_ALASAN[r.reason] ?? r.reason },
                  { label: 'Kasir', render: (r) => r.cashier },
                  { label: 'Catatan', render: (r) => r.note }
                ]}
              />
              <Pager total={total} limit={RETUR_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}

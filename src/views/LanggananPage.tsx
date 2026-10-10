import { LANGGANAN_LIMIT, STATUS_FILTER_OPTIONS, summarize, useLanggananController } from '@/controllers/useLanggananController'
import { daysLabel, formatDate, formatNumber, formatRupiah, subTone } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Pager, Resource, RowActions, Stat, StatGrid } from '@/components/ui'
import { FilterBar, SelectField } from '@/components/fields'

export function LanggananPage() {
  const c = useLanggananController()
  const { filters, api } = c

  return (
    <>
      <FilterBar
        onSubmit={c.apply}
        onClear={c.clear}
        trailing={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => void c.sinkron()}>
              Sinkronkan status
            </button>
            <button type="button" className="btn btn-primary" onClick={c.tambah}>
              + Langganan baru
            </button>
          </>
        }
      >
        <SelectField id="flClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={(v) => c.setField('client', v)} />
        <SelectField id="flStatus" label="Status" value={c.draft.status} options={STATUS_FILTER_OPTIONS} onChange={(v) => c.setField('status', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ riwayat, ringkas }) => {
          const ringkasan = summarize(ringkas)
          return (
            <>
              <StatGrid>
                <Stat label="Klien berlangganan" value={formatNumber(ringkasan.berlaku.length)} note={`${formatNumber(ringkasan.trial.length)} masih trial`} />
                <Stat label="Potensi / bulan" value={formatRupiah(ringkasan.potensi)} note="dari paket yang berlaku" />
                <Stat label="Perlu perhatian" value={formatNumber(ringkasan.perhatian.length)} tone={ringkasan.perhatian.length ? 'warning' : 'success'} />
              </StatGrid>

              <Card title="Langganan perlu perhatian" hint="Termasuk yang belum punya langganan sama sekali.">
                <DataTable
                  rows={ringkasan.perhatian}
                  rowKey={(r) => r.id}
                  empty="Semua langganan client masih jauh dari jatuh tempo."
                  columns={[
                    { label: 'Client', render: (r) => <CellStack strong main={r.name} sub={r.id} /> },
                    { label: 'Paket', render: (r) => r.plan_name },
                    { label: 'Harga / bulan', align: 'num', render: (r) => (r.price_month ? formatRupiah(r.price_month) : null) },
                    { label: 'Berakhir', render: (r) => formatDate(r.expires_at) },
                    { label: 'Sisa', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
                    { label: '', align: 'num', render: (r) => <RowActions buttons={[{ label: 'Riwayat', onClick: () => c.go('/langganan', { client: r.id }) }]} /> }
                  ]}
                />
              </Card>

              <Card title={`Riwayat langganan (${formatNumber(riwayat.total)})`} hint="Yang berlaku adalah baris dengan masa berakhir paling akhir.">
                <DataTable
                  rows={riwayat.rows}
                  rowKey={(r) => r.id}
                  empty="Belum ada catatan langganan."
                  columns={[
                    { label: 'Client', render: (r) => <CellStack main={r.client ? r.client.name : r.client_id} sub={r.client_id} /> },
                    { label: 'Paket', render: (r) => <CellStack main={r.plan ? r.plan.name : r.plan_code} sub={r.plan_code} /> },
                    { label: 'Mulai', render: (r) => formatDate(r.started_at) },
                    { label: 'Berakhir', render: (r) => formatDate(r.expires_at) },
                    { label: 'Status', render: (r) => <Badge tone={subTone(r.status, 1)}>{r.status}</Badge> },
                    { label: 'Catatan', render: (r) => r.note },
                    {
                      label: '',
                      align: 'num',
                      render: (r) => (
                        <RowActions
                          buttons={[
                            { label: 'Ubah', onClick: () => c.ubah(r) },
                            { label: '+30 hari', title: 'Perpanjang 30 hari dari tanggal berakhir / hari ini', onClick: () => void c.perpanjang(r) },
                            { label: 'Hapus', onClick: () => void c.hapus(r) }
                          ]}
                        />
                      )
                    }
                  ]}
                />
                <Pager total={riwayat.total} limit={LANGGANAN_LIMIT} offset={filters.offset} onGo={c.goPage} />
              </Card>
            </>
          )
        }}
      </Resource>
    </>
  )
}

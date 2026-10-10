import { CABANG_LIMIT, useCabangController } from '@/controllers/useCabangController'
import { formatNumber } from '@/lib/format'
import { Card, CellStack, DataTable, Mono, Pager, Resource, RowActions, Stat, StatGrid } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function CabangPage() {
  const c = useCabangController()
  const { filters, api } = c

  return (
    <>
      <FilterBar
        onSubmit={c.apply}
        onClear={c.clear}
        trailing={
          <button type="button" className="btn btn-primary" onClick={c.tambah}>
            + Tambah cabang
          </button>
        }
      >
        <SelectField id="fcClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={(v) => c.setField('client', v)} />
        <InputField id="fcCari" label="Cari nama cabang" grow value={c.draft.cari} placeholder="cth: cabang 2" onChange={(v) => c.setField('cari', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total, pengguna }) => (
          <>
            <StatGrid>
              <Stat label="Cabang terdaftar" value={formatNumber(api.data.tenants.length)} />
              <Stat label="Client" value={formatNumber(api.data.clients.length)} />
              <Stat label="Hasil filter" value={formatNumber(total)} />
            </StatGrid>
            <Card title={`Daftar cabang (${formatNumber(total)})`} hint="ID cabang dipakai aplikasi POS sebagai penanda tenant.">
              <DataTable
                rows={rows}
                rowKey={(r) => r.id}
                empty={filters.client || filters.cari ? 'Tidak ada cabang yang cocok dengan filter.' : 'Belum ada cabang. Tambahkan cabang pertama.'}
                columns={[
                  { label: 'ID', render: (r) => <Mono>{r.id}</Mono> },
                  { label: 'Cabang', render: (r) => <span className="cell-strong">{r.name}</span> },
                  { label: 'Client', render: (r) => <CellStack main={api.clientName(r.client_id)} sub={r.client_id} /> },
                  { label: 'Pengguna', align: 'num', render: (r) => formatNumber(pengguna[r.id] ?? 0) },
                  {
                    label: '',
                    align: 'num',
                    render: (r) => (
                      <RowActions
                        buttons={[
                          { label: 'Ubah nama', onClick: () => c.ubah(r) },
                          { label: 'Pengguna', onClick: () => c.go('/pengguna', { client: r.client_id, tenant: r.id }) },
                          { label: 'Hapus', onClick: () => void c.hapus(r) }
                        ]}
                      />
                    )
                  }
                ]}
              />
              <Pager total={total} limit={CABANG_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}

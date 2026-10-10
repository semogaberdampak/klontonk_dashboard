import { PENGGUNA_LIMIT, usePenggunaController } from '@/controllers/usePenggunaController'
import { formatDate } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Pager, Resource, RowActions } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function PenggunaPage() {
  const c = usePenggunaController()
  const { filters, api } = c
  const opsiCabang = api.tenantOptions({ clientId: filters.client || null, includeAll: true, withClient: !filters.client })

  return (
    <>
      <FilterBar
        onSubmit={c.apply}
        onClear={c.clear}
        trailing={
          <button type="button" className="btn btn-primary" onClick={c.tambah}>
            + Buat akun
          </button>
        }
      >
        <SelectField id="fpClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={c.changeClient} />
        <SelectField id="fpCabang" label="Cabang" value={c.draft.tenant} options={opsiCabang} onChange={(v) => c.setField('tenant', v)} />
        <InputField id="fpCari" label="Cari username / nama" grow value={c.draft.cari} placeholder="cth: c0001.budi" onChange={(v) => c.setField('cari', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total }) => (
          <>
            <div className="filters">
              <span className="hint">
                Total <strong>{total}</strong> akun. Login POS memakai username tanpa spasi, cth <span className="mono">@c0001.budi</span>.
              </span>
            </div>
            <Card title="Akun client" hint="Akun dibuat langsung di Supabase Auth, lalu dipasangkan ke cabang.">
              <DataTable
                rows={rows}
                rowKey={(r) => r.id}
                empty="Belum ada akun yang cocok. Buat akun untuk client terlebih dulu."
                columns={[
                  { label: 'Akun', render: (r) => <CellStack strong main={`@${r.username}`} sub={r.name} /> },
                  { label: 'Peran', render: (r) => <Badge tone={r.role === 'admin' ? 'info' : ''}>{r.role === 'admin' ? 'Admin' : 'Kasir'}</Badge> },
                  { label: 'Cabang', render: (r) => <CellStack main={api.tenant(r.tenant_id)?.name ?? r.tenant_id} sub={r.tenant_id} /> },
                  { label: 'Client', render: (r) => api.clientName(api.tenant(r.tenant_id)?.client_id) },
                  { label: 'Dibuat', render: (r) => formatDate(r.created_at) },
                  {
                    label: '',
                    align: 'num',
                    render: (r) => (
                      <RowActions buttons={[{ label: 'Ubah', onClick: () => c.ubah(r) }, { label: 'Hapus', onClick: () => void c.hapus(r) }]} />
                    )
                  }
                ]}
              />
              <Pager total={total} limit={PENGGUNA_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}


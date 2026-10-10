import { STATUS_OPTIONS, statusTone, useKlienController, KLIEN_LIMIT } from '@/controllers/useKlienController'
import { daysLabel, formatNumber, formatRupiah, subTone } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Pager, Resource, RowActions } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function KlienPage() {
  const c = useKlienController()
  const { filters } = c

  return (
    <>
      <FilterBar
        onSubmit={c.apply}
        onClear={c.clear}
        trailing={
          <button type="button" className="btn btn-primary" onClick={c.tambah}>
            + Tambah client
          </button>
        }
      >
        <InputField id="fkCari" label="Cari nama client" grow value={c.draft.cari} placeholder="cth: warung" onChange={(v) => c.setField('cari', v)} />
        <SelectField id="fkStatus" label="Status" value={c.draft.status} options={STATUS_OPTIONS} onChange={(v) => c.setField('status', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total }) => (
          <Card title={`Daftar client (${formatNumber(total)})`} hint="Angka cabang, pengguna, dan omzet dihitung oleh database.">
            <DataTable
              rows={rows}
              rowKey={(r) => r.id}
              empty={filters.cari || filters.status ? 'Tidak ada client yang cocok dengan filter.' : 'Belum ada client. Tambahkan client pertama.'}
              columns={[
                { label: 'Client', render: (r) => <CellStack strong main={r.name} sub={r.id} /> },
                {
                  label: 'Kontak',
                  render: (r) => {
                    const kontak = [r.contact_name, r.contact_phone].filter(Boolean).join(' / ')
                    return kontak || <span className="cell-sub">belum diisi</span>
                  }
                },
                { label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
                { label: 'Paket', render: (r) => (r.plan_name ? <CellStack main={r.plan_name} sub={r.plan_code} /> : null) },
                { label: 'Langganan', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
                { label: 'Cabang', align: 'num', render: (r) => formatNumber(r.branch_count) },
                { label: 'Pengguna', align: 'num', render: (r) => formatNumber(r.user_count) },
                { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
                {
                  label: '',
                  align: 'num',
                  render: (r) => (
                    <RowActions
                      buttons={[
                        { label: 'Ubah', onClick: () => c.ubah(r) },
                        { label: 'Cabang', onClick: () => c.go('/cabang', { client: r.id }) },
                        { label: 'Langganan', onClick: () => c.go('/langganan', { client: r.id }) },
                        r.status === 'aktif'
                          ? { label: 'Nonaktifkan', title: 'Tandai client tidak aktif', onClick: () => void c.ubahStatus(r, 'suspend') }
                          : { label: 'Aktifkan', title: 'Tandai client aktif kembali', onClick: () => void c.ubahStatus(r, 'aktif') }
                      ]}
                    />
                  )
                }
              ]}
            />
            <Pager total={total} limit={KLIEN_LIMIT} offset={filters.offset} onGo={c.goPage} />
          </Card>
        )}
      </Resource>
    </>
  )
}

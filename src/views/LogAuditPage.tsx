import { AKSI_OPTIONS, AUDIT_LIMIT, toneAksi, useLogAuditController } from '@/controllers/useLogAuditController'
import { formatDateTime, formatNumber, prettyDetail, relTime } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Pager, Resource, RowActions, Stat, StatGrid } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function LogAuditPage() {
  const c = useLogAuditController()
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
        <SelectField id="faClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={c.changeClient} />
        <SelectField id="faCabang" label="Cabang" value={c.draft.tenant} options={opsiCabang} onChange={(v) => c.setField('tenant', v)} />
        <SelectField id="faAksi" label="Aksi" value={c.draft.aksi} options={AKSI_OPTIONS} onChange={(v) => c.setField('aksi', v)} />
        <InputField id="faPelaku" label="Pelaku" value={c.draft.pelaku} placeholder="cth: Budi" onChange={(v) => c.setField('pelaku', v)} />
        <InputField id="faDari" label="Dari" type="date" value={c.draft.dari} onChange={(v) => c.setField('dari', v)} />
        <InputField id="faSampai" label="Sampai" type="date" value={c.draft.sampai} onChange={(v) => c.setField('sampai', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total }) => (
          <>
            <StatGrid>
              <Stat label="Baris log (filter)" value={formatNumber(total)} />
              <Stat label="Periode" value={`${filters.dari || 'awal'} sd ${filters.sampai || 'sekarang'}`} note="default 7 hari terakhir" />
              <Stat label="Halaman" value={`${formatNumber(rows.length)} baris`} />
            </StatGrid>
            <Card title="Log audit" hint="Termasuk perubahan stok/harga oleh kasir, penjualan, retur, dan akun. Tidak bisa disunting atau dihapus.">
              <DataTable
                rows={rows}
                rowKey={(r, i) => `${r.at}/${i}`}
                empty="Tidak ada aktivitas pada periode/filter ini."
                columns={[
                  { label: 'Waktu', render: (r) => <CellStack main={relTime(r.at)} sub={formatDateTime(r.at)} /> },
                  { label: 'Pelaku', render: (r) => <CellStack main={r.actor_name || '-'} sub={r.actor_role} /> },
                  { label: 'Aksi', render: (r) => <Badge tone={toneAksi(r.action)}>{r.action}</Badge> },
                  { label: 'Objek', render: (r) => <CellStack main={r.entity} sub={r.entity_id} /> },
                  {
                    label: 'Cabang / client',
                    render: (r) => {
                      const bagian: string[] = []
                      if (r.tenant_id) {
                        const t = api.tenant(r.tenant_id)
                        bagian.push(t ? `${t.name} (${r.tenant_id})` : r.tenant_id)
                      }
                      if (r.client_id) bagian.push(api.clientName(r.client_id))
                      return bagian.join(' - ') || '-'
                    }
                  },
                  { label: 'Rincian', render: (r) => <span className="detail-cell">{prettyDetail(r.detail)}</span> },
                  { label: '', align: 'num', render: (r) => <RowActions buttons={[{ label: 'Detail', onClick: () => void c.detail(r) }]} /> }
                ]}
              />
              <Pager total={total} limit={AUDIT_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}

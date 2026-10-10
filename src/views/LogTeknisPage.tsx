import { LEVEL_OPTIONS, TEKNIS_LIMIT, levelTone, useLogTeknisController } from '@/controllers/useLogTeknisController'
import { formatDateTime, formatNumber, relTime } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Pager, Resource, RowActions, Stat, StatGrid } from '@/components/ui'
import { FilterBar, InputField, SelectField } from '@/components/fields'

export function LogTeknisPage() {
  const c = useLogTeknisController()
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
        <SelectField id="feLevel" label="Level" value={c.draft.level} options={LEVEL_OPTIONS} onChange={(v) => c.setField('level', v)} />
        <SelectField id="feClient" label="Client" value={c.draft.client} options={api.clientOptions({ includeAll: true })} onChange={c.changeClient} />
        <SelectField id="feCabang" label="Cabang" value={c.draft.tenant} options={opsiCabang} onChange={(v) => c.setField('tenant', v)} />
        <InputField id="feCari" label="Cari pesan" value={c.draft.cari} placeholder="cth: gagal simpan" onChange={(v) => c.setField('cari', v)} />
        <InputField id="feDari" label="Dari" type="date" value={c.draft.dari} onChange={(v) => c.setField('dari', v)} />
        <InputField id="feSampai" label="Sampai" type="date" value={c.draft.sampai} onChange={(v) => c.setField('sampai', v)} />
      </FilterBar>

      <Resource state={c.state}>
        {({ rows, total, hitung }) => (
          <>
            <StatGrid>
              <Stat label="Error" value={formatNumber(hitung.error)} tone={hitung.error ? 'danger' : 'success'} />
              <Stat label="Peringatan" value={formatNumber(hitung.warn)} tone={hitung.warn ? 'warning' : ''} />
              <Stat label="Info" value={formatNumber(hitung.info)} />
            </StatGrid>
            <Card title="Log teknis dari perangkat client" hint="Dikirim aplikasi POS lewat rpc(report_event). Belum otomatis -- lihat README bagian integrasi POS.">
              <DataTable
                rows={rows}
                rowKey={(r, i) => `${r.at}/${i}`}
                empty="Tidak ada log teknis pada periode/filter ini."
                columns={[
                  { label: 'Waktu', render: (r) => <CellStack main={relTime(r.at)} sub={formatDateTime(r.at)} /> },
                  { label: 'Level', render: (r) => <Badge tone={levelTone(r.level)}>{r.level.toUpperCase()}</Badge> },
                  { label: 'Sumber', render: (r) => r.source },
                  { label: 'Pesan', render: (r) => <span className="detail-cell">{r.message}</span> },
                  {
                    label: 'Cabang / client',
                    render: (r) => {
                      const bagian: string[] = []
                      if (r.tenant_id) bagian.push(api.tenant(r.tenant_id)?.name ?? r.tenant_id)
                      if (r.client_id) bagian.push(api.clientName(r.client_id))
                      return bagian.join(' - ') || '-'
                    }
                  },
                  { label: 'Versi / perangkat', render: (r) => <CellStack main={r.app_version || '-'} sub={r.device} /> },
                  { label: '', align: 'num', render: (r) => <RowActions buttons={[{ label: 'Detail', onClick: () => void c.detail(r) }]} /> }
                ]}
              />
              <Pager total={total} limit={TEKNIS_LIMIT} offset={filters.offset} onGo={c.goPage} />
            </Card>
          </>
        )}
      </Resource>
    </>
  )
}

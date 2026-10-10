import { totalUsage, usePemakaianController, type PemakaianData } from '@/controllers/usePemakaianController'
import { useLookups } from '@/context/LookupsContext'
import { daysLabel, formatDate, formatNumber, formatRupiah, subTone, toNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Resource, RowActions, Stat, StatGrid } from '@/components/ui'
import { Field, InputField } from '@/components/fields'

type Controller = ReturnType<typeof usePemakaianController>

function ErrorCount({ value }: { value: Parameters<typeof toNumber>[0] }) {
  return toNumber(value) ? <Badge tone="bad">{formatNumber(value)}</Badge> : <>0</>
}

function Overview({ data, controller }: { data: PemakaianData; controller: Controller }) {
  return (
    <Card title="Pemakaian semua client (30 hari terakhir)" hint="Pilih client untuk melihat rincian harian.">
      <DataTable
        rows={data.daftar}
        rowKey={(r) => r.id}
        empty="Belum ada client."
        columns={[
          { label: 'Client', render: (r) => <CellStack strong main={r.name} sub={r.id} /> },
          { label: 'Cabang', align: 'num', render: (r) => formatNumber(r.branch_count) },
          { label: 'Pengguna', align: 'num', render: (r) => formatNumber(r.user_count) },
          { label: 'Trx 30 hari', align: 'num', render: (r) => formatNumber(r.trx_30d) },
          { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
          { label: 'Log 7 hari', align: 'num', render: (r) => formatNumber(r.logs_7d) },
          { label: 'Error 7 hari', align: 'num', render: (r) => <ErrorCount value={r.errors_7d} /> },
          { label: 'Langganan', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
          { label: '', align: 'num', render: (r) => <RowActions buttons={[{ label: 'Lihat pemakaian', onClick: () => controller.pilih(r.id) }]} /> }
        ]}
      />
    </Card>
  )
}

function Detail({ data, controller }: { data: PemakaianData; controller: Controller }) {
  const { filters } = controller
  const k = data.klien
  const total = totalUsage(data.harian)

  return (
    <>
      <StatGrid>
        <Stat label="Transaksi" value={formatNumber(total.trx)} note={`${filters.dari} sd ${filters.sampai}`} />
        <Stat label="Omzet" value={formatRupiah(total.omzet)} />
        <Stat label="Retur" value={formatNumber(total.retur)} note={formatRupiah(total.nilaiRetur)} />
        <Stat label="Log audit" value={formatNumber(total.log)} />
        <Stat label="Error teknis" value={formatNumber(total.error)} tone={total.error ? 'danger' : 'success'} />
      </StatGrid>
      <Card title={`Client: ${k?.name ?? filters.client}`}>
        <DataTable
          rows={k ? [k] : []}
          rowKey={(r) => r.id}
          columns={[
            { label: 'Paket', render: (r) => <CellStack main={r.plan_name || '-'} sub={r.plan_code} /> },
            { label: 'Status client', render: (r) => <Badge tone={r.status === 'aktif' ? 'ok' : 'warn'}>{r.status}</Badge> },
            { label: 'Langganan', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
            { label: 'Cabang', align: 'num', render: (r) => formatNumber(r.branch_count) },
            { label: 'Pengguna', align: 'num', render: (r) => formatNumber(r.user_count) }
          ]}
        />
      </Card>
      <Card title="Aktivitas harian" hint="Dihitung database (RPC usage_daily).">
        <DataTable
          rows={data.harian}
          rowKey={(r) => r.day}
          empty="Tidak ada aktivitas pada periode ini."
          columns={[
            { label: 'Tanggal', render: (r) => formatDate(r.day) },
            { label: 'Transaksi', align: 'num', render: (r) => formatNumber(r.trx_count) },
            { label: 'Omzet', align: 'num', render: (r) => formatRupiah(r.trx_total) },
            { label: 'Retur', align: 'num', render: (r) => formatNumber(r.return_count) },
            { label: 'Nilai retur', align: 'num', render: (r) => formatRupiah(r.return_amount) },
            { label: 'Log audit', align: 'num', render: (r) => formatNumber(r.log_count) },
            { label: 'Error', align: 'num', render: (r) => <ErrorCount value={r.event_count} /> }
          ]}
        />
      </Card>
    </>
  )
}

export function PemakaianPage() {
  const controller = usePemakaianController()
  const { api } = useLookups()
  const { filters, draft } = controller

  return (
    <>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault()
          controller.apply()
        }}
      >
        <Field id="fpmClient" label="Client" grow>
          <select id="fpmClient" value={draft.client} onChange={(e) => controller.changeClient(e.target.value)}>
            <option value="">Pilih client...</option>
            {api.clientOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <InputField id="fpmDari" label="Dari" type="date" value={draft.dari} onChange={(v) => controller.setField('dari', v)} />
        <InputField id="fpmSampai" label="Sampai" type="date" value={draft.sampai} onChange={(v) => controller.setField('sampai', v)} />
        <button type="submit" className="btn btn-primary">
          Terapkan
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => controller.lastDays(30)}>
          30 hari
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => controller.lastDays(90)}>
          90 hari
        </button>
        <button type="button" className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={controller.exportCsv}>
          Unduh CSV
        </button>
      </form>

      <Resource state={controller.state}>
        {(data) => (filters.client ? <Detail data={data} controller={controller} /> : <Overview data={data} controller={controller} />)}
      </Resource>
    </>
  )
}

import { useRingkasanController, alasanPerhatian, needsAttention, sumOf, type RingkasanData } from '@/controllers/useRingkasanController'
import { daysLabel, formatDateTime, formatNumber, formatRupiah, prettyDetail, relTime, subTone, toNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Resource, RowActions, Stat, StatGrid } from '@/components/ui'

function Content({ data, go }: { data: RingkasanData; go: ReturnType<typeof useRingkasanController>['go'] }) {
  const { klien, aktivitas, errors } = data

  if (!klien.length) {
    return (
      <Card title="Belum ada client" hint="Tambahkan client pertama untuk mulai memantau.">
        <p className="muted">Satu client mewakili satu pelanggan berlangganan, dan boleh memiliki beberapa cabang.</p>
        <button type="button" className="btn btn-primary" onClick={() => go('/klien')}>
          Tambah client
        </button>
      </Card>
    )
  }

  const perluPerhatian = klien.filter(needsAttention)
  const totalError = sumOf(klien, 'errors_7d')

  return (
    <>
      <StatGrid>
        <Stat label="Client" value={formatNumber(klien.length)} note={`${formatNumber(klien.filter((c) => c.status === 'aktif').length)} aktif`} />
        <Stat label="Cabang" value={formatNumber(sumOf(klien, 'branch_count'))} />
        <Stat label="Pengguna" value={formatNumber(sumOf(klien, 'user_count'))} />
        <Stat label="Transaksi 30 hari" value={formatNumber(sumOf(klien, 'trx_30d'))} />
        <Stat label="Omzet 30 hari" value={formatRupiah(sumOf(klien, 'omzet_30d'))} />
        <Stat label="Perlu perhatian" value={formatNumber(perluPerhatian.length)} tone={perluPerhatian.length ? 'warning' : 'success'} />
        <Stat label="Error 7 hari" value={formatNumber(totalError)} tone={totalError ? 'danger' : 'success'} />
      </StatGrid>

      <Card title="Perlu perhatian" hint="Client yang bermasalah atau langganannya mendekati akhir.">
        <DataTable
          rows={perluPerhatian}
          rowKey={(r) => r.id}
          empty="Semua client sehat -- tidak ada yang perlu perhatian."
          columns={[
            { label: 'Client', render: (r) => <CellStack strong main={r.name} sub={r.id} /> },
            { label: 'Alasan', render: (r) => alasanPerhatian(r) },
            { label: 'Langganan', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
            {
              label: 'Batch',
              align: 'num',
              render: (r) => (
                <RowActions
                  buttons={[
                    { label: 'Pemakaian', onClick: () => go('/pemakaian', { client: r.id }) },
                    { label: 'Langganan', onClick: () => go('/langganan', { client: r.id }) }
                  ]}
                />
              )
            }
          ]}
        />
      </Card>

      <Card title="Semua client">
        <DataTable
          rows={klien}
          rowKey={(r) => r.id}
          columns={[
            { label: 'Client', render: (r) => <CellStack strong main={r.name} sub={r.id} /> },
            { label: 'Paket', render: (r) => (r.plan_name ? <CellStack main={r.plan_name} sub={r.plan_code} /> : null) },
            { label: 'Cabang', align: 'num', render: (r) => formatNumber(r.branch_count) },
            { label: 'Pengguna', align: 'num', render: (r) => formatNumber(r.user_count) },
            { label: 'Sisa langganan', render: (r) => <Badge tone={subTone(r.sub_status, r.days_left)}>{daysLabel(r.days_left)}</Badge> },
            { label: 'Trx 30 hari', align: 'num', render: (r) => formatNumber(r.trx_30d) },
            { label: 'Omzet 30 hari', align: 'num', render: (r) => formatRupiah(r.omzet_30d) },
            { label: 'Error 7 hari', align: 'num', render: (r) => (toNumber(r.errors_7d) > 0 ? <Badge tone="bad">{formatNumber(r.errors_7d)}</Badge> : '0') },
            { label: '', align: 'num', render: (r) => <RowActions buttons={[{ label: 'Log', onClick: () => go('/log-audit', { client: r.id }) }]} /> }
          ]}
        />
      </Card>

      <div className="grid-2">
        <Card title="Aktivitas terbaru" hint="Dicatat otomatis oleh database.">
          <DataTable
            rows={aktivitas ?? []}
            rowKey={(_, i) => i}
            empty={aktivitas ? 'Belum ada aktivitas tercatat.' : 'Log audit belum bisa dibaca.'}
            columns={[
              { label: 'Waktu', render: (r) => <CellStack main={relTime(r.at)} sub={formatDateTime(r.at)} /> },
              { label: 'Pelaku', render: (r) => <CellStack main={r.actor_name || '-'} sub={r.actor_role} /> },
              { label: 'Aksi', render: (r) => <Badge tone="info">{r.action}</Badge> },
              { label: 'Objek', render: (r) => <CellStack main={r.entity} sub={r.entity_id} /> },
              { label: 'Rincian', render: (r) => <span className="detail-cell">{prettyDetail(r.detail)}</span> }
            ]}
          />
        </Card>
        <Card title="Error terbaru dari client">
          <DataTable
            rows={errors ?? []}
            rowKey={(_, i) => i}
            empty={errors ? 'Tidak ada error dari client. Bagus.' : 'Log teknis belum bisa dibaca.'}
            columns={[
              { label: 'Waktu', render: (r) => relTime(r.at) },
              { label: 'Sumber', render: (r) => <Badge tone="warn">{r.source}</Badge> },
              { label: 'Pesan', render: (r) => <span className="detail-cell">{r.message}</span> },
              { label: 'Versi', render: (r) => r.app_version || '-' }
            ]}
          />
        </Card>
      </div>
    </>
  )
}

export function RingkasanPage() {
  const { state, go } = useRingkasanController()
  return <Resource state={state}>{(data) => <Content data={data} go={go} />}</Resource>
}

import { usePengaturanController } from '@/controllers/usePengaturanController'
import { APP_VERSION, EMAIL_DOMAIN, PAGE_SIZE, SUPABASE_URL } from '@/config'
import { formatNumber } from '@/lib/format'
import { Badge, Card, CellStack, DataTable, Mono, Resource } from '@/components/ui'

export function PengaturanPage() {
  const c = usePengaturanController()
  const { admin } = c

  return (
    <>
      <Card title="Akun Anda">
        <DataTable
          rows={[admin ?? { id: '-', name: '-', email: null }]}
          rowKey={(r) => r.id}
          columns={[
            { label: 'Admin platform', render: (r) => <CellStack strong main={r.name || '-'} sub={r.email || 'email tidak tercatat'} /> },
            { label: 'ID pengguna', render: (r) => <Mono>{r.id}</Mono> },
            { label: 'Peran', render: () => <Badge tone="ok">superadmin</Badge> }
          ]}
        />
      </Card>

      <div className="grid-2">
        <Card title="Sistem">
          <DataTable
            rows={[0]}
            rowKey={() => 'sistem'}
            columns={[
              { label: 'Aplikasi', render: () => `Klontonk Dashboard v${APP_VERSION}` },
              { label: 'Server data', render: () => <Mono>{SUPABASE_URL}</Mono> },
              { label: 'Mode data', render: () => <Badge tone="info">multi-tenant (1 database)</Badge> },
              { label: 'Domain akun client', render: () => <Mono>@{EMAIL_DOMAIN}</Mono> },
              { label: 'Baris per halaman', render: () => formatNumber(PAGE_SIZE) }
            ]}
          />
        </Card>
        <Card title="Kuota data terpakai">
          <Resource state={c.state}>
            {(jumlah) => (
              <DataTable
                rows={[
                  { label: 'Client', nilai: jumlah.klien },
                  { label: 'Cabang', nilai: jumlah.cabang },
                  { label: 'Pengguna', nilai: jumlah.pengguna },
                  { label: 'Baris log audit', nilai: jumlah.logAudit },
                  { label: 'Baris log teknis', nilai: jumlah.logTeknis }
                ]}
                rowKey={(r) => r.label}
                columns={[
                  { label: 'Data', render: (r) => r.label },
                  { label: 'Jumlah', align: 'num', render: (r) => (r.nilai === null ? 'tidak terbaca' : formatNumber(r.nilai)) }
                ]}
              />
            )}
          </Resource>
        </Card>
      </div>

      <Card title="Retensi log">
        <div className="filters">
          <div className="field">
            <label htmlFor="rpAudit">Simpan log audit (hari)</label>
            <input id="rpAudit" type="number" min={30} max={3650} value={c.auditDays} onChange={(e) => c.setAuditDays(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rpEvent">Simpan log teknis (hari)</label>
            <input id="rpEvent" type="number" min={7} max={3650} value={c.eventDays} onChange={(e) => c.setEventDays(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void c.pangkas()}>
            Pangkas log lama
          </button>
        </div>
        <p className="hint">
          Minimal 30 hari (log audit) dan 7 hari (log teknis). Pada Free plan (500 MB), pemangkasan berkala menjaga aplikasi tetap ringan. Log yang dipangkas tidak bisa dikembalikan -- unduh CSV dulu bila perlu arsip.
        </p>
      </Card>

      <Card title="Cache aplikasi">
        <p className="muted">Cache dipakai agar dashboard tetap bisa dibuka saat koneksi bermasalah. Bersihkan bila tampilan terasa "nyangkut" di versi lama.</p>
        <div className="filters">
          <button type="button" className="btn btn-secondary" onClick={() => void c.bersihkanCache()}>
            Bersihkan cache aplikasi
          </button>
        </div>
        <p className="hint">
          Darurat (bila tampilan benar-benar tidak bisa dipakai): buka <span className="mono">index.html?reset-cache=1</span>. Setiap rilis, naikkan <span className="mono">CACHE_NAME</span> di public/sw.js agar semua perangkat mengambil versi baru.
        </p>
      </Card>

      <Card title="Batasan & catatan Free plan">
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            <strong>Free plan:</strong> 500 MB database, 1 GB file, 5 GB transfer, retensi log platform 1 hari.
          </li>
          <li>
            <strong>Proyek Free akan di-pause bila tidak ada aktivitas selama 1 minggu.</strong> Karena project ini dipakai POS setiap hari, risikonya kecil -- tetapi perhatikan saat semua client libur panjang.
          </li>
          <li>
            Retensi log platform 1 hari berarti log bawaan Supabase tidak bisa dijadikan arsip; itulah mengapa dashboard ini menyimpan log sendiri di tabel <span className="mono">audit_logs</span> dan <span className="mono">client_events</span>.
          </li>
          <li>Fitur membaca log platform Supabase (Auth/Postgres) menunggu naik ke Pro + Edge Function, karena butuh kunci rahasia di sisi server.</li>
        </ul>
      </Card>
    </>
  )
}

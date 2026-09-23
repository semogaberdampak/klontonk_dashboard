import { fetchAll } from './supabase.js';

// ============ DAFTAR ACUAN (klien, paket, cabang) ============
// Dimuat sekali lalu dipakai ulang oleh semua halaman untuk isian dropdown dan filter.
// Daftarnya kecil (puluhan baris) sehingga aman disimpan di memori. RLS tetap berlaku:
// client hanya menerima daftar miliknya sendiri, superadmin menerima semuanya.

const state = { clients: [], plans: [], tenants: [], loaded: false, error: null };

export const Lookups = {
  isLoaded() { return state.loaded; },
  error() { return state.error; },

  async load(force = false) {
    if (state.loaded && !force) return { success: true };

    const [clients, plans, tenants] = await Promise.all([
      fetchAll('clients?select=id,name,status&order=id'),
      fetchAll('plans?select=code,name,price_month,max_branches,max_users,is_active&order=code'),
      fetchAll('tenants?select=id,name,client_id&order=id')
    ]);

    const gagal = [clients, plans, tenants].find((hasil) => !hasil.ok);
    if (gagal) {
      state.error = gagal.message;
      return { success: false, error: gagal.message, expired: !!gagal.expired };
    }

    state.clients = clients.data;
    state.plans = plans.data;
    state.tenants = tenants.data;
    state.loaded = true;
    state.error = null;
    return { success: true };
  },

  invalidate() { state.loaded = false; },

  clients() { return state.clients.slice(); },
  plans() { return state.plans.slice(); },
  tenants() { return state.tenants.slice(); },

  client(id) { return state.clients.find((c) => c.id === id) || null; },
  clientName(id) { const c = this.client(id); return c ? c.name : (id || '-'); },

  plan(code) { return state.plans.find((p) => p.code === code) || null; },
  planName(code) { const p = this.plan(code); return p ? p.name : (code || '-'); },

  tenant(id) { return state.tenants.find((t) => t.id === id) || null; },

  clientOptions({ includeAll = false, allLabel = 'Semua klien', status = null } = {}) {
    const opsi = state.clients
      .filter((c) => !status || c.status === status)
      .map((c) => ({ value: c.id, label: `${c.id} - ${c.name}` }));
    return includeAll ? [{ value: '', label: allLabel }, ...opsi] : opsi;
  },

  planOptions({ includeAll = false, allLabel = 'Semua paket', activeOnly = false, excludeInternal = false } = {}) {
    const opsi = state.plans
      .filter((p) => (!activeOnly || p.is_active) && (!excludeInternal || p.code !== 'internal'))
      .map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }));
    return includeAll ? [{ value: '', label: allLabel }, ...opsi] : opsi;
  },

  tenantsOf(clientId = null) {
    return state.tenants.filter((t) => !clientId || t.client_id === clientId);
  },

  tenantOptions({ clientId = null, includeAll = false, allLabel = 'Semua cabang', withClient = false } = {}) {
    const opsi = this.tenantsOf(clientId).map((t) => ({
      value: t.id,
      label: withClient ? `${t.name} (${t.id}) - ${this.clientName(t.client_id)}` : `${t.name} (${t.id})`
    }));
    return includeAll ? [{ value: '', label: allLabel }, ...opsi] : opsi;
  },

  // "Cabang (T00x)" untuk kolom tabel.
  tenantLabel(id, { withClient = false } = {}) {
    const t = this.tenant(id);
    if (!t) return id || '-';
    return withClient ? `${t.name} - ${this.clientName(t.client_id)}` : `${t.name} (${t.id})`;
  }
};
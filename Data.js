/* ══════════════════════════════════════════════════════
   AGAR Admin — data.js
   Handles all communication with the backend API.
   Exposes a global `Store` object used by app.js.
   ══════════════════════════════════════════════════════ */

const API_BASE = '/api/agar/site';

/* ── Helpers ── */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

/* ── In-memory state ── */
const Store = {
  data: null,          // full site object from DB
  dirty: false,        // unsaved changes flag

  /* ── Load from backend ── */
  async load() {
    const site = await apiFetch(API_BASE);
    // translations comes as a Map-like object from Mongoose; normalize to plain obj
    if (site.translations && typeof site.translations === 'object' && !Array.isArray(site.translations)) {
      // already plain object from JSON serialization
    }
    Store.data  = site;
    Store.dirty = false;
    return site;
  },

  /* ── Save to backend ── */
  async save() {
    const { heroSlides, categories, products, team, partners, translations } = Store.data;
    const saved = await apiFetch(API_BASE, {
      method: 'PUT',
      body: JSON.stringify({ heroSlides, categories, products, team, partners, translations }),
    });
    Store.dirty = false;
    return saved;
  },

  /* ── Reset to defaults ── */
  async reset() {
    const result = await apiFetch(API_BASE + '/reset', { method: 'POST' });
    Store.data  = result.site;
    Store.dirty = false;
    return result.site;
  },

  /* ── Mark dirty (triggers save-status UI) ── */
  markDirty() {
    Store.dirty = true;
    if (typeof onStoreDirty === 'function') onStoreDirty();
  },

  /* ── Shorthand getters ── */
  get heroSlides()   { return Store.data?.heroSlides   ?? []; },
  get categories()   { return Store.data?.categories   ?? []; },
  get products()     { return Store.data?.products     ?? []; },
  get team()         { return Store.data?.team         ?? []; },
  get partners()     { return Store.data?.partners     ?? []; },
  get translations() { return Store.data?.translations ?? {}; },

  /* ── ID generator ── */
  uid: (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
};

window.Store = Store;
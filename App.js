/* ══════════════════════════════════════════════════════
   AGAR Admin — app.js
   All UI logic. Depends on data.js (Store global).
   ══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  setSaveStatus('loading');
  try {
    await Store.load();
    renderAll();
    setSaveStatus('saved');
  } catch (e) {
    setSaveStatus('error', e.message);
    showToast('⚠ ' + e.message);
  }
  bindNav();
  bindTopbar();
  bindModal();
  buildMobileTabs();
});

/* ════════════════════════════════════════════════════
   SAVE STATUS
════════════════════════════════════════════════════ */
function setSaveStatus(state, msg) {
  const el   = document.getElementById('saveStatus');
  const text = document.getElementById('saveStatusText');
  if (!el) return;
  el.className = 'save-status' + (state === 'saving' ? ' saving' : '');
  const pulse = el.querySelector('.pulse');
  if (pulse) {
    pulse.style.background =
      state === 'saved'   ? 'var(--olive-light)' :
      state === 'saving'  ? '#c9a23f' :
      state === 'error'   ? 'var(--danger)'  :
      state === 'loading' ? 'rgba(255,255,255,0.3)' : 'var(--olive-light)';
  }
  text.textContent =
    state === 'saved'   ? 'All changes saved'  :
    state === 'saving'  ? 'Saving…'             :
    state === 'error'   ? (msg || 'Save failed') :
    state === 'loading' ? 'Loading…'            : '';
}

/* Called by Store when markDirty() fires — auto-save after 1.5 s */
window.onStoreDirty = debounce(async () => {
  setSaveStatus('saving');
  try {
    await Store.save();
    setSaveStatus('saved');
    showToast('Saved');
  } catch (e) {
    setSaveStatus('error', e.message);
    showToast('Save failed: ' + e.message);
  }
}, 1500);

/* ════════════════════════════════════════════════════
   NAV / TABS
════════════════════════════════════════════════════ */
function bindNav() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
  if (tab === 'categories') showCatLevel(1);
}

function buildMobileTabs() {
  const src  = document.querySelector('.sidebar');
  const dest = document.getElementById('mobileTabs');
  if (!src || !dest) return;
  dest.innerHTML = src.innerHTML;
  dest.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ════════════════════════════════════════════════════
   TOPBAR ACTIONS  (Save / Export / Import / Reset)
════════════════════════════════════════════════════ */
function bindTopbar() {
  // Manual save
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      setSaveStatus('saving');
      try { await Store.save(); setSaveStatus('saved'); showToast('Saved'); }
      catch (e) { setSaveStatus('error', e.message); showToast('Save failed'); }
    });
  }

  // Export JSON
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'agar-site-data.json' });
      a.click();
    });
  }

  // Import JSON
  const importBtn  = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          Store.data = parsed;
          Store.markDirty();
          renderAll();
          showToast('Imported & saved');
        } catch { showToast('Invalid JSON file'); }
      };
      reader.readAsText(file);
      importFile.value = '';
    });
  }

  // Reset
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset everything to factory defaults? This cannot be undone.')) return;
      setSaveStatus('saving');
      try {
        await Store.reset();
        renderAll();
        setSaveStatus('saved');
        showToast('Reset to defaults');
      } catch (e) { setSaveStatus('error', e.message); showToast('Reset failed'); }
    });
  }
}

/* ════════════════════════════════════════════════════
   RENDER ALL PANELS
════════════════════════════════════════════════════ */
function renderAll() {
  renderHero();
  renderCategories();
  renderProducts();
  renderTeam();
  renderPartners();
  renderTranslations();
  updateCounts();
}

function updateCounts() {
  const set = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  set('count-hero',         Store.heroSlides.length);
  set('count-categories',   Store.categories.length);
  set('count-products',     Store.products.length);
  set('count-team',         Store.team.length);
  set('count-partners',     Store.partners.length);
  set('count-translations', Object.keys(Store.translations).length);
}

/* ════════════════════════════════════════════════════
   HERO SLIDES
════════════════════════════════════════════════════ */
function renderHero() {
  const list = document.getElementById('list-hero');
  if (!list) return;
  if (!Store.heroSlides.length) { list.innerHTML = emptyState('Images', 'No hero slides yet. Add one to get started.'); return; }

  list.innerHTML = Store.heroSlides.map((s, i) => `
    <div class="item-row" draggable="true" data-idx="${i}" data-type="hero">
      <div class="drag-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg></div>
      ${thumbHTML(s.img)}
      <div class="item-info">
        <h4>${esc(s.title_en) || '<span style="opacity:.4">No title</span>'}</h4>
        <div class="meta"><span class="ar">${esc(s.title_ar)}</span></div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="editHero(${i})">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteItem('heroSlides',${i})">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
        </button>
      </div>
    </div>`).join('');

  initDrag(list, 'heroSlides', renderHero);
}

function editHero(i) {
  const s = i === -1 ? { id: Store.uid('hs'), img: '', title_en: '', title_ar: '' } : { ...Store.heroSlides[i] };
  openModal(i === -1 ? 'Add Slide' : 'Edit Slide', `
    ${fieldImg('img', s.img, 'Image URL')}
    ${field('title_en', s.title_en, 'Title', 'EN')}
    ${field('title_ar', s.title_ar, 'Title', 'AR', true)}
  `, () => {
    s.img      = val('img');
    s.title_en = val('title_en');
    s.title_ar = val('title_ar');
    if (i === -1) Store.heroSlides.push(s); else Store.heroSlides[i] = s;
    Store.markDirty(); renderHero(); updateCounts();
  });
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="hero"]')) editHero(-1); });

/* ════════════════════════════════════════════════════
   CATEGORIES (3-level)
════════════════════════════════════════════════════ */
let catState = { catIdx: null, folderIdx: null };

function showCatLevel(n) {
  document.getElementById('cat-level-1').style.display = n === 1 ? '' : 'none';
  document.getElementById('cat-level-2').style.display = n === 2 ? '' : 'none';
  document.getElementById('cat-level-3').style.display = n === 3 ? '' : 'none';
}

function renderCategories() {
  const list = document.getElementById('list-categories');
  if (!list) return;
  if (!Store.categories.length) { list.innerHTML = emptyState('Grid', 'No categories yet.'); return; }

  list.innerHTML = Store.categories.map((c, i) => `
    <div class="item-row" draggable="true" data-idx="${i}" data-type="categories">
      <div class="drag-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg></div>
      ${thumbHTML(c.cover)}
      <div class="item-info">
        <h4>${esc(c.name_en)} <span class="badge">${c.folders?.length ?? 0} folders</span></h4>
        <div class="meta"><span class="ar">${esc(c.name_ar)}</span> · ${esc(c.itemsLabel_en)}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="openCatFolders(${i})">
          <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"/></svg>
          Folders
        </button>
        <button class="btn btn-sm" onclick="editCategory(${i})">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteItem('categories',${i})">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
        </button>
      </div>
    </div>`).join('');

  initDrag(list, 'categories', renderCategories);
}

function editCategory(i) {
  const c = i === -1
    ? { id: Store.uid('cat'), name_en: '', name_ar: '', cover: '', itemsLabel_en: '', itemsLabel_ar: '', folders: [] }
    : { ...Store.categories[i] };
  openModal(i === -1 ? 'Add Category' : 'Edit Category', `
    ${fieldImg('cover', c.cover, 'Cover Image URL')}
    <div class="field-row">
      ${field('name_en', c.name_en, 'Name', 'EN')}
      ${field('name_ar', c.name_ar, 'Name', 'AR', true)}
    </div>
    <div class="field-row">
      ${field('itemsLabel_en', c.itemsLabel_en, 'Items Label', 'EN', false, '120 Items')}
      ${field('itemsLabel_ar', c.itemsLabel_ar, 'Items Label', 'AR', true, '١٢٠ قطعة')}
    </div>
  `, () => {
    c.name_en       = val('name_en');
    c.name_ar       = val('name_ar');
    c.cover         = val('cover');
    c.itemsLabel_en = val('itemsLabel_en');
    c.itemsLabel_ar = val('itemsLabel_ar');
    if (i === -1) Store.categories.push(c); else Store.categories[i] = c;
    Store.markDirty(); renderCategories(); updateCounts();
  });
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="category"]')) editCategory(-1); });

/* ── Level 2: Folders ── */
function openCatFolders(catIdx) {
  catState.catIdx = catIdx;
  const cat = Store.categories[catIdx];
  document.getElementById('crumb-cat-name').textContent = cat.name_en;
  document.getElementById('cat2-title').textContent     = cat.name_en + ' — Folders';
  renderFolders();
  showCatLevel(2);
}

function renderFolders() {
  const cat  = Store.categories[catState.catIdx];
  const grid = document.getElementById('list-folders');
  if (!grid) return;
  const folders = cat.folders ?? [];

  grid.innerHTML = folders.map((f, i) => `
    <div class="nested-card ${f.cover ? '' : 'placeholder'}" onclick="openFolderItems(${i})">
      ${f.cover ? `<img src="${esc(f.cover)}" alt="">` : svgPlaceholder()}
      <div class="nested-card-label"><h4>${esc(f.name_en)}</h4><span>${f.items?.length ?? 0} items</span></div>
      <div class="nested-card-actions" onclick="event.stopPropagation()">
        <button onclick="editFolder(${i})"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="danger" onclick="deleteFolder(${i})"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg></button>
      </div>
    </div>`).join('') +
    `<button class="add-card" onclick="editFolder(-1)"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Folder</button>`;
}

function editFolder(i) {
  const cat = Store.categories[catState.catIdx];
  if (!cat.folders) cat.folders = [];
  const f = i === -1
    ? { id: Store.uid('fld'), name_en: '', name_ar: '', cover: '', items: [] }
    : { ...cat.folders[i] };
  openModal(i === -1 ? 'Add Folder' : 'Edit Folder', `
    ${fieldImg('cover', f.cover, 'Cover Image URL')}
    <div class="field-row">
      ${field('name_en', f.name_en, 'Name', 'EN')}
      ${field('name_ar', f.name_ar, 'Name', 'AR', true)}
    </div>
  `, () => {
    f.name_en = val('name_en');
    f.name_ar = val('name_ar');
    f.cover   = val('cover');
    if (i === -1) cat.folders.push(f); else cat.folders[i] = f;
    Store.markDirty(); renderFolders();
  });
}

function deleteFolder(i) {
  if (!confirm('Delete this folder and all its items?')) return;
  Store.categories[catState.catIdx].folders.splice(i, 1);
  Store.markDirty(); renderFolders();
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="folder"]')) editFolder(-1); });

/* ── Level 3: Items ── */
function openFolderItems(folderIdx) {
  catState.folderIdx = folderIdx;
  const cat    = Store.categories[catState.catIdx];
  const folder = cat.folders[folderIdx];
  document.getElementById('crumb-folder-parent').textContent = cat.name_en;
  document.getElementById('crumb-folder-name').textContent   = folder.name_en;
  document.getElementById('cat3-title').textContent          = folder.name_en + ' — Items';
  renderItems();
  showCatLevel(3);
}

function renderItems() {
  const folder = Store.categories[catState.catIdx].folders[catState.folderIdx];
  const grid   = document.getElementById('list-items');
  if (!grid) return;
  const items  = folder.items ?? [];

  grid.innerHTML = items.map((item, i) => `
    <div class="nested-card ${item.img ? '' : 'placeholder'}">
      ${item.img ? `<img src="${esc(item.img)}" alt="">` : svgPlaceholder()}
      <div class="nested-card-label"><h4>${esc(item.name_en)}</h4><span class="ar">${esc(item.name_ar)}</span></div>
      <div class="nested-card-actions">
        <button onclick="editItem(${i})"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="danger" onclick="deleteItemCard(${i})"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg></button>
      </div>
    </div>`).join('') +
    `<button class="add-card" onclick="editItem(-1)"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Item</button>`;
}

function editItem(i) {
  const folder = Store.categories[catState.catIdx].folders[catState.folderIdx];
  if (!folder.items) folder.items = [];
  const item = i === -1
    ? { id: Store.uid('itm'), name_en: '', name_ar: '', img: '' }
    : { ...folder.items[i] };
  openModal(i === -1 ? 'Add Item' : 'Edit Item', `
    ${fieldImg('img', item.img, 'Image URL')}
    <div class="field-row">
      ${field('name_en', item.name_en, 'Name', 'EN')}
      ${field('name_ar', item.name_ar, 'Name', 'AR', true)}
    </div>
  `, () => {
    item.name_en = val('name_en');
    item.name_ar = val('name_ar');
    item.img     = val('img');
    if (i === -1) folder.items.push(item); else folder.items[i] = item;
    Store.markDirty(); renderItems();
  });
}

function deleteItemCard(i) {
  if (!confirm('Delete this item?')) return;
  Store.categories[catState.catIdx].folders[catState.folderIdx].items.splice(i, 1);
  Store.markDirty(); renderItems();
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="item"]')) editItem(-1); });

/* ── Breadcrumb navigation ── */
document.addEventListener('click', e => {
  const crumb = e.target.closest('[data-crumb]');
  if (!crumb) return;
  const lvl = parseInt(crumb.dataset.crumb);
  if (lvl === 1) { showCatLevel(1); catState = { catIdx: null, folderIdx: null }; }
  if (lvl === 2) { showCatLevel(2); catState.folderIdx = null; }
});

/* ════════════════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════════════════ */
function renderProducts() {
  const list = document.getElementById('list-products');
  if (!list) return;
  if (!Store.products.length) { list.innerHTML = emptyState('Package', 'No products yet.'); return; }

  list.innerHTML = Store.products.map((p, i) => `
    <div class="item-row" draggable="true" data-idx="${i}" data-type="products">
      <div class="drag-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg></div>
      ${thumbHTML(p.img)}
      <div class="item-info">
        <h4>${esc(p.name_en)}</h4>
        <div class="meta"><span class="ar">${esc(p.name_ar)}</span> · ${esc(p.cat_en)} / <span class="ar">${esc(p.cat_ar)}</span></div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="editProduct(${i})">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteItem('products',${i})">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
        </button>
      </div>
    </div>`).join('');

  initDrag(list, 'products', renderProducts);
}

function editProduct(i) {
  const p = i === -1
    ? { id: Store.uid('p'), name_en: '', name_ar: '', cat_en: '', cat_ar: '', img: '' }
    : { ...Store.products[i] };
  openModal(i === -1 ? 'Add Product' : 'Edit Product', `
    ${fieldImg('img', p.img, 'Image URL')}
    <div class="field-row">
      ${field('name_en', p.name_en, 'Name', 'EN')}
      ${field('name_ar', p.name_ar, 'Name', 'AR', true)}
    </div>
    <div class="field-row">
      ${field('cat_en', p.cat_en, 'Category', 'EN')}
      ${field('cat_ar', p.cat_ar, 'Category', 'AR', true)}
    </div>
  `, () => {
    p.name_en = val('name_en'); p.name_ar = val('name_ar');
    p.cat_en  = val('cat_en');  p.cat_ar  = val('cat_ar');
    p.img     = val('img');
    if (i === -1) Store.products.push(p); else Store.products[i] = p;
    Store.markDirty(); renderProducts(); updateCounts();
  });
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="product"]')) editProduct(-1); });

/* ════════════════════════════════════════════════════
   TEAM
════════════════════════════════════════════════════ */
function renderTeam() {
  const list = document.getElementById('list-team');
  if (!list) return;
  if (!Store.team.length) { list.innerHTML = emptyState('User', 'No team members yet.'); return; }

  list.innerHTML = Store.team.map((m, i) => `
    <div class="item-row" draggable="true" data-idx="${i}" data-type="team">
      <div class="drag-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg></div>
      ${thumbHTML(m.img)}
      <div class="item-info">
        <h4>${esc(m.name)}</h4>
        <div class="meta">${esc(m.role_en)} · <span class="ar">${esc(m.role_ar)}</span></div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="editTeam(${i})">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteItem('team',${i})">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
        </button>
      </div>
    </div>`).join('');

  initDrag(list, 'team', renderTeam);
}

function editTeam(i) {
  const m = i === -1
    ? { id: Store.uid('t'), name: '', role_en: '', role_ar: '', img: '' }
    : { ...Store.team[i] };
  openModal(i === -1 ? 'Add Member' : 'Edit Member', `
    ${fieldImg('img', m.img, 'Photo URL')}
    ${field('name', m.name, 'Full Name')}
    <div class="field-row">
      ${field('role_en', m.role_en, 'Role', 'EN')}
      ${field('role_ar', m.role_ar, 'Role', 'AR', true)}
    </div>
  `, () => {
    m.name    = val('name');
    m.role_en = val('role_en'); m.role_ar = val('role_ar');
    m.img     = val('img');
    if (i === -1) Store.team.push(m); else Store.team[i] = m;
    Store.markDirty(); renderTeam(); updateCounts();
  });
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="team"]')) editTeam(-1); });

/* ════════════════════════════════════════════════════
   PARTNERS
════════════════════════════════════════════════════ */
function renderPartners() {
  const list = document.getElementById('list-partners');
  if (!list) return;
  if (!Store.partners.length) { list.innerHTML = emptyState('Clock', 'No partners yet.'); return; }

  list.innerHTML = Store.partners.map((p, i) => `
    <div class="item-row" draggable="true" data-idx="${i}" data-type="partners">
      <div class="drag-handle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg></div>
      ${thumbHTML(p.img)}
      <div class="item-info">
        <h4>${esc(p.name) || '<span style="opacity:.4">Unnamed partner</span>'}</h4>
        <div class="meta">${p.img ? p.img.slice(0, 60) + '…' : 'No image'}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" onclick="editPartner(${i})">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteItem('partners',${i})">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>
        </button>
      </div>
    </div>`).join('');

  initDrag(list, 'partners', renderPartners);
}

function editPartner(i) {
  const p = i === -1
    ? { id: Store.uid('pt'), name: '', img: '' }
    : { ...Store.partners[i] };
  openModal(i === -1 ? 'Add Partner' : 'Edit Partner', `
    ${fieldImg('img', p.img, 'Logo URL')}
    ${field('name', p.name, 'Partner Name')}
  `, () => {
    p.name = val('name');
    p.img  = val('img');
    if (i === -1) Store.partners.push(p); else Store.partners[i] = p;
    Store.markDirty(); renderPartners(); updateCounts();
  });
}

document.addEventListener('click', e => { if (e.target.closest('[data-add="partner"]')) editPartner(-1); });

/* ════════════════════════════════════════════════════
   TRANSLATIONS
════════════════════════════════════════════════════ */
function renderTranslations(filter = '') {
  const container = document.getElementById('list-translations');
  if (!container) return;
  const t = Store.translations;
  const keys = Object.keys(t).filter(k =>
    !filter || k.includes(filter) ||
    (t[k].en || '').toLowerCase().includes(filter.toLowerCase()) ||
    (t[k].ar || '').includes(filter)
  );
  if (!keys.length) { container.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No results.</p>'; return; }

  container.innerHTML = keys.map(k => {
    const isLong = (t[k].en?.length ?? 0) > 60 || (t[k].ar?.length ?? 0) > 60;
    const tag    = isLong ? 'textarea' : 'input type="text"';
    const ctag   = isLong ? 'textarea' : 'input';
    return `<div class="t-row">
      <div class="key">${esc(k)}</div>
      <${tag} id="t_en_${esc(k)}" oninput="updateTranslation('${esc(k)}','en',this.value)" placeholder="English">${isLong ? esc(t[k].en ?? '') : ''}</${ctag}>
      <${tag} id="t_ar_${esc(k)}" lang="ar" oninput="updateTranslation('${esc(k)}','ar',this.value)" placeholder="عربي">${isLong ? esc(t[k].ar ?? '') : ''}</${ctag}>
    </div>`;
  }).join('');

  // Fill input values (not inside textarea)
  keys.forEach(k => {
    const en = document.getElementById(`t_en_${k}`);
    const ar = document.getElementById(`t_ar_${k}`);
    if (en && en.tagName === 'INPUT') en.value = t[k].en ?? '';
    if (ar && ar.tagName === 'INPUT') ar.value = t[k].ar ?? '';
  });
}

function updateTranslation(key, lang, value) {
  if (!Store.data.translations[key]) Store.data.translations[key] = { en: '', ar: '' };
  Store.data.translations[key][lang] = value;
  Store.markDirty();
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('translationSearch');
  if (search) search.addEventListener('input', () => renderTranslations(search.value));
});

/* ════════════════════════════════════════════════════
   GENERIC DELETE
════════════════════════════════════════════════════ */
function deleteItem(arrayKey, i) {
  const labels = { heroSlides: 'slide', categories: 'category', products: 'product', team: 'member', partners: 'partner' };
  if (!confirm(`Delete this ${labels[arrayKey] || 'item'}?`)) return;
  Store.data[arrayKey].splice(i, 1);
  Store.markDirty();
  renderAll();
}

/* ════════════════════════════════════════════════════
   DRAG & DROP REORDER
════════════════════════════════════════════════════ */
function initDrag(list, arrayKey, rerender) {
  let dragIdx = null;
  list.querySelectorAll('[data-idx]').forEach(row => {
    row.addEventListener('dragstart', e => {
      dragIdx = parseInt(row.dataset.idx);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', e => {
      e.preventDefault();
      const overIdx = parseInt(row.dataset.idx);
      if (dragIdx === null || dragIdx === overIdx) return;
      const arr = Store.data[arrayKey];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(overIdx, 0, moved);
      dragIdx = overIdx;
      Store.markDirty();
      rerender();
    });
  });
}

/* ════════════════════════════════════════════════════
   MODAL
════════════════════════════════════════════════════ */
let _modalSaveFn = null;

function openModal(title, bodyHTML, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
  _modalSaveFn = onSave;

  // Live image preview
  document.querySelectorAll('.field-img-url').forEach(input => {
    const preview = document.getElementById('preview_' + input.id);
    input.addEventListener('input', () => {
      if (!preview) return;
      if (input.value) { preview.src = input.value; preview.style.display = ''; }
      else preview.style.display = 'none';
    });
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  _modalSaveFn = null;
}

function bindModal() {
  document.getElementById('modalClose').addEventListener('click',  closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalSave').addEventListener('click', () => {
    if (_modalSaveFn) _modalSaveFn();
    closeModal();
  });
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

/* ════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════ */
const esc = s => (s ?? '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const val = id => (document.getElementById(id)?.value ?? '').trim();

function thumbHTML(src) {
  if (src) return `<img class="item-thumb" src="${esc(src)}" onerror="this.style.display='none'">`;
  return `<div class="item-thumb placeholder"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
}

function svgPlaceholder() {
  return `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
}

function emptyState(icon, msg) {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
    <h4>Nothing here yet</h4><p>${msg}</p>
  </div>`;
}

function field(id, value, label, lang, rtl = false, placeholder = '') {
  return `<div class="field">
    <label>${label}${lang ? ` <span class="lang-tag">${lang}</span>` : ''}</label>
    <input type="text" id="${id}" value="${esc(value)}" placeholder="${esc(placeholder)}"${rtl ? ' lang="ar"' : ''}>
  </div>`;
}

function fieldImg(id, value, label) {
  return `<div class="field">
    <label>${label}</label>
    <div class="img-preview-row">
      <img id="preview_${id}" class="img-preview" src="${esc(value)}" style="${value ? '' : 'display:none'}">
      <input type="url" id="${id}" class="field-img-url" value="${esc(value)}" placeholder="https://…" style="flex:1">
    </div>
    <p class="field-hint">Paste an image URL. The preview updates as you type.</p>
  </div>`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
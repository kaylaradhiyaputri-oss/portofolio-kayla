/* ============================================
   PORTFOLIO DASHBOARD — Frontend Logic
   ============================================ */

const API = '/api';

// ── Google Drive helpers ──
function getDriveFileId(url) {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function isDriveLink(url) {
  return url && (url.includes('drive.google.com') || url.includes('docs.google.com'));
}

// ── Category config ──
const CATEGORIES = {
  graphic_design: { label: 'Graphic Design', icon: '&#9998;' },
  animation:      { label: 'Animation',      icon: '&#9654;' },
  video_editing:  { label: 'Video Editing',  icon: '&#127909;' },
};

// ── State ──
let allItems = [];
let currentEditId = null;

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!isLocal) {
    document.body.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#111; color:white; font-family:sans-serif; text-align:center; padding: 20px;">
        <h1 style="color:#ff4444; font-size:32px; margin-bottom:16px;">⚠️ Akses Ditolak</h1>
        <p style="font-size:18px; line-height:1.6; max-width:600px;">
          Dashboard CRUD <strong>tidak bisa digunakan di website live (GitHub Pages)</strong> karena membutuhkan server Node.js dan Database SQL lokal.<br><br>
          Untuk menambah, mengedit, atau menghapus portofolio:<br>
          1. Jalankan <code>npm run dev</code> di komputer / laptop Anda.<br>
          2. Buka <strong>http://localhost:3001/dashboard</strong>.<br>
          3. Lakukan perubahan di sana (sistem akan otomatis mengupdate <code>data.json</code>).<br>
          4. Lakukan <strong>Git Commit & Push</strong> ke GitHub untuk mempublikasikan perubahan ke website ini.
        </p>
      </div>
    `;
    return;
  }

  loadStats();
  loadItems();
  initAddForm();
  initEditModal();
  initRefreshButton();
});

// ══════════════════════════════════════
// API HELPERS
// ══════════════════════════════════════
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'API error');
  return data;
}

async function apiUpload(formData) {
  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Upload error');
  return data;
}

// ══════════════════════════════════════
// STATS
// ══════════════════════════════════════
async function loadStats() {
  const bar = document.getElementById('stats-bar');
  try {
    const { data } = await apiFetch('/stats');
    const total = data.reduce((sum, c) => sum + c.total, 0);
    let html = `
      <div class="stat-card">
        <div class="stat-label">Total Items</div>
        <div class="stat-value">${total}</div>
        <div class="stat-sub">All categories</div>
      </div>
    `;
    data.forEach(cat => {
      html += `
        <div class="stat-card">
          <div class="stat-label">${cat.category_label || cat.category}</div>
          <div class="stat-value">${cat.total}</div>
          <div class="stat-sub">${cat.visible_count} visible, ${cat.extra_count} hidden</div>
        </div>
      `;
    });
    bar.innerHTML = html;
  } catch (err) {
    bar.innerHTML = `<div class="stat-card"><div class="stat-label">Error</div><div class="stat-sub">${err.message}</div></div>`;
  }
}

// ══════════════════════════════════════
// ITEMS LIST
// ══════════════════════════════════════
async function loadItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '<div class="loading">Loading items</div>';
  try {
    const { data } = await apiFetch('/items');
    allItems = data;
    renderItems(data);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><p>Error: ${err.message}</p></div>`;
  }
}

function renderItems(items) {
  const container = document.getElementById('items-container');
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128194;</div><p>No items yet. Add your first portfolio item above.</p></div>';
    return;
  }

  // Group by category
  const groups = {};
  items.forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });

  let html = '';
  for (const [catKey, catItems] of Object.entries(groups)) {
    const cat = CATEGORIES[catKey] || { label: catKey, icon: '' };
    html += `
      <div class="category-group">
        <div class="category-title">${cat.icon} ${cat.label}</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>File Path</th>
              <th>Title</th>
              <th>Size</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    catItems.forEach(item => {
      let thumb;
      const fileId = isDriveLink(item.file_path) ? getDriveFileId(item.file_path) : null;
      if (fileId && item.file_type === 'image') {
        thumb = `<img class="item-thumb" src="https://drive.google.com/thumbnail?id=${fileId}&sz=w200" alt="${item.title}" onerror="this.style.background='#222';this.alt='Not found'"/>`;
      } else if (fileId && item.file_type === 'video') {
        thumb = `<div class="item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--accent)">&#9654; Drive</div>`;
      } else if (item.file_type === 'image') {
        thumb = `<img class="item-thumb" src="${item.file_path}" alt="${item.title}" onerror="this.style.background='#222';this.alt='Not found'"/>`;
      } else {
        thumb = `<div class="item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;color:#666">&#9654;</div>`;
      }
      const badge = item.is_extra
        ? '<span class="item-badge hidden-item">Hidden</span>'
        : '<span class="item-badge visible">Visible</span>';

      html += `
        <tr data-id="${item.id}">
          <td>${thumb}</td>
          <td><span class="item-meta">${item.file_path}</span></td>
          <td><span class="item-title">${item.title}</span></td>
          <td><span class="item-meta">${item.size_class}</span></td>
          <td>${badge}</td>
          <td>
            <div class="item-actions">
              <button class="btn btn-secondary btn-sm edit-btn" data-id="${item.id}">Edit</button>
              <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
  }

  container.innerHTML = html;

  // Bind edit/delete buttons
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      // First click: show confirm state on button
      if (btn.dataset.confirming !== 'true') {
        btn.dataset.confirming = 'true';
        btn.textContent = 'Sure?';
        btn.style.background = '#e74c3c';
        // Reset after 3 seconds if not confirmed
        btn._resetTimer = setTimeout(() => {
          btn.dataset.confirming = 'false';
          btn.textContent = 'Delete';
          btn.style.background = '';
        }, 3000);
        return;
      }
      // Second click: actually delete
      clearTimeout(btn._resetTimer);
      btn.dataset.confirming = 'false';
      btn.textContent = '...';
      btn.disabled = true;
      deleteItem(id);
    });
  });
}

// ══════════════════════════════════════
// ADD FORM
// ══════════════════════════════════════
function initAddForm() {
  const form = document.getElementById('add-form');
  const uploadArea = document.getElementById('add-upload-area');
  const fileInput = document.getElementById('add-file-input');
  const filenameEl = document.getElementById('add-upload-filename');
  const filePathInput = document.getElementById('add-file-path');
  const fileTypeSelect = document.getElementById('add-file-type');
  const categorySelect = document.getElementById('add-category');
  let pendingFile = null;

  // Upload area click/drag
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      pendingFile = e.dataTransfer.files[0];
      filenameEl.textContent = pendingFile.name;
      autoDetectType(pendingFile, fileTypeSelect);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      pendingFile = fileInput.files[0];
      filenameEl.textContent = pendingFile.name;
      autoDetectType(pendingFile, fileTypeSelect);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'ADDING...';

    try {
      // Upload file if selected
      let filePath = filePathInput.value.trim();
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('category', categorySelect.value);
        const uploadResult = await apiUpload(formData);
        filePath = uploadResult.file_path;
      }

      if (!filePath) {
        showToast('Please upload a file or enter a file path', true);
        btn.disabled = false;
        btn.textContent = 'Add Item';
        return;
      }

      await apiFetch('/items', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.value.trim(),
          category: categorySelect.value,
          category_label: CATEGORIES[categorySelect.value]?.label || categorySelect.value,
          file_path: filePath,
          file_type: fileTypeSelect.value,
          size_class: form.size_class.value,
          is_extra: form.is_extra.checked,
          display_order: parseInt(form.display_order.value) || 0,
        }),
      });

      showToast('Item added successfully!');
      form.reset();
      filenameEl.textContent = '';
      pendingFile = null;
      loadStats();
      loadItems();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Item';
    }
  });
}

function autoDetectType(file, select) {
  if (file.type.startsWith('video/')) {
    select.value = 'video';
  } else {
    select.value = 'image';
  }
}

// ══════════════════════════════════════
// EDIT MODAL
// ══════════════════════════════════════
function initEditModal() {
  const overlay = document.getElementById('edit-modal');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('edit-cancel');
  const form = document.getElementById('edit-form');
  const uploadArea = document.getElementById('edit-upload-area');
  const fileInput = document.getElementById('edit-file-input');
  const filenameEl = document.getElementById('edit-upload-filename');
  let pendingFile = null;

  closeBtn.addEventListener('click', closeEditModal);
  cancelBtn.addEventListener('click', closeEditModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeEditModal();
  });

  // Upload
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      pendingFile = e.dataTransfer.files[0];
      filenameEl.textContent = pendingFile.name;
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      pendingFile = fileInput.files[0];
      filenameEl.textContent = pendingFile.name;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditId) return;

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    try {
      const categorySelect = document.getElementById('edit-category');
      let filePath = document.getElementById('edit-file-path').value.trim();

      // Upload new file if selected
      if (pendingFile) {
        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('category', categorySelect.value);
        const uploadResult = await apiUpload(formData);
        filePath = uploadResult.file_path;
      }

      await apiFetch(`/items/${currentEditId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: document.getElementById('edit-title').value.trim(),
          category: categorySelect.value,
          category_label: CATEGORIES[categorySelect.value]?.label || categorySelect.value,
          file_path: filePath,
          file_type: document.getElementById('edit-file-type').value,
          size_class: document.getElementById('edit-size').value,
          is_extra: document.getElementById('edit-is-extra').checked,
          display_order: parseInt(document.getElementById('edit-order').value) || 0,
        }),
      });

      showToast('Item updated successfully!');
      closeEditModal();
      loadStats();
      loadItems();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
      pendingFile = null;
    }
  });
}

function openEditModal(id) {
  const item = allItems.find(i => String(i.id) === String(id));
  if (!item) return;
  currentEditId = id;

  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-category').value = item.category;
  document.getElementById('edit-file-path').value = item.file_path;
  document.getElementById('edit-file-type').value = item.file_type;
  document.getElementById('edit-size').value = item.size_class;
  document.getElementById('edit-is-extra').checked = !!item.is_extra;
  document.getElementById('edit-order').value = item.display_order || 0;
  document.getElementById('edit-upload-filename').textContent = '';
  document.getElementById('edit-file-input').value = '';

  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  currentEditId = null;
}

// ══════════════════════════════════════
// DELETE
// ══════════════════════════════════════
async function deleteItem(id) {
  const item = allItems.find(i => String(i.id) === String(id));
  if (!item) return;

  try {
    await apiFetch(`/items/${id}`, { method: 'DELETE' });
    showToast(`"${item.title}" deleted.`);
    loadStats();
    loadItems();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ══════════════════════════════════════
// UTILS
// ══════════════════════════════════════
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function initRefreshButton() {
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadStats();
    loadItems();
  });
}

// ========== TOAST NOTIFICATIONS ==========
export function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
}

export function showToast(message, type = 'info', duration = 4000) {
  initToastContainer();
  const container = document.querySelector('.toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.classList.add('exit'); setTimeout(()=>this.parentElement.remove(),300)">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('exit');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ========== FORMAT HELPERS ==========
export function formatDate(dateVal) {
  if (!dateVal) return '';
  try {
    const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export function formatCurrency(amount) {
  return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
}

export function timeAgo(dateVal) {
  if (!dateVal) return 'Just now';
  let d;
  try { d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal); } catch { return 'Just now'; }
  if (!d || isNaN(d.getTime())) return 'Just now';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateVal);
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ========== MODAL HELPERS ==========
export function openModal(id) { document.getElementById(id)?.classList.add('active'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
    e.target.classList.remove('active');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
});

// ========== TAB SWITCHING ==========
export function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  document.querySelectorAll('.sidebar .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ========== QR DOWNLOAD HELPER ==========
export function downloadQR(base64Data, filename = 'ticket-qr.png') {
  const link = document.createElement('a');
  link.href = base64Data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

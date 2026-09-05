const Modal = {
  _resolve: null,

  open(title, bodyHtml, { saveLabel = 'Save', cancelLabel = 'Cancel', maxWidth } = {}) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-save').textContent = saveLabel;
    document.getElementById('modal-cancel').textContent = cancelLabel;
    if (maxWidth) document.getElementById('modal-sheet').style.maxWidth = maxWidth;
    document.getElementById('modal-overlay').classList.add('visible');
    return new Promise((resolve) => { this._resolve = resolve; });
  },

  close(result) {
    document.getElementById('modal-overlay').classList.remove('visible');
    document.getElementById('modal-sheet').style.maxWidth = '';
    if (this._resolve) this._resolve(result || null);
    this._resolve = null;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  document.getElementById('modal-cancel').addEventListener('click', () => Modal.close(null));
  document.getElementById('modal-save').addEventListener('click', () => Modal.close('save'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) Modal.close(null); });
});

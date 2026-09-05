const ACTION_BADGE = {
  created: 'active', updated: 'active', deleted: 'defaulted', status_changed: 'pending',
  recalculated: 'pending', payment_recorded: 'paid', photo_uploaded: 'active',
  documents_uploaded: 'active', logo_updated: 'active', login: 'active'
};

(async function init() {
  await initSidebar('activity');

  let entries;
  try {
    entries = await api.get('/activity');
  } catch (e) {
    toast('Failed to load activity log: ' + e.message);
    return;
  }

  const body = document.getElementById('activity-body');
  body.innerHTML = entries.length ? entries.map((e) => `
    <tr>
      <td>${fmtDateTime(e.createdAt)}</td>
      <td>${escapeHtml(e.entityType)}</td>
      <td><span class="badge ${ACTION_BADGE[e.action] || 'pending'}">${escapeHtml(e.action.replace(/_/g, ' '))}</span></td>
      <td>${escapeHtml(e.summary)}</td>
    </tr>
  `).join('') : '<tr class="empty-row"><td colspan="4">No activity recorded yet.</td></tr>';
})();

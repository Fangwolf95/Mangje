// view_profiles.js

function renderProfiles(app) {
  return `
    ${renderPageHeader('Profili giornata', { backView: 'settings', rightIcon: 'ti-plus', rightAction: 'new-profile' })}
    <div class="page-body">
      ${app.state.profiles.map(p => `
        <div class="card" style="margin-bottom:10px; cursor:pointer;" data-action="edit-profile" data-profile-id="${p.id}">
          <p style="font-size:15px; font-weight:500;">${escapeHtml(p.name)}</p>
          <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
            ${r(p.targetKcal)} kcal · P ${r(p.targetProtein)}g · C ${r(p.targetCarbs)}g · G ${r(p.targetFat)}g
          </p>
        </div>
      `).join('')}
      <button class="btn" style="margin-top: 4px;" data-action="new-profile">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuovo profilo
      </button>
    </div>
  `;
}

function renderProfileForm(app) {
  const editing = app.state.viewParams?.profile || null;
  const p = editing || {};
  return `
    ${renderPageHeader(editing ? 'Modifica profilo' : 'Nuovo profilo', { backView: 'profiles' })}
    <div class="page-body">
      <div class="form-group">
        <label for="pf-name">Nome profilo</label>
        <input type="text" id="pf-name" value="${escapeHtml(p.name || '')}" placeholder="Es. Allenamento" />
      </div>
      <div class="form-group">
        <label for="pf-kcal">Target calorie (kcal)</label>
        <input type="number" inputmode="decimal" id="pf-kcal" value="${p.targetKcal ?? ''}" placeholder="2000" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="pf-protein">Proteine (g)</label>
          <input type="number" inputmode="decimal" id="pf-protein" value="${p.targetProtein ?? ''}" />
        </div>
        <div class="form-group">
          <label for="pf-carbs">Carboidrati (g)</label>
          <input type="number" inputmode="decimal" id="pf-carbs" value="${p.targetCarbs ?? ''}" />
        </div>
      </div>
      <div class="form-group">
        <label for="pf-fat">Grassi (g)</label>
        <input type="number" inputmode="decimal" id="pf-fat" value="${p.targetFat ?? ''}" />
      </div>
      <div class="btn-row" style="margin-top: 10px;">
        ${editing ? `<button class="btn btn-danger" data-action="delete-profile" data-profile-id="${editing.id}">Elimina</button>` : ''}
        <button class="btn btn-primary" data-action="save-profile" data-profile-id="${editing ? editing.id : ''}">Salva</button>
      </div>
    </div>
  `;
}

function renderProfilePickerModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'profilePicker') return '';
  const day = app.getDay(app.state.currentDate);
  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>Profilo del giorno</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="page-body">
          ${app.state.profiles.map(pr => `
            <div class="food-row" data-action="set-day-profile" data-profile-id="${pr.id}" style="cursor:pointer;">
              <div class="icon-box"><i class="ti ti-flame" aria-hidden="true"></i></div>
              <div class="info">
                <p class="name">${escapeHtml(pr.name)}</p>
                <p class="meta">${r(pr.targetKcal)} kcal · P ${r(pr.targetProtein)}g · C ${r(pr.targetCarbs)}g · G ${r(pr.targetFat)}g</p>
              </div>
              ${day.profileId === pr.id ? `<i class="ti ti-check" style="color:var(--accent);" aria-hidden="true"></i>` : ''}
            </div>
          `).join('')}
          <div style="border-top: 1px solid var(--border); margin-top: 8px; padding-top: 12px;">
            <button class="btn btn-ghost" data-action="nav" data-view="profiles" style="justify-content:flex-start; gap:8px; color:var(--text-secondary); font-size:13px;">
              <i class="ti ti-settings" aria-hidden="true"></i> Modifica o aggiungi profili
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

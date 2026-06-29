// views_common.js - componenti condivisi tra le schermate

function renderTopbar(app, opts = {}) {
  const { showDayBadge = false } = opts;
  const day = app.getDay(app.state.currentDate);
  const profile = app.getProfile(day.profileId);
  const dateLabel = app.state.currentDate === todayStr() ? 'Oggi' : formatDateLabel(app.state.currentDate);

  return `
    <div class="topbar">
      <div>
        <h1 class="logo">Mangje!</h1>
        <p class="date">${dateLabel}</p>
      </div>
      <div class="topbar-right">
        <button class="theme-toggle" data-action="toggle-theme" aria-label="Cambia tema">
          <i class="ti ${app.state.theme === 'light' ? 'ti-sun' : 'ti-moon'}" aria-hidden="true"></i>
        </button>
        ${showDayBadge ? `
          <button class="day-badge" data-action="open-profile-picker">
            ${profile ? escapeHtml(profile.name) : 'Nessun profilo'}
            <i class="ti ti-chevron-down" style="font-size:12px" aria-hidden="true"></i>
          </button>` : ''}
      </div>
    </div>
  `;
}

function renderBottomNav(app) {
  const items = [
    { id: 'dashboard', icon: 'ti-home', label: 'Oggi' },
    { id: 'stats', icon: 'ti-chart-bar', label: 'Statistiche' },
    { id: 'weight', icon: 'ti-scale', label: 'Peso' },
    { id: 'settings', icon: 'ti-settings', label: 'Altro' }
  ];
  return `
    <div class="bottom-nav">
      ${items.map(it => `
        <button class="nav-btn ${app.state.view === it.id ? 'active' : ''}" data-action="nav" data-view="${it.id}">
          <i class="ti ${it.icon}" aria-hidden="true"></i>
          <span>${it.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderPageHeader(title, opts = {}) {
  const { backView = 'dashboard', rightIcon = null, rightAction = null } = opts;
  return `
    <div class="page-header">
      <button data-action="nav" data-view="${backView}" aria-label="Indietro">
        <i class="ti ti-chevron-left" aria-hidden="true"></i>
      </button>
      <h2>${escapeHtml(title)}</h2>
      ${rightIcon ? `<button data-action="${rightAction}" aria-label="Azione"><i class="ti ${rightIcon}" aria-hidden="true"></i></button>` : '<span style="width:18px"></span>'}
    </div>
  `;
}

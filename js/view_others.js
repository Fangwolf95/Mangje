// view_others.js - abitudini, peso, statistiche, impostazioni

// ---------- ABITUDINI ----------

function renderHabits(app) {
  return `
    ${renderPageHeader('Buone abitudini', { backView: 'settings', rightIcon: 'ti-plus', rightAction: 'new-habit' })}
    <div class="page-body">
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
        Imposta abitudini settimanali basate sulla categoria degli alimenti. L'app ti avvisa se rischi di non raggiungerle.
      </p>
      ${app.state.habits.length === 0 ? `
        <div class="empty-state" style="padding: 20px 0;">
          <i class="ti ti-leaf" aria-hidden="true"></i>
          <p>Nessuna abitudine. Aggiungine una, es. "Pesce 2 volte a settimana".</p>
        </div>
      ` : app.state.habits.map(h => {
        const cat = getCategory(h.categoryId);
        return `
          <div class="card" style="margin-bottom:10px; cursor:pointer; display:flex; align-items:center; gap:12px;" data-action="edit-habit" data-habit-id="${h.id}">
            <i class="ti ${cat.icon}" style="font-size:20px; color:var(--accent-soft-text);" aria-hidden="true"></i>
            <div style="flex:1;">
              <p style="font-size:14px; font-weight:500;">${escapeHtml(cat.name)}</p>
              <p style="font-size:12px; color:var(--text-secondary);">Almeno ${h.timesPerWeek} volta${h.timesPerWeek > 1 ? '' : ''} a settimana</p>
            </div>
            <i class="ti ti-chevron-right" style="color:var(--text-tertiary);" aria-hidden="true"></i>
          </div>
        `;
      }).join('')}
      <button class="btn" style="margin-top: 8px;" data-action="new-habit">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuova abitudine
      </button>
    </div>
  `;
}

function renderHabitModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'habitForm') return '';
  const h = p.habit || {};
  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>${h.id ? 'Modifica abitudine' : 'Nuova abitudine'}</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="page-body">
          <div class="form-group">
            <label for="hf-category">Categoria alimento</label>
            <select id="hf-category">
              ${CATEGORIES.map(c => `<option value="${c.id}" ${h.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="hf-times">Volte a settimana (minimo)</label>
            <input type="number" inputmode="numeric" id="hf-times" min="1" max="7" value="${h.timesPerWeek ?? 2}" />
          </div>
          <div class="btn-row">
            ${h.id ? `<button class="btn btn-danger" data-action="delete-habit" data-habit-id="${h.id}">Elimina</button>` : ''}
            <button class="btn btn-primary" data-action="save-habit" data-habit-id="${h.id || ''}">Salva</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- PESO ----------

function renderWeight(app) {
  const sorted = [...app.state.weights].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  return `
    ${renderTopbar(app)}
    <div class="page-body">
      <p class="section-title">Registra peso</p>
      <div class="card" style="margin-bottom:12px;">
        <div class="form-row" style="align-items:flex-end; gap:10px;">
          <div class="form-group" style="margin:0; flex:1;">
            <label for="weight-kg">Peso (kg)</label>
            <input type="number" inputmode="decimal" id="weight-kg" placeholder="es. 75.5" step="0.1" />
          </div>
          <button class="btn btn-primary" style="width:auto; padding:0 20px; flex-shrink:0;" data-action="save-weight">
            <i class="ti ti-check" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      ${latest ? `
        <p class="section-title" style="margin-bottom:8px;">Ultimo peso: <strong>${latest.kg} kg</strong> (${formatDateLabel(latest.date)})</p>
      ` : ''}

      ${sorted.length > 1 ? `
        <p class="section-title" style="margin-top:18px; margin-bottom:8px;">Storico</p>
        <div class="card" style="padding: 8px 18px;">
          ${sorted.slice(0, 30).map(w => `
            <div class="weight-row">
              <span>${w.kg} kg</span>
              <span class="date">${formatDateLabel(w.date)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${renderBottomNav(app)}
  `;
}

// ---------- STATISTICHE ----------

function renderStats(app) {
  const last7 = getLast7Days(app);
  const avgKcal = last7.length ? Math.round(last7.reduce((s, d) => s + d.kcal, 0) / last7.length) : 0;
  const avgProtein = last7.length ? Math.round(last7.reduce((s, d) => s + d.protein, 0) / last7.length) : 0;

  return `
    ${renderTopbar(app)}
    <div class="page-body">
      <p class="section-title" style="margin-bottom:10px;">Ultimi 7 giorni</p>

      ${last7.length < 2 ? `
        <div class="empty-state">
          <i class="ti ti-chart-bar" aria-hidden="true"></i>
          <p>Inserisci almeno 2 giorni di dati per vedere le statistiche.</p>
        </div>
      ` : `
        <div class="macro-grid" style="grid-template-columns:repeat(2,minmax(0,1fr)); margin-bottom:16px;">
          <div class="macro-card">
            <p class="label">Media kcal/giorno</p>
            <p class="amount" style="font-size:20px;">${avgKcal}</p>
          </div>
          <div class="macro-card">
            <p class="label">Media proteine/giorno</p>
            <p class="amount" style="font-size:20px;">${avgProtein}g</p>
          </div>
        </div>

        <p class="section-title" style="margin-bottom:10px;">Calorie per giorno</p>
        <div class="card" style="padding: 16px 18px;">
          ${renderBarChart(last7)}
        </div>

        <p class="section-title" style="margin-top:16px; margin-bottom:10px;">Ultime 7 giornate</p>
        <div class="card" style="padding: 4px 18px;">
          ${last7.map(d => {
            const profile = app.getProfile(app.getDay(d.date).profileId);
            const pct = profile ? Math.min(100, (d.kcal / profile.targetKcal) * 100) : null;
            return `
              <div class="weight-row">
                <div>
                  <p style="font-size:14px;">${formatDateLabel(d.date)}</p>
                  <p style="font-size:12px; color:var(--text-secondary);">P ${r(d.protein)}g · C ${r(d.carbs)}g · G ${r(d.fat)}g</p>
                </div>
                <div style="text-align:right;">
                  <p style="font-size:14px; font-weight:500;">${r(d.kcal)} kcal</p>
                  ${pct !== null ? `<p style="font-size:11px; color:var(--text-secondary);">${Math.round(pct)}% del target</p>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
    ${renderBottomNav(app)}
  `;
}

function getLast7Days(app) {
  const result = [];
  const foodsById = app.foodsById();
  const compositesById = app.compositesById();
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDays(todayStr(), -i);
    const day = app.getDay(dateStr);
    if (!day.entries || day.entries.length === 0) continue;
    const totals = sumTotals(day.entries.map(e => computeEntryTotals(e, foodsById, compositesById)));
    result.push({ date: dateStr, ...totals });
  }
  return result;
}

function renderBarChart(data) {
  if (!data.length) return '';
  const max = Math.max(...data.map(d => d.kcal), 1);
  return `
    <div style="display:flex; align-items:flex-end; gap:8px; height:100px;">
      ${data.map(d => {
        const pct = (d.kcal / max) * 100;
        const label = new Date(d.date + 'T00:00:00').getDate();
        return `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%;">
            <div style="flex:1; display:flex; align-items:flex-end; width:100%;">
              <div style="width:100%; height:${Math.max(4, pct)}%; background:var(--accent); border-radius:4px 4px 0 0; opacity:0.85;"></div>
            </div>
            <span style="font-size:10px; color:var(--text-secondary);">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---------- IMPOSTAZIONI ----------

function renderSettings(app) {
  return `
    ${renderTopbar(app)}
    <div class="page-body">
      <p class="section-title" style="margin-bottom:10px;">Gestione</p>
      <div class="card" style="padding: 4px 18px;">
        <div class="food-row" style="cursor:pointer;" data-action="nav" data-view="profiles">
          <div class="icon-box"><i class="ti ti-flame" aria-hidden="true"></i></div>
          <div class="info"><p class="name">Profili giornata</p><p class="meta">${app.state.profiles.length} profili</p></div>
          <i class="ti ti-chevron-right" style="color:var(--text-tertiary);" aria-hidden="true"></i>
        </div>
        <div class="food-row" style="cursor:pointer;" data-action="nav" data-view="composites">
          <div class="icon-box"><i class="ti ti-stack-2" aria-hidden="true"></i></div>
          <div class="info"><p class="name">Composti</p><p class="meta">${app.state.composites.length} pasti fissi</p></div>
          <i class="ti ti-chevron-right" style="color:var(--text-tertiary);" aria-hidden="true"></i>
        </div>
        <div class="food-row" style="cursor:pointer;" data-action="nav" data-view="habits">
          <div class="icon-box"><i class="ti ti-leaf" aria-hidden="true"></i></div>
          <div class="info"><p class="name">Buone abitudini</p><p class="meta">${app.state.habits.length} abitudini</p></div>
          <i class="ti ti-chevron-right" style="color:var(--text-tertiary);" aria-hidden="true"></i>
        </div>
      </div>

      <p class="section-title" style="margin-top:20px; margin-bottom:10px;">Il tuo database alimenti</p>
      <div class="card" style="padding: 4px 18px;">
        <div class="food-row">
          <div class="icon-box"><i class="ti ti-database" aria-hidden="true"></i></div>
          <div class="info"><p class="name">Alimenti salvati</p><p class="meta">${app.state.foods.length} alimenti</p></div>
        </div>
      </div>

      <p class="section-title" style="margin-top:20px; margin-bottom:10px;">Backup</p>
      <div class="card" style="padding: 12px 18px; display:flex; flex-direction:column; gap:10px;">
        <button class="btn" data-action="export-data">
          <i class="ti ti-download" aria-hidden="true"></i> Esporta dati (JSON)
        </button>
        <button class="btn" data-action="import-data">
          <i class="ti ti-upload" aria-hidden="true"></i> Importa dati (JSON)
        </button>
        <input type="file" id="import-file-input" accept=".json" style="display:none;" />
      </div>

      <p style="font-size:12px; color:var(--text-tertiary); text-align:center; margin-top:24px;">
        Mangje! · Tutti i dati restano sul tuo dispositivo
      </p>
    </div>
    ${renderBottomNav(app)}
  `;
}

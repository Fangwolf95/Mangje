// view_dashboard.js

function renderDashboard(app) {
  const day = app.getDay(app.state.currentDate);
  const profile = app.getProfile(day.profileId);
  const foodsById = app.foodsById();
  const compositesById = app.compositesById();

  const entryTotals = day.entries.map(e => computeEntryTotals(e, foodsById, compositesById));
  const totals = sumTotals(entryTotals);

  const habitsProgress = app.habitsProgressForWeek(app.state.currentDate);
  const advice = buildAdvice({ profile, totals, habitsProgress, dateStr: app.state.currentDate });

  const kcalPct = profile ? Math.min(100, (totals.kcal / profile.targetKcal) * 100) : 0;
  const proteinPct = profile ? Math.min(100, (totals.protein / profile.targetProtein) * 100) : 0;
  const carbsPct = profile ? Math.min(100, (totals.carbs / profile.targetCarbs) * 100) : 0;
  const fatPct = profile ? Math.min(100, (totals.fat / profile.targetFat) * 100) : 0;

  const overKcal = profile && totals.kcal > profile.targetKcal;

  return `
    ${renderTopbar(app, { showDayBadge: true })}

    <div class="section">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px;">
        <button class="btn-icon btn" style="width:36px; height:36px;" data-action="change-date" data-delta="-1" aria-label="Giorno precedente">
          <i class="ti ti-chevron-left" aria-hidden="true"></i>
        </button>
        <span style="font-size:13px; color:var(--text-secondary);">${app.state.currentDate === todayStr() ? 'Oggi' : formatDateLabel(app.state.currentDate)}</span>
        <button class="btn-icon btn" style="width:36px; height:36px;" data-action="change-date" data-delta="1" aria-label="Giorno successivo">
          <i class="ti ti-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <div class="card">
        <div class="progress-row">
          <span>Calorie</span>
          <span><span class="value" style="${overKcal ? 'color:var(--danger)' : ''}">${r(totals.kcal)}</span> / ${profile ? r(profile.targetKcal) : '–'} kcal</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${kcalPct}%; background:${overKcal ? 'var(--danger)' : 'var(--accent)'};"></div>
        </div>

        <div class="macro-grid">
          <div class="macro-card">
            <p class="label">Proteine</p>
            <p class="amount">${r(totals.protein)}<span class="total">/${profile ? r(profile.targetProtein) : '–'}g</span></p>
            <div class="macro-track"><div class="macro-fill" style="width:${proteinPct}%; background:var(--protein);"></div></div>
          </div>
          <div class="macro-card">
            <p class="label">Carbo</p>
            <p class="amount">${r(totals.carbs)}<span class="total">/${profile ? r(profile.targetCarbs) : '–'}g</span></p>
            <div class="macro-track"><div class="macro-fill" style="width:${carbsPct}%; background:var(--carbs);"></div></div>
          </div>
          <div class="macro-card">
            <p class="label">Grassi</p>
            <p class="amount">${r(totals.fat)}<span class="total">/${profile ? r(profile.targetFat) : '–'}g</span></p>
            <div class="macro-track"><div class="macro-fill" style="width:${fatPct}%; background:var(--fat);"></div></div>
          </div>
        </div>
      </div>
    </div>

    ${advice.length ? `
      <div class="section">
        ${advice.map(a => `
          <div class="advice-card" style="margin-bottom:8px;">
            <i class="ti ${a.icon}" aria-hidden="true"></i>
            <span>${escapeHtml(a.text)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${habitsProgress.length ? `
      <div class="section">
        <div class="card">
          <p class="section-title" style="margin-bottom:8px;">Abitudini della settimana</p>
          ${habitsProgress.map(h => `
            <div class="habit-row">
              <i class="ti ${h.icon} icon" aria-hidden="true"></i>
              <span class="name">${escapeHtml(h.categoryName)}</span>
              <div class="habit-dots">
                ${Array.from({length: h.target}).map((_, i) => `<div class="habit-dot ${i < h.count ? 'filled' : ''}"></div>`).join('')}
              </div>
              <span class="habit-count">${h.count}/${h.target}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="section">
      <p class="section-title">${app.state.currentDate === todayStr() ? 'Oggi' : 'Quel giorno'}</p>
      <div class="card" style="padding: 4px 18px;">
        ${day.entries.length === 0 ? `
          <div class="empty-state" style="padding: 24px 0;">
            <i class="ti ti-soup" aria-hidden="true"></i>
            <p>Nessun alimento ancora. Aggiungi il tuo primo pasto.</p>
          </div>
        ` : day.entries.map((entry, idx) => renderFoodRow(app, entry, idx, foodsById, compositesById)).join('')}
      </div>
    </div>

    <div class="section">
      <button class="btn btn-primary" data-action="nav" data-view="addFood">
        <i class="ti ti-plus" aria-hidden="true"></i> Aggiungi alimento
      </button>
    </div>

    ${renderBottomNav(app)}
  `;
}

function renderFoodRow(app, entry, idx, foodsById, compositesById) {
  const t = computeEntryTotals(entry, foodsById, compositesById);
  let name, meta, icon;
  if (entry.type === 'food') {
    const f = foodsById[entry.foodId];
    if (!f) return '';
    name = f.name;
    meta = `${r(entry.grams)}g`;
    icon = getCategory(f.category).icon;
  } else {
    const c = compositesById[entry.compositeId];
    if (!c) return '';
    name = c.name;
    meta = `Composto · ${c.ingredients.length} ingredienti`;
    icon = 'ti-stack-2';
  }
  return `
    <div class="food-row">
      <div class="icon-box"><i class="ti ${icon}" aria-hidden="true"></i></div>
      <div class="info">
        <p class="name">${escapeHtml(name)}</p>
        <p class="meta">${escapeHtml(meta)}</p>
      </div>
      <span class="kcal">${r(t.kcal)} kcal</span>
      <button class="delete-btn" data-action="remove-entry" data-idx="${idx}" aria-label="Rimuovi">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>
  `;
}

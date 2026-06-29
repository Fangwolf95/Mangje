// view_addfood.js

function renderAddFood(app) {
  const tab = app.state.viewParams?.tab || 'database';
  const query = app.state.viewParams?.query || '';
  const offResults = app.state.viewParams?.offResults || null;
  const searching = app.state.viewParams?.searching || false;

  let listHtml = '';

  if (tab === 'database') {
    const local = app.state.foods.filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase()));
    const showOff = query.length >= 2;

    listHtml = `
      ${local.length ? local.map(f => renderFoodSearchRow(f)).join('') : ''}
      ${showOff ? `
        <p class="section-title" style="margin: 14px 0 8px;">Open Food Facts</p>
        ${searching ? `<div class="empty-state" style="padding:20px 0;"><i class="ti ti-loader-2" aria-hidden="true"></i><p>Cerco...</p></div>` : ''}
        ${!searching && offResults ? offResults.map(p => renderOffSearchRow(p)).join('') : ''}
        ${!searching && offResults && offResults.length === 0 ? `<p style="font-size:13px; color:var(--text-secondary); padding: 8px 0;">Nessun risultato online.</p>` : ''}
      ` : ''}
      ${!local.length && !showOff ? `
        <div class="empty-state" style="padding: 30px 0;">
          <i class="ti ti-search" aria-hidden="true"></i>
          <p>Cerca un alimento per nome, oppure scansiona un barcode.</p>
        </div>
      ` : ''}
      <div class="food-row" data-action="nav" data-view="foodForm" style="cursor:pointer;">
        <div class="icon-box"><i class="ti ti-plus" aria-hidden="true"></i></div>
        <div class="info"><p class="name" style="color:var(--text-secondary);">Non trovi l'alimento? Aggiungilo</p></div>
      </div>
    `;
  } else if (tab === 'composites') {
    const list = app.state.composites.filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()));
    listHtml = list.length ? list.map(c => renderCompositeSearchRow(c, app)).join('') : `
      <div class="empty-state" style="padding: 30px 0;">
        <i class="ti ti-stack-2" aria-hidden="true"></i>
        <p>Nessun composto ancora. Crea il tuo primo pasto fisso.</p>
      </div>
      <button class="btn" data-action="nav" data-view="compositeForm" style="margin-top:10px;">
        <i class="ti ti-plus" aria-hidden="true"></i> Crea composto
      </button>
    `;
  } else if (tab === 'recent') {
    const recentIds = getRecentFoodIds(app, 15);
    const foodsById = app.foodsById();
    const list = recentIds.map(id => foodsById[id]).filter(Boolean);
    listHtml = list.length ? list.map(f => renderFoodSearchRow(f)).join('') : `
      <div class="empty-state" style="padding: 30px 0;">
        <i class="ti ti-history" aria-hidden="true"></i>
        <p>I tuoi alimenti recenti compariranno qui.</p>
      </div>
    `;
  }

  return `
    ${renderPageHeader('Aggiungi alimento', { backView: 'dashboard' })}

    <div class="search-row" style="margin-top: 12px;">
      <div class="search-input-wrap">
        <i class="ti ti-search" aria-hidden="true"></i>
        <input type="text" id="food-search-input" placeholder="Cerca alimento..." value="${escapeHtml(query)}" />
      </div>
      <button class="barcode-btn" data-action="scan-barcode" aria-label="Scansiona barcode">
        <i class="ti ti-barcode" aria-hidden="true"></i>
      </button>
    </div>

    <div class="tabs">
      <button class="tab ${tab === 'database' ? 'active' : ''}" data-action="set-add-tab" data-tab="database">Database</button>
      <button class="tab ${tab === 'composites' ? 'active' : ''}" data-action="set-add-tab" data-tab="composites">Composti</button>
      <button class="tab ${tab === 'recent' ? 'active' : ''}" data-action="set-add-tab" data-tab="recent">Recenti</button>
    </div>

    <div class="page-body" style="padding-top: 4px;">
      ${listHtml}
    </div>
  `;
}

function renderFoodSearchRow(f) {
  const cat = getCategory(f.category);
  return `
    <div class="food-row" data-action="pick-food" data-food-id="${f.id}" style="cursor:pointer;">
      <div class="icon-box"><i class="ti ${cat.icon}" aria-hidden="true"></i></div>
      <div class="info">
        <p class="name">${escapeHtml(f.name)}</p>
        <p class="meta">${r(f.kcal100)} kcal · 100g · ${escapeHtml(cat.name)}</p>
      </div>
      <i class="ti ti-plus" style="color:var(--accent); font-size:18px;" aria-hidden="true"></i>
    </div>
  `;
}

function renderOffSearchRow(p) {
  return `
    <div class="food-row" data-action="pick-off-product" data-barcode="${escapeHtml(p.barcode)}" style="cursor:pointer;">
      <div class="icon-box"><i class="ti ti-barcode" aria-hidden="true"></i></div>
      <div class="info">
        <p class="name">${escapeHtml(p.name)}</p>
        <p class="meta">${r(p.kcal100)} kcal · 100g ${p.brand ? '· ' + escapeHtml(p.brand) : ''}</p>
      </div>
      <i class="ti ti-plus" style="color:var(--accent); font-size:18px;" aria-hidden="true"></i>
    </div>
  `;
}

function renderCompositeSearchRow(c, app) {
  return `
    <div class="food-row" data-action="pick-composite" data-composite-id="${c.id}" style="cursor:pointer;">
      <div class="icon-box"><i class="ti ti-stack-2" aria-hidden="true"></i></div>
      <div class="info">
        <p class="name">${escapeHtml(c.name)}</p>
        <p class="meta">${c.ingredients.length} ingredienti</p>
      </div>
      <i class="ti ti-plus" style="color:var(--accent); font-size:18px;" aria-hidden="true"></i>
    </div>
  `;
}

function getRecentFoodIds(app, limit) {
  const ids = [];
  const sortedDays = [...app.state.days].sort((a, b) => b.date.localeCompare(a.date));
  for (const day of sortedDays) {
    for (const entry of [...day.entries].reverse()) {
      if (entry.type === 'food' && !ids.includes(entry.foodId)) {
        ids.push(entry.foodId);
        if (ids.length >= limit) return ids;
      }
    }
  }
  return ids;
}

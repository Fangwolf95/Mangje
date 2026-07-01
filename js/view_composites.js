// view_composites.js

function renderComposites(app) {
  return `
    ${renderPageHeader('I tuoi composti', { backView: 'settings', rightIcon: 'ti-plus', rightAction: 'new-composite' })}
    <div class="page-body">
      ${app.state.composites.length === 0 ? `
        <div class="empty-state" style="padding: 30px 0;">
          <i class="ti ti-stack-2" aria-hidden="true"></i>
          <p>Crea pasti fissi (es. la tua colazione abituale) per aggiungerli con un tap.</p>
        </div>
      ` : app.state.composites.map(c => renderCompositeCard(c, app)).join('')}
      <button class="btn" style="margin-top: 12px;" data-action="new-composite">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuovo composto
      </button>
    </div>
  `;
}

function renderCompositeCard(c, app) {
  const foodsById = app.foodsById();
  const totals = sumTotals(c.ingredients.map(ing => {
    const f = foodsById[ing.foodId];
    if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const factor = ing.grams / 100;
    return { kcal: f.kcal100 * factor, protein: f.protein100 * factor, carbs: f.carbs100 * factor, fat: f.fat100 * factor };
  }));
  return `
    <div class="card" style="margin-bottom: 10px; cursor:pointer;" data-action="edit-composite" data-composite-id="${c.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <p style="font-size:15px; font-weight:500;">${escapeHtml(c.name)}</p>
          <p style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${c.ingredients.length} ingredienti</p>
        </div>
        <span style="font-size:13px; color:var(--text-secondary);">${r(totals.kcal)} kcal</span>
      </div>
    </div>
  `;
}

function renderCompositeForm(app) {
  const editing = app.state.viewParams?.composite || null;
  const draft = app.state.compositeDraft || { name: editing?.name || '', ingredients: editing ? [...editing.ingredients] : [] };
  app.state.compositeDraft = draft;
  const foodsById = app.foodsById();

  const totals = sumTotals(draft.ingredients.map(ing => {
    const f = foodsById[ing.foodId];
    if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const factor = ing.grams / 100;
    return { kcal: f.kcal100 * factor, protein: f.protein100 * factor, carbs: f.carbs100 * factor, fat: f.fat100 * factor };
  }));

  return `
    ${renderPageHeader(editing ? 'Modifica composto' : 'Nuovo composto', { backView: 'composites' })}
    <div class="page-body">
      <div class="form-group">
        <label for="cf-name">Nome del composto</label>
        <input type="text" id="cf-name" value="${escapeHtml(draft.name)}" placeholder="Es. Colazione classica" />
      </div>

      <p class="section-title" style="margin-top: 14px;">Ingredienti</p>
      ${draft.ingredients.length === 0 ? `
        <p style="font-size:13px; color:var(--text-secondary); padding: 10px 0;">Nessun ingrediente ancora.</p>
      ` : draft.ingredients.map((ing, idx) => {
        const f = foodsById[ing.foodId];
        if (!f) return '';
        return `
          <div class="food-row">
            <div class="icon-box"><i class="ti ${getCategory(f.category).icon}" aria-hidden="true"></i></div>
            <div class="info">
              <p class="name">${escapeHtml(f.name)}</p>
              <p class="meta">${r(ing.grams)}g</p>
            </div>
            <button class="delete-btn" data-action="remove-composite-ingredient" data-idx="${idx}" aria-label="Rimuovi"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>
        `;
      }).join('')}

      <button class="btn" style="margin-top: 10px;" data-action="add-composite-ingredient">
        <i class="ti ti-plus" aria-hidden="true"></i> Aggiungi ingrediente
      </button>

      ${draft.ingredients.length > 0 ? `
        <div class="macro-grid" style="grid-template-columns: repeat(4, minmax(0,1fr)); margin-top: 18px;">
          <div class="macro-card"><p class="label">Kcal</p><p class="amount">${r(totals.kcal)}</p></div>
          <div class="macro-card"><p class="label">Prot.</p><p class="amount">${r(totals.protein)}g</p></div>
          <div class="macro-card"><p class="label">Carbo</p><p class="amount">${r(totals.carbs)}g</p></div>
          <div class="macro-card"><p class="label">Grassi</p><p class="amount">${r(totals.fat)}g</p></div>
        </div>
      ` : ''}

      <div class="btn-row" style="margin-top: 18px;">
        ${editing ? `<button class="btn btn-danger" data-action="delete-composite" data-composite-id="${editing.id}">Elimina</button>` : ''}
        <button class="btn btn-primary" data-action="save-composite" data-composite-id="${editing ? editing.id : ''}">Salva composto</button>
      </div>
    </div>
  `;
}

function renderIngredientPickerModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'ingredientPicker') return '';
  const query = p.query || '';
  const list = app.state.foods.filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase()));
  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>Aggiungi ingrediente</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="search-row" style="margin-top:12px;">
          <div class="search-input-wrap">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input type="text" id="ingredient-search-input" placeholder="Cerca nel tuo database..." value="${escapeHtml(query)}" />
          </div>
        </div>
        <div class="page-body" style="padding-top:4px;">
          ${list.length ? list.map(f => `
            <div class="food-row" data-action="pick-ingredient" data-food-id="${f.id}" style="cursor:pointer;">
              <div class="icon-box"><i class="ti ${getCategory(f.category).icon}" aria-hidden="true"></i></div>
              <div class="info">
                <p class="name">${escapeHtml(f.name)}</p>
                <p class="meta">${r(f.kcal100)} kcal · 100g</p>
              </div>
              <i class="ti ti-plus" style="color:var(--accent); font-size:18px;" aria-hidden="true"></i>
            </div>
          `).join('') : `<p style="font-size:13px; color:var(--text-secondary); padding:14px 0;">Nessun alimento trovato nel tuo database. Aggiungilo prima dalla sezione Aggiungi alimento.</p>`}
        </div>
      </div>
    </div>
  `;
}

function renderIngredientGramsModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'ingredientGrams') return '';
  const grams = p.grams ?? 100;
  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>${escapeHtml(p.food.name)}</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="page-body">
          <div class="form-group">
            <label for="ing-grams">Quantità (grammi)</label>
            <input type="number" inputmode="decimal" id="ing-grams" value="${grams}" />
          </div>
          <button class="btn btn-primary" data-action="confirm-add-ingredient">
            <i class="ti ti-check" aria-hidden="true"></i> Aggiungi al composto
          </button>
        </div>
      </div>
    </div>
  `;
}

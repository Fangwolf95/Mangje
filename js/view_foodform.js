// view_foodform.js

function renderFoodForm(app) {
  const editing = app.state.viewParams?.food || null;
  const prefill = app.state.viewParams?.prefill || null;
  const f = editing || prefill || {};

  return `
    ${renderPageHeader(editing ? 'Modifica alimento' : 'Nuovo alimento', { backView: 'addFood' })}
    <div class="page-body">
      <div class="form-group">
        <label for="ff-name">Nome</label>
        <input type="text" id="ff-name" value="${escapeHtml(f.name || '')}" placeholder="Es. Petto di pollo" />
      </div>

      <div class="form-group">
        <label for="ff-category">Categoria</label>
        <select id="ff-category">
          ${CATEGORIES.map(c => `<option value="${c.id}" ${f.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <p class="section-title" style="margin-top: 18px;">Valori per 100g</p>
      <div class="form-row">
        <div class="form-group">
          <label for="ff-kcal">Calorie (kcal)</label>
          <input type="number" inputmode="decimal" id="ff-kcal" value="${f.kcal100 ?? ''}" placeholder="0" />
        </div>
        <div class="form-group">
          <label for="ff-protein">Proteine (g)</label>
          <input type="number" inputmode="decimal" id="ff-protein" value="${f.protein100 ?? ''}" placeholder="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ff-carbs">Carboidrati (g)</label>
          <input type="number" inputmode="decimal" id="ff-carbs" value="${f.carbs100 ?? ''}" placeholder="0" />
        </div>
        <div class="form-group">
          <label for="ff-fat">Grassi (g)</label>
          <input type="number" inputmode="decimal" id="ff-fat" value="${f.fat100 ?? ''}" placeholder="0" />
        </div>
      </div>

      <div class="btn-row" style="margin-top: 10px;">
        ${editing ? `<button class="btn btn-danger" data-action="delete-food" data-food-id="${editing.id}">Elimina</button>` : ''}
        <button class="btn btn-primary" data-action="save-food" data-food-id="${editing ? editing.id : ''}">Salva alimento</button>
      </div>
    </div>
  `;
}

function renderQuantityModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'quantity') return '';
  const { name, kcal100, protein100, carbs100, fat100, defaultGrams } = p;
  const grams = p.grams ?? defaultGrams ?? 100;
  const factor = grams / 100;

  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>${escapeHtml(name)}</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="page-body">
          <div class="form-group">
            <label for="qty-grams">Quantità (grammi)</label>
            <input type="number" inputmode="decimal" id="qty-grams" value="${grams}" data-action="update-qty-preview" />
          </div>
          <div class="macro-grid" style="grid-template-columns: repeat(4, minmax(0,1fr));">
            <div class="macro-card"><p class="label">Kcal</p><p class="amount" id="qty-kcal">${r(kcal100 * factor)}</p></div>
            <div class="macro-card"><p class="label">Prot.</p><p class="amount" id="qty-protein">${r(protein100 * factor)}g</p></div>
            <div class="macro-card"><p class="label">Carbo</p><p class="amount" id="qty-carbs">${r(carbs100 * factor)}g</p></div>
            <div class="macro-card"><p class="label">Grassi</p><p class="amount" id="qty-fat">${r(fat100 * factor)}g</p></div>
          </div>
          <button class="btn btn-primary" style="margin-top: 18px;" data-action="confirm-add-quantity">
            <i class="ti ti-check" aria-hidden="true"></i> Aggiungi alla giornata
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBarcodeModal(app) {
  const p = app.state.modal;
  if (!p || p.type !== 'barcode') return '';
  return `
    <div class="modal-overlay" data-action="close-modal-overlay">
      <div class="modal-sheet" onclick="event.stopPropagation()">
        <div class="page-header" style="border-bottom:1px solid var(--border);">
          <span style="width:18px"></span>
          <h2>Scansiona barcode</h2>
          <button data-action="close-modal" aria-label="Chiudi"><i class="ti ti-x" aria-hidden="true"></i></button>
        </div>
        <div class="page-body">
          <div id="barcode-reader" style="width:100%; border-radius: var(--radius-md); overflow:hidden; background:#000; min-height:260px;"></div>
          <p style="font-size:12px; color:var(--text-secondary); text-align:center; margin-top:10px;">
            Inquadra il codice a barre del prodotto
          </p>
          <p id="barcode-status" style="font-size:13px; text-align:center; margin-top:6px; color:var(--text-secondary);"></p>
        </div>
      </div>
    </div>
  `;
}

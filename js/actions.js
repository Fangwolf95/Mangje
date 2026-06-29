// actions.js - gestione di tutti gli eventi utente

function afterRender(app) {
  const root = app.els.root;

  // Rimuovi listener precedente e registra uno nuovo sul root
  if (root._clickHandler) root.removeEventListener('click', root._clickHandler);
  root._clickHandler = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    try {
      await handleAction(app, btn.dataset.action, btn, e);
    } catch (err) {
      console.error('handleAction error:', err);
      app.showToast('Errore inatteso, riprova');
      app.render();
    }
  };
  root.addEventListener('click', root._clickHandler);

  // Listener globale su document per i modali (bypassa stopPropagation)
  if (document._modalClickHandler) document.removeEventListener('click', document._modalClickHandler);
  document._modalClickHandler = async (e) => {
    // Gestisci solo click dentro un .modal-overlay
    const overlay = e.target.closest('.modal-overlay');
    if (!overlay) return;

    // Click sull'overlay stesso (fuori dal foglio) → chiudi
    if (e.target === overlay) {
      app.state.modal = null;
      overlay.remove();
      return;
    }

    // Click su un [data-action] dentro il modale
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    try {
      await handleAction(app, btn.dataset.action, btn, e);
    } catch (err) {
      console.error('modal action error:', err);
      app.showToast('Errore inatteso');
      app.render();
    }
  };
  document.addEventListener('click', document._modalClickHandler);

  // Live search alimenti
  const searchInput = root.querySelector('#food-search-input');
  if (searchInput) {
    searchInput.focus();
    let offTimer;
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      app.state.viewParams = { ...app.state.viewParams, query: q, offResults: null };
      app.render();
      if (q.length >= 2) {
        clearTimeout(offTimer);
        offTimer = setTimeout(async () => {
          app.state.viewParams.searching = true;
          app.render();
          const results = await OpenFoodFacts.searchByName(q);
          app.state.viewParams.searching = false;
          app.state.viewParams.offResults = results;
          app.render();
        }, 600);
      }
    });
  }

  // Live search ingredienti (modale composto)
  const ingSearch = root.querySelector('#ingredient-search-input');
  if (ingSearch) {
    ingSearch.focus();
    ingSearch.addEventListener('input', () => {
      if (app.state.modal) app.state.modal.query = ingSearch.value;
      app.render();
    });
  }

  // Live preview quantità nel modale
  const qtyInput = root.querySelector('#qty-grams');
  if (qtyInput) {
    qtyInput.focus();
    qtyInput.addEventListener('input', () => {
      const g = parseFloat(qtyInput.value) || 0;
      const p = app.state.modal;
      if (!p) return;
      const factor = g / 100;
      const qs = id => root.querySelector(id) || document.querySelector(id);
      if (qs('#qty-kcal')) qs('#qty-kcal').textContent = r(p.kcal100 * factor);
      if (qs('#qty-protein')) qs('#qty-protein').textContent = r(p.protein100 * factor) + 'g';
      if (qs('#qty-carbs')) qs('#qty-carbs').textContent = r(p.carbs100 * factor) + 'g';
      if (qs('#qty-fat')) qs('#qty-fat').textContent = r(p.fat100 * factor) + 'g';
    });
  }

  // Barcode scanner
  if (app.state.modal?.type === 'barcode') {
    startBarcodeScanner(app);
  }
}

function showModal(app, modalHtml) {
  // Rimuovi modali esistenti
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
  if (!modalHtml) return;
  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  const modalEl = div.firstElementChild;
  if (!modalEl) return;
  document.body.appendChild(modalEl);

  // Focus sul primo input dopo un tick
  setTimeout(() => {
    const first = modalEl.querySelector('input:not([type=file]), select');
    if (first) first.focus();
  }, 60);
}

async function handleAction(app, action, btn, e) {
  switch (action) {

    case 'toggle-theme':
      await app.toggleTheme();
      break;

    case 'nav':
      app.state.compositeDraft = null;
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.setView(btn.dataset.view);
      break;

    case 'change-date': {
      const delta = parseInt(btn.dataset.delta);
      const d = new Date(app.state.currentDate + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      const next = todayStr(d);
      if (next <= todayStr()) {
        app.state.currentDate = next;
        app.render();
      }
      break;
    }

    case 'open-profile-picker':
      app.state.modal = { type: 'profilePicker' };
      showModal(app, renderProfilePickerModal(app));
      break;

    case 'set-day-profile': {
      const profileId = btn.dataset.profileId;
      const day = app.getDay(app.state.currentDate);
      day.profileId = profileId;
      await app.saveDay(day);
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.render();
      break;
    }

    case 'close-modal':
    case 'close-modal-overlay':
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      break;

    case 'remove-entry': {
      const idx = parseInt(btn.dataset.idx);
      const day = app.getDay(app.state.currentDate);
      day.entries.splice(idx, 1);
      await app.saveDay(day);
      app.render();
      break;
    }

    // --- aggiungi alimento ---
    case 'set-add-tab':
      app.state.viewParams = { tab: btn.dataset.tab, query: '' };
      app.render();
      break;

    case 'pick-food': {
      const food = app.state.foods.find(f => f.id === btn.dataset.foodId);
      if (!food) break;
      app.state.modal = {
        type: 'quantity', name: food.name,
        kcal100: food.kcal100, protein100: food.protein100,
        carbs100: food.carbs100, fat100: food.fat100,
        foodId: food.id, grams: 100
      };
      showModal(app, renderQuantityModal(app));
      // rilancia afterRender per agganciare il live preview qty
      afterRender(app);
      break;
    }

    case 'pick-off-product': {
      const barcode = btn.dataset.barcode;
      let found = await DB.findByBarcode(barcode);
      if (!found) {
        const p = await OpenFoodFacts.searchByBarcode(barcode);
        if (!p) { app.showToast('Prodotto non trovato'); break; }
        app.state.modal = null;
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        app.setView('foodForm', { prefill: { ...p, id: uid() } });
        break;
      }
      app.state.modal = {
        type: 'quantity', name: found.name,
        kcal100: found.kcal100, protein100: found.protein100,
        carbs100: found.carbs100, fat100: found.fat100,
        foodId: found.id, grams: 100
      };
      showModal(app, renderQuantityModal(app));
      afterRender(app);
      break;
    }

    case 'pick-composite': {
      const comp = app.state.composites.find(c => c.id === btn.dataset.compositeId);
      if (!comp) break;
      const day = app.getDay(app.state.currentDate);
      day.entries.push({ type: 'composite', compositeId: comp.id });
      await app.saveDay(day);
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.setView('dashboard');
      app.showToast(`"${comp.name}" aggiunto`);
      break;
    }

    case 'confirm-add-quantity': {
      const qtyEl = document.getElementById('qty-grams') || document.querySelector('#qty-grams');
      const grams = parseFloat(qtyEl?.value) || 100;
      const modal = app.state.modal;
      if (!modal?.foodId) break;
      const day = app.getDay(app.state.currentDate);
      day.entries.push({ type: 'food', foodId: modal.foodId, grams });
      await app.saveDay(day);
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.setView('dashboard');
      app.showToast('Aggiunto alla giornata');
      break;
    }

    // --- barcode ---
    case 'scan-barcode':
      app.state.modal = { type: 'barcode' };
      showModal(app, renderBarcodeModal(app));
      startBarcodeScanner(app);
      break;

    // --- alimento manuale ---
    case 'save-food': {
      const name = document.getElementById('ff-name')?.value.trim();
      if (!name) { app.showToast('Inserisci un nome'); break; }
      const kcal100 = parseFloat(document.getElementById('ff-kcal')?.value) || 0;
      const protein100 = parseFloat(document.getElementById('ff-protein')?.value) || 0;
      const carbs100 = parseFloat(document.getElementById('ff-carbs')?.value) || 0;
      const fat100 = parseFloat(document.getElementById('ff-fat')?.value) || 0;
      const category = document.getElementById('ff-category')?.value || 'other';
      const existingId = btn.dataset.foodId;
      const food = {
        id: existingId || uid(),
        name, kcal100, protein100, carbs100, fat100, category,
        barcode: app.state.viewParams?.prefill?.barcode || ''
      };
      await DB.put(STORES.foods, food);
      await app.loadAll();
      const wasOff = !!app.state.viewParams?.prefill;
      if (wasOff) {
        app.state.modal = {
          type: 'quantity', name: food.name,
          kcal100: food.kcal100, protein100: food.protein100,
          carbs100: food.carbs100, fat100: food.fat100,
          foodId: food.id, grams: 100
        };
        app.setView('addFood');
        showModal(app, renderQuantityModal(app));
        afterRender(app);
      } else {
        app.showToast('Alimento salvato');
        app.setView('addFood');
      }
      break;
    }

    case 'delete-food': {
      if (!confirm('Eliminare questo alimento?')) break;
      await DB.delete(STORES.foods, btn.dataset.foodId);
      await app.loadAll();
      app.showToast('Alimento eliminato');
      app.setView('addFood');
      break;
    }

    // --- composti ---
    case 'new-composite':
      app.state.compositeDraft = { name: '', ingredients: [] };
      app.setView('compositeForm');
      break;

    case 'edit-composite': {
      const comp = app.state.composites.find(c => c.id === btn.dataset.compositeId);
      if (!comp) break;
      app.state.compositeDraft = { name: comp.name, ingredients: [...comp.ingredients] };
      app.setView('compositeForm', { composite: comp });
      break;
    }

    case 'add-composite-ingredient':
      app.state.modal = { type: 'ingredientPicker', query: '' };
      showModal(app, renderIngredientPickerModal(app));
      afterRender(app);
      break;

    case 'pick-ingredient': {
      const food = app.state.foods.find(f => f.id === btn.dataset.foodId);
      if (!food) break;
      app.state.modal = { type: 'ingredientGrams', food, grams: 100 };
      showModal(app, renderIngredientGramsModal(app));
      break;
    }

    case 'confirm-add-ingredient': {
      const gEl = document.getElementById('ing-grams') || document.querySelector('#ing-grams');
      const grams = parseFloat(gEl?.value) || 100;
      const food = app.state.modal?.food;
      if (!food) break;
      if (!app.state.compositeDraft) app.state.compositeDraft = { name: '', ingredients: [] };
      app.state.compositeDraft.ingredients.push({ foodId: food.id, grams });
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.render();
      break;
    }

    case 'remove-composite-ingredient': {
      const idx = parseInt(btn.dataset.idx);
      if (app.state.compositeDraft) {
        app.state.compositeDraft.ingredients.splice(idx, 1);
        app.render();
      }
      break;
    }

    case 'save-composite': {
      const nameEl = document.getElementById('cf-name');
      const name = nameEl?.value.trim();
      if (!name) { app.showToast('Inserisci un nome'); break; }
      const draft = app.state.compositeDraft || { ingredients: [] };
      if (draft.ingredients.length === 0) { app.showToast('Aggiungi almeno un ingrediente'); break; }
      const existingId = btn.dataset.compositeId;
      const comp = { id: existingId || uid(), name, ingredients: draft.ingredients };
      await DB.put(STORES.composites, comp);
      await app.loadAll();
      app.state.compositeDraft = null;
      app.showToast('Composto salvato');
      app.setView('composites');
      break;
    }

    case 'delete-composite': {
      if (!confirm('Eliminare questo composto?')) break;
      await DB.delete(STORES.composites, btn.dataset.compositeId);
      await app.loadAll();
      app.state.compositeDraft = null;
      app.showToast('Composto eliminato');
      app.setView('composites');
      break;
    }

    // --- profili ---
    case 'new-profile':
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.setView('profileForm');
      break;

    case 'edit-profile': {
      const profile = app.state.profiles.find(p => p.id === btn.dataset.profileId);
      if (profile) {
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        app.setView('profileForm', { profile });
      }
      break;
    }

    case 'save-profile': {
      const name = document.getElementById('pf-name')?.value.trim();
      if (!name) { app.showToast('Inserisci un nome'); break; }
      const targetKcal = parseFloat(document.getElementById('pf-kcal')?.value) || 0;
      const targetProtein = parseFloat(document.getElementById('pf-protein')?.value) || 0;
      const targetCarbs = parseFloat(document.getElementById('pf-carbs')?.value) || 0;
      const targetFat = parseFloat(document.getElementById('pf-fat')?.value) || 0;
      const existingId = btn.dataset.profileId;
      const profile = { id: existingId || uid(), name, targetKcal, targetProtein, targetCarbs, targetFat };
      await DB.put(STORES.profiles, profile);
      await app.loadAll();
      app.showToast('Profilo salvato');
      app.setView('profiles');
      break;
    }

    case 'delete-profile': {
      if (app.state.profiles.length <= 1) { app.showToast('Devi avere almeno un profilo'); break; }
      if (!confirm('Eliminare questo profilo?')) break;
      await DB.delete(STORES.profiles, btn.dataset.profileId);
      await app.loadAll();
      app.showToast('Profilo eliminato');
      app.setView('profiles');
      break;
    }

    // --- abitudini ---
    case 'new-habit':
      app.state.modal = { type: 'habitForm', habit: {} };
      showModal(app, renderHabitModal(app));
      break;

    case 'edit-habit': {
      const h = app.state.habits.find(h => h.id === btn.dataset.habitId);
      if (h) {
        app.state.modal = { type: 'habitForm', habit: h };
        showModal(app, renderHabitModal(app));
      }
      break;
    }

    case 'save-habit': {
      const catEl = document.getElementById('hf-category') || document.querySelector('#hf-category');
      const timesEl = document.getElementById('hf-times') || document.querySelector('#hf-times');
      const categoryId = catEl?.value || 'fish';
      const timesPerWeek = parseInt(timesEl?.value) || 2;
      const existingId = btn.dataset.habitId;
      const habit = { id: existingId || uid(), categoryId, timesPerWeek };
      await DB.put(STORES.habits, habit);
      await app.loadAll();
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.showToast('Abitudine salvata');
      app.render();
      break;
    }

    case 'delete-habit': {
      await DB.delete(STORES.habits, btn.dataset.habitId);
      await app.loadAll();
      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      app.showToast('Abitudine eliminata');
      app.render();
      break;
    }

    // --- peso ---
    case 'save-weight': {
      const kgEl = document.getElementById('weight-kg');
      const kg = parseFloat(kgEl?.value);
      if (!kg || kg <= 0) { app.showToast('Inserisci un peso valido'); break; }
      await DB.put(STORES.weights, { date: todayStr(), kg });
      await app.loadAll();
      app.showToast(`Peso registrato: ${kg} kg`);
      app.render();
      break;
    }

    // --- backup ---
    case 'export-data': {
      const data = await DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mangje-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      app.showToast('Backup esportato');
      break;
    }

    case 'import-data': {
      const fileInput = document.getElementById('import-file-input');
      if (fileInput) {
        fileInput.onchange = async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!confirm('Importare i dati? Questo sovrascriverà tutto.')) return;
            await DB.importAll(data);
            await app.loadAll();
            app.showToast('Dati importati con successo');
            app.setView('dashboard');
          } catch (err) {
            app.showToast('Errore durante l\'importazione');
          }
        };
        fileInput.click();
      }
      break;
    }
  }
}

// ---------- Barcode scanner ----------

async function startBarcodeScanner(app) {
  const readerEl = document.getElementById('barcode-reader');
  const statusEl = document.getElementById('barcode-status');
  if (!readerEl) return;

  if (!window.ZXingBrowser) {
    if (statusEl) statusEl.textContent = 'Caricamento scanner...';
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.1/esm/index.min.js', true);
    } catch (err) {
      if (statusEl) statusEl.textContent = 'Impossibile caricare lo scanner.';
      return;
    }
  }

  try {
    const codeReader = new ZXingBrowser.BrowserMultiFormatReader();
    const devices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();
    const deviceId = devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId || devices[0]?.deviceId;

    if (!deviceId) {
      if (statusEl) statusEl.textContent = 'Nessuna fotocamera trovata.';
      return;
    }

    if (statusEl) statusEl.textContent = 'Inquadra il codice a barre…';

    await codeReader.decodeFromVideoDevice(deviceId, readerEl, async (result, err) => {
      if (!result) return;
      codeReader.reset();
      const barcode = result.getText();

      app.state.modal = null;
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

      let food = await DB.findByBarcode(barcode);
      if (food) {
        app.state.modal = {
          type: 'quantity', name: food.name,
          kcal100: food.kcal100, protein100: food.protein100,
          carbs100: food.carbs100, fat100: food.fat100,
          foodId: food.id, grams: 100
        };
        showModal(app, renderQuantityModal(app));
        afterRender(app);
        return;
      }

      app.showToast('Cerco il prodotto...');
      const product = await OpenFoodFacts.searchByBarcode(barcode);
      if (!product) {
        app.showToast('Prodotto non trovato. Aggiungilo manualmente.');
        app.setView('foodForm', { prefill: { barcode, name: '', category: 'other' } });
        return;
      }
      app.setView('foodForm', { prefill: { ...product, id: uid(), barcode } });
    });

    const observer = new MutationObserver(() => {
      if (!document.querySelector('#barcode-reader')) {
        try { codeReader.reset(); } catch (_) {}
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = 'Errore fotocamera: ' + (err.message || err);
  }
}

function loadScript(src, isModule = false) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    if (isModule) s.type = 'module';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

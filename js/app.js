// app.js - logica principale, stato e rendering di Mangje!

const App = {
  state: {
    view: 'dashboard', // dashboard | addFood | composites | profiles | habits | weight | settings | stats
    currentDate: todayStr(),
    foods: [],
    composites: [],
    profiles: [],
    habits: [],
    days: [],
    weights: [],
    theme: 'light',
    toast: null
  },

  els: {},

  async init() {
    this.els.root = document.getElementById('app-root');
    await this.loadTheme();
    await this.loadAll();
    await this.ensureDefaultProfiles();
    this.render();
    this.registerServiceWorker();
  },

  async loadTheme() {
    const setting = await DB.get(STORES.settings, 'theme');
    let theme = setting ? setting.value : null;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  },

  async toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.state.theme);
    await DB.put(STORES.settings, { key: 'theme', value: this.state.theme });
    this.render();
  },

  async loadAll() {
    const [foods, composites, profiles, habits, days, weights] = await Promise.all([
      DB.getAll(STORES.foods),
      DB.getAll(STORES.composites),
      DB.getAll(STORES.profiles),
      DB.getAll(STORES.habits),
      DB.getAll(STORES.days),
      DB.getAll(STORES.weights)
    ]);
    this.state.foods = foods;
    this.state.composites = composites;
    this.state.profiles = profiles;
    this.state.habits = habits;
    this.state.days = days;
    this.state.weights = weights;
  },

  async ensureDefaultProfiles() {
    if (this.state.profiles.length > 0) return;
    const defaults = [
      { id: uid(), name: 'Allenamento', targetKcal: 2400, targetProtein: 160, targetCarbs: 280, targetFat: 70 },
      { id: uid(), name: 'Off', targetKcal: 2000, targetProtein: 150, targetCarbs: 180, targetFat: 65 }
    ];
    for (const p of defaults) await DB.put(STORES.profiles, p);
    this.state.profiles = defaults;
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  },

  // ---------- helpers di stato ----------

  foodsById() {
    const m = {};
    for (const f of this.state.foods) m[f.id] = f;
    return m;
  },

  compositesById() {
    const m = {};
    for (const c of this.state.composites) m[c.id] = c;
    return m;
  },

  getDay(dateStr) {
    return this.state.days.find(d => d.date === dateStr) || { date: dateStr, profileId: this.state.profiles[0]?.id || null, entries: [] };
  },

  async saveDay(day) {
    await DB.put(STORES.days, day);
    const idx = this.state.days.findIndex(d => d.date === day.date);
    if (idx >= 0) this.state.days[idx] = day; else this.state.days.push(day);
  },

  getProfile(id) {
    return this.state.profiles.find(p => p.id === id) || null;
  },

  habitsProgressForWeek(dateStr) {
    const weekStart = startOfWeek(dateStr);
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const todayIdx = weekDates.indexOf(todayStr());
    const foodsById = this.foodsById();
    const compositesById = this.compositesById();

    return this.state.habits.map(h => {
      let count = 0;
      for (const wd of weekDates) {
        const day = this.state.days.find(d => d.date === wd);
        if (!day) continue;
        for (const entry of day.entries) {
          const cats = entryCategories(entry, foodsById, compositesById);
          if (cats.includes(h.categoryId)) { count++; break; }
        }
      }
      const cat = getCategory(h.categoryId);
      return {
        habitId: h.id,
        categoryId: h.categoryId,
        categoryName: cat.name,
        icon: cat.icon,
        count,
        target: h.timesPerWeek,
        isCurrentWeek: weekStart === startOfWeek(todayStr()),
        daysLeftInWeek: todayIdx >= 0 ? (6 - todayIdx) : 0
      };
    });
  },

  showToast(msg) {
    this.state.toast = msg;
    this.render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.state.toast = null;
      const el = document.querySelector('.toast');
      if (el) el.remove();
    }, 2200);
  },

  setView(view, params) {
    this.state.view = view;
    this.state.viewParams = params || {};
    this.render();
    window.scrollTo(0, 0);
  },

  render() {
    let html = '';
    try {
      switch (this.state.view) {
        case 'dashboard': html = renderDashboard(this); break;
        case 'addFood': html = renderAddFood(this); break;
        case 'foodForm': html = renderFoodForm(this); break;
        case 'composites': html = renderComposites(this); break;
        case 'compositeForm': html = renderCompositeForm(this); break;
        case 'profiles': html = renderProfiles(this); break;
        case 'profileForm': html = renderProfileForm(this); break;
        case 'habits': html = renderHabits(this); break;
        case 'weight': html = renderWeight(this); break;
        case 'stats': html = renderStats(this); break;
        case 'settings': html = renderSettings(this); break;
        default: html = renderDashboard(this);
      }
    } catch (err) {
      console.error('Render error in view', this.state.view, err);
      this.state.view = 'dashboard';
      try { html = renderDashboard(this); } catch (_) {
        html = '<div style="padding:30px;text-align:center;color:var(--text-secondary)"><p>Errore di rendering.</p><button onclick="App.setView(\'dashboard\')" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid var(--border);">Torna alla home</button></div>';
      }
    }
    this.els.root.innerHTML = html + (this.state.toast ? `<div class="toast">${escapeHtml(this.state.toast)}</div>` : '');
    afterRender(this);
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function entryCategories(entry, foodsById, compositesById) {
  if (entry.type === 'food') {
    const f = foodsById[entry.foodId];
    return f ? [f.category] : [];
  }
  if (entry.type === 'composite') {
    const c = compositesById[entry.compositeId];
    if (!c) return [];
    const cats = new Set();
    for (const ing of c.ingredients) {
      const f = foodsById[ing.foodId];
      if (f) cats.add(f.category);
    }
    return Array.from(cats);
  }
  return [];
}

document.addEventListener('DOMContentLoaded', () => App.init());

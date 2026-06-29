// model.js - costanti, categorie e funzioni di calcolo condivise

const CATEGORIES = [
  { id: 'fish',     name: 'Pesce',              icon: 'ti-fish' },
  { id: 'meat',     name: 'Carne',              icon: 'ti-meat' },
  { id: 'eggs',     name: 'Uova',               icon: 'ti-egg' },
  { id: 'dairy',    name: 'Latticini',          icon: 'ti-milk' },
  { id: 'legumes',  name: 'Legumi',             icon: 'ti-seeding' },
  { id: 'veg',      name: 'Verdura',            icon: 'ti-leaf' },
  { id: 'fruit',    name: 'Frutta',             icon: 'ti-apple' },
  { id: 'grains',   name: 'Cereali/Carboidrati',icon: 'ti-bread' },
  { id: 'fats',     name: 'Grassi/Condimenti',  icon: 'ti-droplet' },
  { id: 'sweets',   name: 'Dolci/Snack',        icon: 'ti-cookie' },
  { id: 'other',    name: 'Altro',              icon: 'ti-dots' }
];

function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

// Calcola kcal/macro di una entry (alimento singolo con grammi, o composto)
function computeEntryTotals(entry, foodsById, compositesById) {
  if (entry.type === 'food') {
    const food = foodsById[entry.foodId];
    if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const factor = entry.grams / 100;
    return {
      kcal: food.kcal100 * factor,
      protein: food.protein100 * factor,
      carbs: food.carbs100 * factor,
      fat: food.fat100 * factor
    };
  }
  if (entry.type === 'composite') {
    const comp = compositesById[entry.compositeId];
    if (!comp) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    let total = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const ing of comp.ingredients) {
      const food = foodsById[ing.foodId];
      if (!food) continue;
      const factor = ing.grams / 100;
      total.kcal += food.kcal100 * factor;
      total.protein += food.protein100 * factor;
      total.carbs += food.carbs100 * factor;
      total.fat += food.fat100 * factor;
    }
    return total;
  }
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

function sumTotals(list) {
  return list.reduce((acc, t) => ({
    kcal: acc.kcal + t.kcal,
    protein: acc.protein + t.protein,
    carbs: acc.carbs + t.carbs,
    fat: acc.fat + t.fat
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function r(n) {
  return Math.round(n || 0);
}

// Restituisce il lunedì della settimana di una data 'YYYY-MM-DD'
function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = domenica
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return todayStr(d);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

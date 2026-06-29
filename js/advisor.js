// advisor.js - genera consigli semplici basati su target del giorno e abitudini

function buildAdvice({ profile, totals, habitsProgress, dateStr }) {
  const tips = [];
  if (!profile) {
    tips.push({ icon: 'ti-info-circle', text: 'Assegna un profilo a questa giornata per vedere consigli mirati.' });
    return tips;
  }

  const remaining = {
    kcal: profile.targetKcal - totals.kcal,
    protein: profile.targetProtein - totals.protein,
    carbs: profile.targetCarbs - totals.carbs,
    fat: profile.targetFat - totals.fat
  };

  const hour = new Date().getHours();
  const isToday = dateStr === todayStr();

  if (isToday && remaining.kcal < -50) {
    tips.push({ icon: 'ti-alert-triangle', text: `Hai superato il target di calorie di ${r(-remaining.kcal)} kcal oggi.` });
  } else if (isToday && hour >= 15 && remaining.protein > 25) {
    tips.push({ icon: 'ti-bolt', text: `Ti mancano ancora ${r(remaining.protein)}g di proteine: un alimento proteico ti aiuterebbe a raggiungere il target.` });
  } else if (isToday && remaining.kcal > 0 && hour >= 20) {
    tips.push({ icon: 'ti-moon', text: `Mancano ${r(remaining.kcal)} kcal al target di oggi.` });
  }

  for (const h of habitsProgress) {
    if (h.isCurrentWeek && h.daysLeftInWeek <= 2 && h.count < h.target) {
      tips.push({
        icon: 'ti-alert-circle',
        text: `${h.categoryName}: ${h.count}/${h.target} questa settimana, ${h.daysLeftInWeek === 1 ? 'rimane solo domenica' : 'pochi giorni rimasti'} per recuperare.`
      });
    }
  }

  return tips;
}

// openfoodfacts.js - integrazione con il database pubblico Open Food Facts
// https://world.openfoodfacts.org - gratuito, open source, nessuna API key richiesta

const OFF_BASE = 'https://world.openfoodfacts.org';

function normalizeOFFProduct(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null) return null;
  return {
    name: p.product_name || p.generic_name || 'Prodotto senza nome',
    brand: p.brands || '',
    barcode: p.code || '',
    kcal100: round1(kcal),
    protein100: round1(n['proteins_100g'] ?? 0),
    carbs100: round1(n['carbohydrates_100g'] ?? 0),
    fat100: round1(n['fat_100g'] ?? 0),
    imageUrl: p.image_front_small_url || p.image_small_url || ''
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

const OpenFoodFacts = {
  async searchByBarcode(barcode) {
    try {
      const res = await fetch(`${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== 1 || !data.product) return null;
      return normalizeOFFProduct(data.product);
    } catch (e) {
      console.error('OFF barcode lookup failed', e);
      return null;
    }
  },

  async searchByName(query, limit = 15) {
    try {
      const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=product_name,generic_name,brands,code,nutriments,image_front_small_url,image_small_url`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const products = (data.products || [])
        .map(normalizeOFFProduct)
        .filter(Boolean)
        .filter(p => p.name && p.name !== 'Prodotto senza nome');
      return products;
    } catch (e) {
      console.error('OFF name search failed', e);
      return [];
    }
  }
};

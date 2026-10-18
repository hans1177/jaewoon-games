function number(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function int(value, fallback = 0) { return Math.trunc(number(value, fallback)); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }

export class JaewoonEconomyLootShop {
  constructor({ rng = Math.random } = {}) {
    if (typeof rng !== 'function') throw new Error('rng must be a function');
    this.rng = rng;
  }

  rollLoot(table = []) {
    const results = [];
    for (const entry of table || []) {
      const chance = Math.max(0, Math.min(1, number(entry.chance, 1)));
      if (this.rng() > chance) continue;
      const min = Math.max(0, int(entry.min, entry.quantity ?? 1));
      const max = Math.max(min, int(entry.max, min));
      const quantity = min + Math.floor(this.rng() * (max - min + 1));
      if (quantity > 0) results.push({ id: String(entry.id), quantity, meta: clone(entry.meta) || {} });
    }
    return results;
  }

  createWallet(currencies = {}) {
    const wallet = {};
    for (const [key, value] of Object.entries(currencies || {})) wallet[key] = Math.max(0, int(value, 0));
    return wallet;
  }

  changeCurrency(wallet, key, delta) {
    const name = String(key || 'gold');
    wallet[name] = Math.max(0, int(wallet[name], 0) + int(delta, 0));
    return wallet[name];
  }

  canAfford(wallet, price = {}) {
    return Object.entries(price || {}).every(([key, cost]) => int(wallet?.[key], 0) >= Math.max(0, int(cost, 0)));
  }

  buy({ wallet, listing, addItem }) {
    if (!listing?.item || !this.canAfford(wallet, listing.price)) return false;
    if (typeof addItem !== 'function') throw new Error('addItem callback is required');
    if (!addItem(clone(listing.item))) return false;
    for (const [key, cost] of Object.entries(listing.price || {})) this.changeCurrency(wallet, key, -Math.max(0, int(cost, 0)));
    return true;
  }

  sell({ wallet, item, value = {}, removeItem }) {
    if (!item || typeof removeItem !== 'function') return false;
    if (!removeItem(item.id, item.quantity ?? 1)) return false;
    for (const [key, amount] of Object.entries(value || {})) this.changeCurrency(wallet, key, Math.max(0, int(amount, 0)));
    return true;
  }

  reward(bundle = {}, handlers = {}) {
    const applied = { currencies: {}, items: [], xp: 0 };
    for (const [key, amount] of Object.entries(bundle.currencies || {})) {
      handlers.addCurrency?.(key, int(amount, 0));
      applied.currencies[key] = int(amount, 0);
    }
    for (const item of bundle.items || []) {
      if (handlers.addItem?.(clone(item)) !== false) applied.items.push(clone(item));
    }
    if (bundle.xp) {
      handlers.addXp?.(Math.max(0, int(bundle.xp, 0)));
      applied.xp = Math.max(0, int(bundle.xp, 0));
    }
    return applied;
  }
}

if (typeof window !== 'undefined') window.JaewoonEconomyLootShop = JaewoonEconomyLootShop;

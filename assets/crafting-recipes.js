function int(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeEntries(entries = []) {
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    const id = String(entry?.id || '').trim();
    if (!id) throw new Error('crafting entry id required');
    return { ...clone(entry), id, quantity: Math.max(1, int(entry.quantity, 1)) };
  });
}

export class JaewoonCraftingRecipes {
  constructor({ inventory = null, recipes = [] } = {}) {
    this.inventory = inventory;
    this.recipes = new Map();
    for (const recipe of recipes || []) this.registerRecipe(recipe);
  }

  createState({ unlocked = [], crafted = {} } = {}) {
    return {
      unlocked: [...new Set((unlocked || []).map(String))],
      crafted: Object.fromEntries(Object.entries(crafted || {}).map(([id, count]) => [String(id), Math.max(0, int(count, 0))])),
    };
  }

  registerRecipe(recipe = {}) {
    const id = String(recipe.id || '').trim();
    if (!id) throw new Error('recipe id required');
    const normalized = {
      id,
      name: String(recipe.name || id),
      inputs: normalizeEntries(recipe.inputs),
      outputs: normalizeEntries(recipe.outputs),
      currencyCosts: Object.fromEntries(Object.entries(recipe.currencyCosts || {}).map(([key, value]) => [String(key), Math.max(0, int(value, 0))])),
      locked: Boolean(recipe.locked),
      data: clone(recipe.data || {}),
    };
    if (!normalized.outputs.length) throw new Error(`recipe outputs required: ${id}`);
    this.recipes.set(id, normalized);
    return clone(normalized);
  }

  removeRecipe(id) {
    return this.recipes.delete(String(id));
  }

  getRecipe(id) {
    const recipe = this.recipes.get(String(id));
    return recipe ? clone(recipe) : null;
  }

  unlock(state, id) {
    const key = String(id);
    if (!this.recipes.has(key)) throw new Error(`unknown recipe: ${key}`);
    if (!state.unlocked.includes(key)) state.unlocked.push(key);
    return true;
  }

  lock(state, id) {
    const key = String(id);
    const index = state.unlocked.indexOf(key);
    if (index >= 0) state.unlocked.splice(index, 1);
    return true;
  }

  isUnlocked(state, recipe) {
    return !recipe.locked || state.unlocked.includes(recipe.id);
  }

  canCraft(state, inventoryState, recipeId, times = 1) {
    if (!this.inventory) throw new Error('inventory engine required for crafting');
    const recipe = this.recipes.get(String(recipeId));
    if (!recipe) return { ok: false, reason: 'unknown-recipe', missing: [] };
    if (!this.isUnlocked(state, recipe)) return { ok: false, reason: 'locked', missing: [] };
    const amount = Math.max(1, int(times, 1));
    const missing = [];

    for (const input of recipe.inputs) {
      const required = input.quantity * amount;
      const current = this.inventory.countItem(inventoryState, input.id);
      if (current < required) missing.push({ type: 'item', id: input.id, required, current });
    }
    for (const [currency, cost] of Object.entries(recipe.currencyCosts)) {
      const required = cost * amount;
      const current = Math.max(0, int(inventoryState?.currencies?.[currency], 0));
      if (current < required) missing.push({ type: 'currency', id: currency, required, current });
    }

    return { ok: missing.length === 0, reason: missing.length ? 'missing-materials' : null, missing };
  }

  craft(state, inventoryState, recipeId, times = 1) {
    const amount = Math.max(1, int(times, 1));
    const check = this.canCraft(state, inventoryState, recipeId, amount);
    if (!check.ok) return { ...check, crafted: 0, outputs: [] };

    const recipe = this.recipes.get(String(recipeId));
    const beforeInventory = this.inventory.snapshot(inventoryState);
    const beforeState = clone(state);

    try {
      for (const input of recipe.inputs) {
        if (!this.inventory.removeItem(inventoryState, input.id, input.quantity * amount)) throw new Error('material removal failed');
      }
      for (const [currency, cost] of Object.entries(recipe.currencyCosts)) {
        this.inventory.changeCurrency(inventoryState, currency, -(cost * amount));
      }

      const outputs = recipe.outputs.map((output) => ({ ...clone(output), quantity: output.quantity * amount }));
      for (const output of outputs) {
        if (!this.inventory.addItem(inventoryState, output)) throw new Error('inventory capacity exceeded');
      }

      state.crafted[recipe.id] = Math.max(0, int(state.crafted[recipe.id], 0)) + amount;
      return { ok: true, reason: null, crafted: amount, outputs: clone(outputs) };
    } catch (error) {
      inventoryState.items = clone(beforeInventory.items);
      inventoryState.equipment = clone(beforeInventory.equipment);
      inventoryState.currencies = clone(beforeInventory.currencies);
      state.unlocked = clone(beforeState.unlocked);
      state.crafted = clone(beforeState.crafted);
      return { ok: false, reason: 'transaction-failed', error: String(error?.message || error), crafted: 0, outputs: [] };
    }
  }

  snapshot(state) {
    return clone(state);
  }
}

if (typeof window !== 'undefined') window.JaewoonCraftingRecipes = JaewoonCraftingRecipes;

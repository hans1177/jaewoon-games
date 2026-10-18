function int(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class JaewoonInventoryEquipment {
  constructor({ capacity = 40, stackLimit = 999 } = {}) {
    this.capacity = Math.max(1, int(capacity, 40));
    this.stackLimit = Math.max(1, int(stackLimit, 999));
  }

  createState({ items = [], equipment = {}, currencies = {} } = {}) {
    const state = { items: [], equipment: { ...equipment }, currencies: { ...currencies } };
    for (const item of items) this.addItem(state, item);
    return state;
  }

  normalizeItem(item = {}) {
    const id = String(item.id || '').trim();
    if (!id) throw new Error('item id is required');
    return {
      id,
      name: String(item.name || id),
      type: String(item.type || 'item'),
      quantity: Math.max(1, int(item.quantity, 1)),
      stackable: item.stackable !== false,
      maxStack: Math.max(1, int(item.maxStack, this.stackLimit)),
      equipSlot: item.equipSlot ? String(item.equipSlot) : '',
      unique: Boolean(item.unique),
      meta: clone(item.meta) || {},
    };
  }

  addItem(state, item) {
    if (!state?.items) throw new Error('inventory state is required');
    const normalized = this.normalizeItem(item);
    let remaining = normalized.quantity;
    if (normalized.stackable && !normalized.unique) {
      for (const slot of state.items) {
        if (slot.id !== normalized.id || !slot.stackable) continue;
        const room = Math.max(0, slot.maxStack - slot.quantity);
        const moved = Math.min(room, remaining);
        slot.quantity += moved;
        remaining -= moved;
        if (remaining <= 0) return true;
      }
    }
    while (remaining > 0) {
      if (state.items.length >= this.capacity) return false;
      const amount = normalized.stackable && !normalized.unique ? Math.min(normalized.maxStack, remaining) : 1;
      state.items.push({ ...clone(normalized), quantity: amount });
      remaining -= amount;
    }
    return true;
  }

  countItem(state, itemId) {
    return (state?.items || []).filter((item) => item.id === itemId).reduce((sum, item) => sum + item.quantity, 0);
  }

  removeItem(state, itemId, quantity = 1) {
    if (!state?.items) throw new Error('inventory state is required');
    let remaining = Math.max(1, int(quantity, 1));
    if (this.countItem(state, itemId) < remaining) return false;
    for (let i = state.items.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const slot = state.items[i];
      if (slot.id !== itemId) continue;
      const removed = Math.min(slot.quantity, remaining);
      slot.quantity -= removed;
      remaining -= removed;
      if (slot.quantity <= 0) state.items.splice(i, 1);
    }
    return true;
  }

  equip(state, itemId, { slot = '' } = {}) {
    if (!state?.items || !state?.equipment) throw new Error('inventory state is required');
    const index = state.items.findIndex((item) => item.id === itemId && item.equipSlot);
    if (index < 0) return false;
    const item = state.items[index];
    const targetSlot = String(slot || item.equipSlot);
    if (!targetSlot) return false;
    const equipped = state.equipment[targetSlot];
    state.items.splice(index, 1);
    state.equipment[targetSlot] = { ...clone(item), quantity: 1 };
    if (item.quantity > 1) state.items.push({ ...clone(item), quantity: item.quantity - 1 });
    if (equipped) this.addItem(state, { ...equipped, quantity: 1 });
    return true;
  }

  unequip(state, slot) {
    const key = String(slot || '');
    const item = state?.equipment?.[key];
    if (!item) return false;
    if (!this.addItem(state, { ...item, quantity: 1 })) return false;
    delete state.equipment[key];
    return true;
  }

  changeCurrency(state, key, delta) {
    if (!state?.currencies) throw new Error('inventory state is required');
    const name = String(key || 'gold');
    const current = Math.max(0, int(state.currencies[name], 0));
    state.currencies[name] = Math.max(0, current + int(delta, 0));
    return state.currencies[name];
  }

  snapshot(state) {
    return clone({ items: state?.items || [], equipment: state?.equipment || {}, currencies: state?.currencies || {} });
  }
}

if (typeof window !== 'undefined') window.JaewoonInventoryEquipment = JaewoonInventoryEquipment;

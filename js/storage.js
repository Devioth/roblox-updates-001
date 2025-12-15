const STORAGE_KEY = "roblox_categories_v3";

export function loadState() {
   try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { categories: [defaultCategory()] };
      const parsed = JSON.parse(raw);
      if (!parsed?.categories?.length) return { categories: [defaultCategory()] };
      return parsed;
   } catch {
      return { categories: [defaultCategory()] };
   }
}

export function saveState(state) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function defaultCategory() {
   return { id: crypto.randomUUID(), name: "Default", games: [] };
}

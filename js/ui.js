export function toast(msg) {
   const t = document.getElementById("toast");
   t.textContent = msg;
   t.classList.add("show");
   setTimeout(() => t.classList.remove("show"), 2200);
}

export function formatUpdated(iso) {
   try { return new Date(iso).toLocaleString(); }
   catch { return iso || ""; }
}

export function sortGamesByLatest(cat) {
   cat.games.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
}

export function findGame(categories, placeId) {
   for (const c of categories) {
      const idx = c.games.findIndex(g => g.placeId === placeId);
      if (idx !== -1) return { cat: c, idx, game: c.games[idx] };
   }
   return null;
}

export function escapeHtml(s) {
   return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
   }[m]));
}

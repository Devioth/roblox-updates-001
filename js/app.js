import { loadState, saveState, defaultCategory } from "./storage.js";
import { fetchGameByPlaceUrl, fetchUpdates } from "./robloxApi.js";
import { exportCsv, downloadText, importCsvFile } from "./csv.js";
import { toast, formatUpdated, sortGamesByLatest, findGame, escapeHtml } from "./ui.js";
import { wireDragAndDrop } from "./dnd.js";

let state = loadState();
ensureDefault();

wireDragAndDrop({
   categories: state.categories,
   onMoveGame: moveGameBetweenCategories,
   toast
});

window.addEventListener("load", () => {
   render();
   bindUI();

   // 1. ASK FOR PERMISSION ON LOAD
   if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
   }

   setInterval(checkUpdates, 60000);
});

function bindUI() {
   const addBtn = document.getElementById("addBtn");
   const addCatBtn = document.getElementById("addCategoryBtn");
   const exportBtn = document.getElementById("exportCsvBtn");
   const importInput = document.getElementById("importCsvInput");

   addBtn.onclick = addGame;
   addCatBtn.onclick = addCategory;

   document.getElementById("gameInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addGame();
   });
   document.getElementById("categoryInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addCategory();
   });

   exportBtn.onclick = () => {
      const csv = exportCsv(state.categories);
      downloadText(`roblox-radar-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast("CSV exported");
   };

   importInput.onchange = async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
         const cats = await importCsvFile(file);
         state.categories = cats.length ? cats : [defaultCategory()];
         ensureDefault();
         persist();
         render();
         toast("CSV imported");
      } catch (e) {
         alert("Import failed: " + e.message);
      } finally {
         importInput.value = "";
      }
   };
}

function ensureDefault() {
   if (!state.categories?.length) state.categories = [defaultCategory()];
   if (!state.categories.some(c => c.name === "Default")) {
      state.categories.unshift(defaultCategory());
   }
   persist();
}

function persist() { saveState(state); }

async function addGame() {
   const input = document.getElementById("gameInput");
   const url = input.value.trim();
   if (!url) return;

   const match = url.match(/roblox\.com\/games\/(\d+)/i);
   if (!match) return alert("Invalid Roblox URL");
   const placeId = match[1];
   if (findGame(state.categories, placeId)) return alert("Game already added");

   const btn = document.getElementById("addBtn");
   btn.disabled = true;
   btn.textContent = "Loading...";

   try {
      const game = await fetchGameByPlaceUrl(url);
      const def = state.categories.find(c => c.name === "Default") || state.categories[0];
      def.games.push(game);
      sortGamesByLatest(def);
      persist();
      render();
      input.value = "";
      toast("Game added");
   } catch (e) {
      alert("Add failed: " + e.message);
   } finally {
      btn.disabled = false;
      btn.textContent = "Add Game";
   }
}

function addCategory() {
   const input = document.getElementById("categoryInput");
   const name = input.value.trim();
   if (!name) return;
   state.categories.push({ id: crypto.randomUUID(), name, games: [] });
   persist();
   render();
   input.value = "";
   toast("Category added");
}

function renameCategory(catId) {
   const cat = state.categories.find(c => c.id === catId);
   if (!cat) return;
   const next = prompt("Rename category:", cat.name);
   if (!next) return;
   cat.name = next.trim() || cat.name;
   persist();
   render();
}

function deleteCategory(catId) {
   const cat = state.categories.find(c => c.id === catId);
   if (!cat) return;
   if (!confirm(`Delete "${cat.name}"? Games will move to Default.`)) return;
   const def = state.categories.find(c => c.name === "Default") || state.categories[0];
   if (def.id !== catId) def.games.push(...cat.games);
   state.categories = state.categories.filter(c => c.id !== catId);
   ensureDefault();
   persist();
   render();
}

function removeGame(catId, placeId) {
   const cat = state.categories.find(c => c.id === catId);
   if (!cat) return;
   if (!confirm("Stop tracking this game?")) return;
   cat.games = cat.games.filter(g => g.placeId !== placeId);
   persist();
   render();
   toast("Game removed");
}

function moveGameBetweenCategories(placeId, fromCatId, toCatId) {
   const from = state.categories.find(c => c.id === fromCatId);
   const to = state.categories.find(c => c.id === toCatId);
   if (!from || !to) return;
   const idx = from.games.findIndex(g => g.placeId === placeId);
   if (idx === -1) return;
   const [game] = from.games.splice(idx, 1);
   to.games.push(game);
   sortGamesByLatest(from);
   sortGamesByLatest(to);
   persist();
   render();
}

// --- CORE UPDATE LOGIC ---
async function checkUpdates() {
   const all = state.categories.flatMap(c => c.games);
   if (!all.length) return;

   const ids = [...new Set(all.map(g => g.universeId))];

   try {
      const fresh = await fetchUpdates(ids);
      let updatesFound = false;

      for (const fg of fresh) {
         for (const cat of state.categories) {
            const g = cat.games.find(x => x.universeId === fg.id);
            if (!g) continue;

            if (g.lastUpdated !== fg.updated) {
               g.lastUpdated = fg.updated;
               g.name = fg.name;
               updatesFound = true;

               // 2. SEND BROWSER NOTIFICATION
               if (Notification.permission === "granted") {
                  new Notification(`Update: ${fg.name}`, {
                     body: "A new update has been detected!",
                     icon: g.thumbnail
                  });
               }
            }
         }
      }

      if (updatesFound) {
         for (const cat of state.categories) sortGamesByLatest(cat);
         persist();
         render();
         toast("Updates found!");
      }
   } catch (e) {
      console.log("Polling error:", e);
   }
}

function render() {
   const root = document.getElementById("categoriesContainer");
   root.innerHTML = "";

   for (const cat of state.categories) {
      const section = document.createElement("section");
      section.className = "category";

      section.innerHTML = `
      <div class="category-header">
        <div class="category-title">${escapeHtml(cat.name)}</div>
        <div class="category-actions">
          <button class="cat-btn" data-action="rename" data-cat="${cat.id}">Rename</button>
          <button class="cat-btn danger" data-action="delete" data-cat="${cat.id}">Delete</button>
        </div>
      </div>

      <div class="category-frame">
        <div class="games-scroll" data-cat-id="${cat.id}">
          ${cat.games.map(g => `
            <article class="game-card" draggable="true" data-place-id="${g.placeId}" data-cat-id="${cat.id}">
              <button class="xbtn" title="Remove" data-action="remove" data-cat="${cat.id}" data-place="${g.placeId}">×</button>
              <div class="card-image">
                <img src="${g.thumbnail || ""}" alt="${escapeHtml(g.name)}" loading="lazy">
              </div>
              <div class="card-body">
                <div class="card-title" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</div>
                <div class="card-meta">Updated: ${escapeHtml(formatUpdated(g.lastUpdated))}</div>
                <a class="card-link" href="${g.url}" target="_blank" rel="noopener noreferrer">Play</a>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
      root.appendChild(section);
   }

   root.onclick = (e) => {
      const btn = e.target.closest?.("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const catId = btn.dataset.cat;
      if (action === "rename") return renameCategory(catId);
      if (action === "delete") return deleteCategory(catId);
      if (action === "remove") return removeGame(catId, btn.dataset.place);
   };
}